/**
 * @fileoverview Agentic Search Engine - 代理搜索引擎
 * 
 * 异步并发搜索引擎，为 AgenticContextEngine 提供代码搜索功能
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import {
  SearchEngineId,
  SearchEngineState,
  SearchQuery,
  SearchQueryId,
  SearchQueryType,
  SearchFilters,
  SearchOptions,
  SearchResult,
  MatchType,
  FileIndex,
  SymbolIndex,
  SymbolType,
  SearchEngineConfig,
  SearchEngineStats,
  SearchEngineEventType,
  SearchEngineEvent,
} from './types';

/**
 * 默认搜索引擎配置
 */
const DEFAULT_CONFIG: SearchEngineConfig = {
  id: 'search_engine_main',
  
  indexing: {
    enabled: true,
    includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.java'],
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    maxFileSize: 1024 * 1024, // 1MB
    generateEmbeddings: true,
    embeddingModel: 'text-embedding-3-small',
  },
  
  search: {
    defaultType: SearchQueryType.HYBRID,
    defaultMaxResults: 50,
    defaultMinScore: 0.5,
    contextLines: 3,
  },
  
  concurrency: {
    maxConcurrentSearches: 10,
    maxConcurrentIndexing: 5,
    searchTimeout: 30000,
  },
  
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: 300000, // 5 minutes
  },
};

/**
 * AgenticSearchEngine - 异步并发搜索引擎
 */
export class AgenticSearchEngine extends EventEmitter {
  private config: SearchEngineConfig;
  private id: SearchEngineId;
  private state: SearchEngineState = SearchEngineState.IDLE;
  
  // 索引
  private fileIndex: Map<string, FileIndex> = new Map();
  private symbolIndex: Map<string, SymbolIndex[]> = new Map();
  
  // 活动搜索
  private activeSearches: Map<SearchQueryId, AbortController> = new Map();
  
  // 缓存
  private resultCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  
  // 统计
  private stats: SearchEngineStats;
  
  // 状态
  private isInitialized: boolean = false;

  constructor(config: Partial<SearchEngineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as SearchEngineConfig;
    this.id = this.config.id;
    
    this.stats = this.initializeStats();
  }

  // =========================================================================
  // 生命周期
  // =========================================================================

  /**
   * 初始化搜索引擎
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.setState(SearchEngineState.INITIALIZING);
    
    try {
      // 初始化索引
      if (this.config.indexing.enabled) {
        await this.initializeIndex();
      }
      
      this.isInitialized = true;
      this.setState(SearchEngineState.IDLE);
      
      this.emit('initialized', { engineId: this.id });
      
    } catch (error) {
      this.setState(SearchEngineState.ERROR);
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * 关闭搜索引擎
   */
  public async shutdown(): Promise<void> {
    // 取消所有活动搜索
    for (const [queryId, controller] of this.activeSearches) {
      controller.abort();
    }
    
    this.fileIndex.clear();
    this.symbolIndex.clear();
    this.resultCache.clear();
    
    this.isInitialized = false;
    this.setState(SearchEngineState.IDLE);
    
    this.emit('shutdown', { engineId: this.id });
  }

  // =========================================================================
  // 索引管理
  // =========================================================================

  /**
   * 初始化索引
   */
  private async initializeIndex(): Promise<void> {
    this.setState(SearchEngineState.INDEXING);
    
    const startTime = Date.now();
    
    // 扫描工作目录
    const workingDir = process.cwd();
    const files = await this.discoverFiles(workingDir);
    
    // 并发索引文件
    const batchSize = this.config.concurrency.maxConcurrentIndexing;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map(file => this.indexFile(file)));
    }
    
    this.stats.averageIndexingTime = Date.now() - startTime;
    this.stats.lastIndexingTime = this.stats.averageIndexingTime;
    
    this.setState(SearchEngineState.IDLE);
    
    this.emitEvent(SearchEngineEventType.INDEXING_COMPLETED, {
      filesIndexed: this.stats.filesIndexed,
    });
  }

  /**
   * 发现文件
   */
  private async discoverFiles(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (dir: string) => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!this.shouldExclude(fullPath)) {
              await walk(fullPath);
            }
          } else if (entry.isFile()) {
            if (this.shouldInclude(fullPath)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // 忽略权限错误
      }
    };
    
    await walk(rootPath);
    return files;
  }

  /**
   * 索引文件
   */
  private async indexFile(filePath: string): Promise<FileIndex | null> {
    try {
      const stats = await fs.promises.stat(filePath);
      
      // 检查文件大小
      if (stats.size > this.config.indexing.maxFileSize) {
        return null;
      }
      
      // 读取内容
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // 检测语言
      const language = this.detectLanguage(filePath);
      
      // 提取符号
      const symbols = this.extractSymbols(content, language);
      
      // 创建索引
      const fileIndex: FileIndex = {
        id: `file_${Buffer.from(filePath).toString('base64').slice(0, 20)}`,
        path: filePath,
        content,
        size: stats.size,
        lineCount: content.split('\n').length,
        language,
        lastModified: stats.mtimeMs,
        symbols,
        indexedAt: Date.now(),
      };
      
      // 生成嵌入（如果启用）
      if (this.config.indexing.generateEmbeddings) {
        fileIndex.embedding = await this.generateEmbedding(content);
      }
      
      // 存储索引
      this.fileIndex.set(filePath, fileIndex);
      this.symbolIndex.set(filePath, symbols);
      
      // 更新统计
      this.stats.filesIndexed++;
      this.stats.symbolsIndexed += symbols.length;
      this.stats.indexSize += stats.size;
      
      return fileIndex;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * 提取符号
   */
  private extractSymbols(content: string, language: string): SymbolIndex[] {
    const symbols: SymbolIndex[] = [];
    const lines = content.split('\n');
    
    // 简单的符号提取模式
    const patterns: Array<{ regex: RegExp; type: SymbolType }> = [
      { regex: /class\s+(\w+)/g, type: SymbolType.CLASS },
      { regex: /interface\s+(\w+)/g, type: SymbolType.INTERFACE },
      { regex: /function\s+(\w+)/g, type: SymbolType.FUNCTION },
      { regex: /const\s+(\w+)/g, type: SymbolType.CONSTANT },
      { regex: /let\s+(\w+)/g, type: SymbolType.VARIABLE },
      { regex: /var\s+(\w+)/g, type: SymbolType.VARIABLE },
    ];
    
    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        symbols.push({
          id: `sym_${match[1]}_${lineNumber}`,
          name: match[1],
          type,
          startLine: lineNumber,
          endLine: lineNumber,
          startColumn: 0,
          endColumn: 0,
        });
      }
    }
    
    return symbols;
  }

  // =========================================================================
  // 搜索功能
  // =========================================================================

  /**
   * 创建搜索任务
   */
  public async createSearchTask(
    query: string,
    type: SearchQueryType = this.config.search.defaultType,
    options?: Partial<SearchOptions>
  ): Promise<SearchQuery> {
    const searchQuery: SearchQuery = {
      id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: query,
      type,
      filters: {
        filePatterns: [],
        excludePatterns: [],
        fileExtensions: [],
        languages: [],
        symbols: [],
      },
      options: {
        maxResults: options?.maxResults ?? this.config.search.defaultMaxResults,
        minScore: options?.minScore ?? this.config.search.defaultMinScore,
        caseSensitive: options?.caseSensitive ?? false,
        wholeWord: options?.wholeWord ?? false,
        includeContext: options?.includeContext ?? true,
        contextLines: options?.contextLines ?? this.config.search.contextLines,
      },
      createdAt: Date.now(),
    };
    
    return searchQuery;
  }

  /**
   * 执行搜索
   */
  public async executeSearch(queryId: SearchQueryId): Promise<{
    query: SearchQuery;
    results: SearchResult[];
  }> {
    // 检查缓存
    const cacheKey = queryId;
    if (this.config.cache.enabled) {
      const cached = this.resultCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cache.ttl) {
        this.stats.cacheHits++;
        return {
          query: { id: queryId } as SearchQuery,
          results: cached.results,
        };
      }
      this.stats.cacheMisses++;
    }
    
    this.setState(SearchEngineState.SEARCHING);
    
    const startTime = Date.now();
    const controller = new AbortController();
    this.activeSearches.set(queryId, controller);
    
    try {
      // 获取查询
      const query = await this.getQuery(queryId);
      if (!query) {
        throw new Error(`Query ${queryId} not found`);
      }
      
      // 执行搜索
      let results: SearchResult[];
      
      switch (query.type) {
        case SearchQueryType.KEYWORD:
          results = await this.keywordSearch(query, controller.signal);
          break;
        case SearchQueryType.SEMANTIC:
          results = await this.semanticSearch(query, controller.signal);
          break;
        case SearchQueryType.REGEX:
          results = await this.regexSearch(query, controller.signal);
          break;
        case SearchQueryType.HYBRID:
          results = await this.hybridSearch(query, controller.signal);
          break;
        default:
          results = await this.keywordSearch(query, controller.signal);
      }
      
      // 排序和限制结果
      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, query.options.maxResults);
      
      // 缓存结果
      if (this.config.cache.enabled) {
        this.resultCache.set(cacheKey, { results, timestamp: Date.now() });
      }
      
      // 更新统计
      const searchTime = Date.now() - startTime;
      this.stats.searchesExecuted++;
      this.stats.averageSearchTime = 
        (this.stats.averageSearchTime * (this.stats.searchesExecuted - 1) + searchTime) /
        this.stats.searchesExecuted;
      this.stats.totalResultsReturned += results.length;
      
      this.setState(SearchEngineState.IDLE);
      
      this.emitEvent(SearchEngineEventType.SEARCH_COMPLETED, {
        queryId,
        resultCount: results.length,
        searchTime,
      });
      
      return { query, results };
      
    } catch (error) {
      this.setState(SearchEngineState.ERROR);
      this.emitEvent(SearchEngineEventType.SEARCH_FAILED, { queryId, error });
      throw error;
    } finally {
      this.activeSearches.delete(queryId);
    }
  }

  /**
   * 取消搜索
   */
  public async cancelSearch(queryId: SearchQueryId): Promise<void> {
    const controller = this.activeSearches.get(queryId);
    if (controller) {
      controller.abort();
      this.activeSearches.delete(queryId);
    }
  }

  // =========================================================================
  // 搜索方法
  // =========================================================================

  /**
   * 关键词搜索
   */
  private async keywordSearch(
    query: SearchQuery,
    signal: AbortSignal
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchText = query.options.caseSensitive
      ? query.text
      : query.text.toLowerCase();
    
    for (const [filePath, fileIndex] of this.fileIndex) {
      if (signal.aborted) break;
      
      const content = query.options.caseSensitive
        ? fileIndex.content
        : fileIndex.content.toLowerCase();
      
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchText)) {
          const context = this.getContext(lines, i, query.options.contextLines);
          
          results.push({
            id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            queryId: query.id,
            filePath,
            startLine: i + 1,
            endLine: i + 1,
            startColumn: 0,
            endColumn: lines[i].length,
            matchedText: lines[i].trim(),
            context,
            score: this.calculateKeywordScore(lines[i], searchText),
            matchType: MatchType.EXACT,
            metadata: {
              fileSize: fileIndex.size,
              language: fileIndex.language,
              lastModified: fileIndex.lastModified,
            },
          });
        }
      }
    }
    
    return results;
  }

  /**
   * 语义搜索
   */
  private async semanticSearch(
    query: SearchQuery,
    signal: AbortSignal
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // 生成查询嵌入
    const queryEmbedding = await this.generateEmbedding(query.text);
    
    for (const [filePath, fileIndex] of this.fileIndex) {
      if (signal.aborted) break;
      
      if (fileIndex.embedding) {
        const similarity = this.cosineSimilarity(queryEmbedding, fileIndex.embedding);
        
        if (similarity >= query.options.minScore) {
          results.push({
            id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            queryId: query.id,
            filePath,
            startLine: 1,
            endLine: fileIndex.lineCount,
            startColumn: 0,
            endColumn: 0,
            matchedText: fileIndex.content.substring(0, 200),
            context: fileIndex.content.substring(0, 500),
            score: similarity,
            matchType: MatchType.SEMANTIC,
            metadata: {
              fileSize: fileIndex.size,
              language: fileIndex.language,
              lastModified: fileIndex.lastModified,
            },
          });
        }
      }
    }
    
    return results;
  }

  /**
   * 正则搜索
   */
  private async regexSearch(
    query: SearchQuery,
    signal: AbortSignal
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const regex = new RegExp(query.text, query.options.caseSensitive ? 'g' : 'gi');
    
    for (const [filePath, fileIndex] of this.fileIndex) {
      if (signal.aborted) break;
      
      const lines = fileIndex.content.split('\n');
      let match;
      
      while ((match = regex.exec(fileIndex.content)) !== null) {
        const lineNumber = fileIndex.content.substring(0, match.index).split('\n').length;
        const context = this.getContext(lines, lineNumber - 1, query.options.contextLines);
        
        results.push({
          id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          queryId: query.id,
          filePath,
          startLine: lineNumber,
          endLine: lineNumber,
          startColumn: 0,
          endColumn: match[0].length,
          matchedText: match[0],
          context,
          score: 1.0,
          matchType: MatchType.REGEX,
          metadata: {
            fileSize: fileIndex.size,
            language: fileIndex.language,
            lastModified: fileIndex.lastModified,
          },
        });
      }
    }
    
    return results;
  }

  /**
   * 混合搜索
   */
  private async hybridSearch(
    query: SearchQuery,
    signal: AbortSignal
  ): Promise<SearchResult[]> {
    // 并发执行关键词和语义搜索
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordSearch(query, signal),
      this.semanticSearch(query, signal),
    ]);
    
    // 合并结果
    const combined = new Map<string, SearchResult>();
    
    // 添加关键词结果
    for (const result of keywordResults) {
      result.score *= 0.6; // 关键词权重
      combined.set(`${result.filePath}:${result.startLine}`, result);
    }
    
    // 添加语义结果
    for (const result of semanticResults) {
      const key = `${result.filePath}:${result.startLine}`;
      const existing = combined.get(key);
      
      if (existing) {
        existing.score += result.score * 0.4; // 语义权重
      } else {
        result.score *= 0.4;
        combined.set(key, result);
      }
    }
    
    return Array.from(combined.values());
  }

  // =========================================================================
  // 辅助方法
  // =========================================================================

  /**
   * 获取上下文
   */
  private getContext(lines: string[], lineIndex: number, contextLines: number): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    
    return lines.slice(start, end).join('\n');
  }

  /**
   * 计算关键词分数
   */
  private calculateKeywordScore(line: string, keyword: string): number {
    const count = (line.match(new RegExp(keyword, 'g')) || []).length;
    const length = line.length;
    
    // 基于匹配次数和行长度计算分数
    return Math.min(1.0, (count * keyword.length) / length);
  }

  /**
   * 生成嵌入
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // 简单的嵌入生成（实际应调用嵌入API）
    const dimension = 1536;
    const embedding = new Array(dimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = i % dimension;
      embedding[index] += Math.sin(charCode * (i + 1)) * 0.1;
    }
    
    // 归一化
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * 检测语言
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
    };
    
    return languageMap[ext] || 'text';
  }

  /**
   * 检查是否应排除
   */
  private shouldExclude(filePath: string): boolean {
    return this.config.indexing.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
  }

  /**
   * 检查是否应包含
   */
  private shouldInclude(filePath: string): boolean {
    return this.config.indexing.includePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
  }

  /**
   * 获取查询
   */
  private async getQuery(queryId: SearchQueryId): Promise<SearchQuery | null> {
    // 在实际实现中，这会从存储中获取查询
    return null;
  }

  /**
   * 设置状态
   */
  private setState(state: SearchEngineState): void {
    this.state = state;
    this.emitEvent(SearchEngineEventType.STATE_CHANGED, { state });
  }

  /**
   * 发射事件
   */
  private emitEvent(type: SearchEngineEventType, data?: unknown): void {
    const event: SearchEngineEvent = {
      type,
      engineId: this.id,
      data,
      timestamp: Date.now(),
    };
    
    this.emit(type, event);
  }

  /**
   * 初始化统计
   */
  private initializeStats(): SearchEngineStats {
    return {
      filesIndexed: 0,
      symbolsIndexed: 0,
      indexSize: 0,
      searchesExecuted: 0,
      averageSearchTime: 0,
      totalResultsReturned: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      averageIndexingTime: 0,
      lastIndexingTime: 0,
    };
  }

  // =========================================================================
  // 公共 API
  // =========================================================================

  /**
   * 获取状态
   */
  public getState(): SearchEngineState {
    return this.state;
  }

  /**
   * 获取统计
   */
  public getStats(): SearchEngineStats {
    return { ...this.stats };
  }

  /**
   * 获取索引大小
   */
  public getIndexSize(): number {
    return this.fileIndex.size;
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.resultCache.clear();
  }
}
