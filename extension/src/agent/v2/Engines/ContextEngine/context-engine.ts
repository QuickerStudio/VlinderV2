/**
 * @fileoverview ContextEngine - 上下文管理与代码库检索引擎
 * 
 * Implements Agentic Context Engine with:
 * - Code repository indexing
 * - Semantic code search
 * - Context window management
 * - Relevance ranking
 * - Context compression
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import {
  ContextId,
  FileId,
  SymbolId,
  IndexId,
  FileContext,
  SymbolInfo,
  SymbolKind,
  Location,
  ContextWindow,
  ContextPriority,
  CodeSnippet,
  RepositoryIndex,
  IndexConfig,
  SearchQuery,
  SearchType,
  SearchFilter,
  SearchResult,
  SearchHighlight,
  ContextManagerConfig,
  ContextEngineStatistics,
  ContextEventType,
  ContextEvent,
  FileContextSchema,
  SearchQuerySchema,
} from './types';

/**
 * Default Context Manager Configuration
 */
const DEFAULT_CONFIG: ContextManagerConfig = {
  window: {
    maxTokens: 128000,
    reservedTokens: 16000,
    systemPromptTokens: 2000,
    prioritizationStrategy: 'hybrid',
    relevanceDecay: 0.95,
    autoCompress: true,
    compressionThreshold: 0.8,
    compressionRatio: 0.5,
  },
  indexing: {
    includePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.java'],
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    maxFileSize: 1024 * 1024, // 1MB
    extractSymbols: true,
    extractImports: true,
    extractExports: true,
    generateEmbeddings: true,
    embeddingModel: 'text-embedding-3-small',
    embeddingBatchSize: 100,
    parallelIndexing: true,
    maxWorkers: 4,
    cacheEnabled: true,
  },
  search: {
    defaultType: SearchType.HYBRID,
    defaultTopK: 10,
    cacheResults: true,
    cacheSize: 1000,
    cacheTTL: 300000,
  },
  compression: {
    enabled: true,
    strategy: 'extract',
    maxSnippetLength: 500,
    preserveImports: true,
    preserveExports: true,
    preserveSignatures: true,
  },
  performance: {
    maxConcurrentSearches: 10,
    indexUpdateInterval: 60000,
    watchForChanges: false,
    incrementalIndexing: true,
  },
};

/**
 * ContextEngine - Agentic Context Management System
 */
export class ContextEngine extends EventEmitter {
  private config: ContextManagerConfig;
  
  // Repository index
  private index: RepositoryIndex;
  
  // Context window
  private contextWindow: ContextWindow;
  
  // Search cache
  private searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  
  // Statistics
  private stats: ContextEngineStatistics;
  
  // State
  private isInitialized: boolean = false;
  private watchInterval?: NodeJS.Timeout;

  constructor(config: Partial<ContextManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as ContextManagerConfig;
    
    // Initialize index
    this.index = {
      id: this.generateIndexId(),
      rootPath: '',
      files: new Map(),
      fileCount: 0,
      totalSize: 0,
      symbols: new Map(),
      symbolCount: 0,
      nameIndex: new Map(),
      pathIndex: new Map(),
      importIndex: new Map(),
      embeddings: new Map(),
      indexedAt: 0,
      lastUpdated: 0,
      version: '1.0.0',
    };
    
    // Initialize context window
    this.contextWindow = {
      maxTokens: this.config.window.maxTokens,
      reservedTokens: this.config.window.reservedTokens,
      availableTokens: this.config.window.maxTokens - this.config.window.reservedTokens,
      systemPrompt: '',
      files: [],
      symbols: [],
      snippets: [],
      priorityQueue: [],
      totalTokens: 0,
      utilization: 0,
    };
    
    // Initialize statistics
    this.stats = this.initializeStats();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the context engine
   */
  public async initialize(rootPath: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.index.rootPath = rootPath;
    
    // Index the repository
    await this.indexRepository(rootPath);
    
    // Start watching for changes
    if (this.config.performance.watchForChanges) {
      this.startWatching();
    }
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the context engine
   */
  public async shutdown(): Promise<void> {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
    
    this.index.files.clear();
    this.index.symbols.clear();
    this.index.nameIndex.clear();
    this.index.pathIndex.clear();
    this.index.importIndex.clear();
    this.index.embeddings.clear();
    
    this.searchCache.clear();
    
    this.isInitialized = false;
    this.emit('shutdown');
  }

  // =========================================================================
  // Repository Indexing
  // =========================================================================

  /**
   * Index a repository
   */
  public async indexRepository(rootPath: string): Promise<void> {
    const startTime = Date.now();
    
    // Get all files matching patterns
    const files = await this.discoverFiles(rootPath);
    
    // Index files in parallel
    const batchSize = this.config.indexing.maxWorkers;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map(file => this.indexFile(file)));
    }
    
    // Update index metadata
    this.index.indexedAt = Date.now();
    this.index.lastUpdated = this.index.indexedAt;
    this.index.fileCount = this.index.files.size;
    this.index.symbolCount = this.index.symbols.size;
    
    this.stats.indexingTime = Date.now() - startTime;
    this.stats.lastIndexUpdate = this.index.indexedAt;
    
    this.emit(ContextEventType.INDEX_UPDATED, { fileCount: this.index.fileCount });
  }

  /**
   * Discover files to index
   */
  private async discoverFiles(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Check exclude patterns
          if (!this.shouldExclude(fullPath)) {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          // Check include patterns
          if (this.shouldInclude(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    await walk(rootPath);
    return files;
  }

  /**
   * Index a single file
   */
  public async indexFile(filePath: string): Promise<FileContext | null> {
    try {
      // Read file
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const stats = await fs.promises.stat(filePath);
      
      // Check file size
      if (stats.size > this.config.indexing.maxFileSize) {
        return null;
      }
      
      // Create file context
      const fileId = this.generateFileId(filePath);
      const language = this.detectLanguage(filePath);
      
      const fileContext: FileContext = {
        id: fileId,
        path: filePath,
        content,
        language,
        size: stats.size,
        lineCount: content.split('\n').length,
        lastModified: stats.mtimeMs,
        symbols: [],
        imports: [],
        exports: [],
        relevanceScore: 0,
        accessCount: 0,
        lastAccessed: Date.now(),
      };
      
      // Extract symbols
      if (this.config.indexing.extractSymbols) {
        fileContext.symbols = this.extractSymbols(fileContext);
        
        // Add symbols to index
        for (const symbol of fileContext.symbols) {
          this.index.symbols.set(symbol.id, symbol);
          
          // Update name index
          if (!this.index.nameIndex.has(symbol.name)) {
            this.index.nameIndex.set(symbol.name, []);
          }
          this.index.nameIndex.get(symbol.name)!.push(symbol.id);
        }
      }
      
      // Extract imports/exports
      if (this.config.indexing.extractImports) {
        fileContext.imports = this.extractImports(fileContext);
      }
      
      if (this.config.indexing.extractExports) {
        fileContext.exports = this.extractExports(fileContext);
      }
      
      // Generate embedding
      if (this.config.indexing.generateEmbeddings) {
        fileContext.embedding = await this.generateEmbedding(content);
        this.index.embeddings.set(fileId, fileContext.embedding);
      }
      
      // Add to index
      this.index.files.set(fileId, fileContext);
      this.index.pathIndex.set(filePath, fileId);
      this.index.totalSize += stats.size;
      
      this.emit(ContextEventType.FILE_INDEXED, { fileId, path: filePath });
      
      return fileContext;
      
    } catch (error) {
      console.error(`Failed to index file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Remove a file from index
   */
  public async removeFile(filePath: string): Promise<void> {
    const fileId = this.index.pathIndex.get(filePath);
    if (!fileId) return;
    
    const file = this.index.files.get(fileId);
    if (file) {
      // Remove symbols
      for (const symbol of file.symbols) {
        this.index.symbols.delete(symbol.id);
        
        const nameSymbols = this.index.nameIndex.get(symbol.name);
        if (nameSymbols) {
          const index = nameSymbols.indexOf(symbol.id);
          if (index !== -1) {
            nameSymbols.splice(index, 1);
          }
        }
      }
      
      // Remove from index
      this.index.files.delete(fileId);
      this.index.pathIndex.delete(filePath);
      this.index.embeddings.delete(fileId);
      this.index.totalSize -= file.size;
    }
    
    this.emit(ContextEventType.FILE_REMOVED, { fileId, path: filePath });
  }

  // =========================================================================
  // Search
  // =========================================================================

  /**
   * Search for code
   */
  public async search(query: SearchQuery): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    // Validate query
    const validatedQuery = SearchQuerySchema.parse(query);
    
    // Check cache
    const cacheKey = JSON.stringify(validatedQuery);
    if (this.config.search.cacheResults) {
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.search.cacheTTL) {
        return cached.results;
      }
    }
    
    let results: SearchResult[];
    
    switch (validatedQuery.type) {
      case SearchType.SEMANTIC:
        results = await this.semanticSearch(validatedQuery);
        break;
      case SearchType.KEYWORD:
        results = await this.keywordSearch(validatedQuery);
        break;
      case SearchType.SYMBOL:
        results = await this.symbolSearch(validatedQuery);
        break;
      case SearchType.REGEX:
        results = await this.regexSearch(validatedQuery);
        break;
      case SearchType.HYBRID:
        results = await this.hybridSearch(validatedQuery);
        break;
      default:
        results = await this.keywordSearch(validatedQuery);
    }
    
    // Apply filters
    if (validatedQuery.filters) {
      results = this.applyFilters(results, validatedQuery.filters);
    }
    
    // Sort by score and take top K
    results.sort((a, b) => b.score - a.score);
    results = results.slice(0, validatedQuery.topK);
    
    // Cache results
    if (this.config.search.cacheResults) {
      this.searchCache.set(cacheKey, { results, timestamp: Date.now() });
    }
    
    // Update stats
    this.stats.totalSearches++;
    this.stats.averageSearchTime = 
      (this.stats.averageSearchTime * (this.stats.totalSearches - 1) + (Date.now() - startTime)) 
      / this.stats.totalSearches;
    
    this.emit(ContextEventType.SEARCH_COMPLETED, { query: validatedQuery, resultCount: results.length });
    
    return results;
  }

  /**
   * Semantic search using embeddings
   */
  private async semanticSearch(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query.query);
    
    // Search files
    for (const [fileId, file] of this.index.files) {
      if (file.embedding) {
        const similarity = this.cosineSimilarity(queryEmbedding, file.embedding);
        
        if (similarity >= query.minScore) {
          results.push({
            id: fileId,
            type: 'file',
            score: similarity,
            content: query.includeContent ? file.content : undefined,
            file,
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Keyword search
   */
  private async keywordSearch(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const keywords = query.query.toLowerCase().split(/\s+/);
    
    for (const [fileId, file] of this.index.files) {
      const content = file.content.toLowerCase();
      let score = 0;
      
      for (const keyword of keywords) {
        const count = (content.match(new RegExp(keyword, 'g')) || []).length;
        score += count;
      }
      
      if (score > 0) {
        results.push({
          id: fileId,
          type: 'file',
          score: score / keywords.length,
          content: query.includeContent ? file.content : undefined,
          file,
        });
      }
    }
    
    return results;
  }

  /**
   * Symbol search
   */
  private async symbolSearch(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const symbolIds = this.index.nameIndex.get(query.query) || [];
    
    for (const symbolId of symbolIds) {
      const symbol = this.index.symbols.get(symbolId);
      if (symbol) {
        const file = this.index.files.get(symbol.location.fileId);
        
        results.push({
          id: symbolId,
          type: 'symbol',
          score: 1.0,
          symbol,
          file,
        });
      }
    }
    
    // Also search for partial matches
    for (const [name, ids] of this.index.nameIndex) {
      if (name.toLowerCase().includes(query.query.toLowerCase()) && name !== query.query) {
        for (const symbolId of ids) {
          const symbol = this.index.symbols.get(symbolId);
          if (symbol) {
            const file = this.index.files.get(symbol.location.fileId);
            
            results.push({
              id: symbolId,
              type: 'symbol',
              score: 0.7,
              symbol,
              file,
            });
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Regex search
   */
  private async regexSearch(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const regex = new RegExp(query.query, 'gm');
    
    for (const [fileId, file] of this.index.files) {
      const matches = [...file.content.matchAll(regex)];
      
      if (matches.length > 0) {
        results.push({
          id: fileId,
          type: 'file',
          score: matches.length,
          content: query.includeContent ? file.content : undefined,
          file,
          highlights: matches.map(match => ({
            startLine: this.getLineNumber(file.content, match.index!),
            startColumn: 0,
            endLine: this.getLineNumber(file.content, match.index! + match[0].length),
            endColumn: 0,
            text: match[0],
          })),
        });
      }
    }
    
    return results;
  }

  /**
   * Hybrid search (combines semantic and keyword)
   */
  private async hybridSearch(query: SearchQuery): Promise<SearchResult[]> {
    const semanticResults = await this.semanticSearch(query);
    const keywordResults = await this.keywordSearch(query);
    
    // Combine and deduplicate
    const combined = new Map<string, SearchResult>();
    
    for (const result of semanticResults) {
      combined.set(result.id, {
        ...result,
        score: result.score * 0.6,
      });
    }
    
    for (const result of keywordResults) {
      const existing = combined.get(result.id);
      if (existing) {
        existing.score += result.score * 0.4;
      } else {
        combined.set(result.id, {
          ...result,
          score: result.score * 0.4,
        });
      }
    }
    
    return Array.from(combined.values());
  }

  // =========================================================================
  // Context Window Management
  // =========================================================================

  /**
   * Add file to context window
   */
  public async addFileToContext(filePath: string, priority: number = 0): Promise<boolean> {
    const fileId = this.index.pathIndex.get(filePath);
    if (!fileId) return false;
    
    const file = this.index.files.get(fileId);
    if (!file) return false;
    
    // Calculate tokens
    const tokens = this.estimateTokens(file.content);
    
    // Check if fits in window
    if (this.contextWindow.totalTokens + tokens > this.contextWindow.availableTokens) {
      // Need to compress or remove files
      if (this.config.window.autoCompress) {
        await this.compressContext();
      } else {
        return false;
      }
    }
    
    // Add to window
    this.contextWindow.files.push(file);
    this.contextWindow.totalTokens += tokens;
    this.contextWindow.utilization = this.contextWindow.totalTokens / this.contextWindow.availableTokens;
    
    // Update priority queue
    this.contextWindow.priorityQueue.push({
      id: fileId,
      type: 'file',
      priority,
      tokens,
      lastAccessed: Date.now(),
    });
    
    // Update file access
    file.accessCount++;
    file.lastAccessed = Date.now();
    
    this.emit(ContextEventType.CONTEXT_ADDED, { fileId, path: filePath });
    
    return true;
  }

  /**
   * Remove file from context window
   */
  public async removeFileFromContext(filePath: string): Promise<boolean> {
    const fileId = this.index.pathIndex.get(filePath);
    if (!fileId) return false;
    
    const index = this.contextWindow.files.findIndex(f => f.id === fileId);
    if (index === -1) return false;
    
    const file = this.contextWindow.files[index];
    const tokens = this.estimateTokens(file.content);
    
    this.contextWindow.files.splice(index, 1);
    this.contextWindow.totalTokens -= tokens;
    this.contextWindow.utilization = this.contextWindow.totalTokens / this.contextWindow.availableTokens;
    
    // Remove from priority queue
    const pqIndex = this.contextWindow.priorityQueue.findIndex(p => p.id === fileId);
    if (pqIndex !== -1) {
      this.contextWindow.priorityQueue.splice(pqIndex, 1);
    }
    
    this.emit(ContextEventType.CONTEXT_REMOVED, { fileId, path: filePath });
    
    return true;
  }

  /**
   * Compress context window
   */
  public async compressContext(): Promise<void> {
    if (!this.config.compression.enabled) return;
    
    // Sort by priority (lowest first)
    this.contextWindow.priorityQueue.sort((a, b) => a.priority - b.priority);
    
    // Remove lowest priority items until under threshold
    while (
      this.contextWindow.utilization > this.config.window.compressionThreshold &&
      this.contextWindow.priorityQueue.length > 0
    ) {
      const lowest = this.contextWindow.priorityQueue.shift();
      if (lowest) {
        const file = this.contextWindow.files.find(f => f.id === lowest.id);
        if (file) {
          await this.removeFileFromContext(file.path);
        }
      }
    }
    
    this.emit(ContextEventType.CONTEXT_COMPRESSED, { utilization: this.contextWindow.utilization });
  }

  /**
   * Get context window
   */
  public getContextWindow(): ContextWindow {
    return { ...this.contextWindow };
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Check if path should be excluded
   */
  private shouldExclude(filePath: string): boolean {
    return this.config.indexing.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
  }

  /**
   * Check if path should be included
   */
  private shouldInclude(filePath: string): boolean {
    return this.config.indexing.includePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
  }

  /**
   * Detect language from file extension
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
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
    };
    
    return languageMap[ext] || 'text';
  }

  /**
   * Extract symbols from file
   */
  private extractSymbols(file: FileContext): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const lines = file.content.split('\n');
    
    // Simple regex-based symbol extraction
    const patterns = [
      { regex: /class\s+(\w+)/g, kind: SymbolKind.CLASS },
      { regex: /interface\s+(\w+)/g, kind: SymbolKind.INTERFACE },
      { regex: /function\s+(\w+)/g, kind: SymbolKind.FUNCTION },
      { regex: /const\s+(\w+)/g, kind: SymbolKind.CONSTANT },
      { regex: /let\s+(\w+)/g, kind: SymbolKind.VARIABLE },
      { regex: /var\s+(\w+)/g, kind: SymbolKind.VARIABLE },
    ];
    
    for (const { regex, kind } of patterns) {
      let match;
      while ((match = regex.exec(file.content)) !== null) {
        const lineNumber = this.getLineNumber(file.content, match.index);
        
        symbols.push({
          id: this.generateSymbolId(file.id, match[1], lineNumber),
          name: match[1],
          kind,
          location: {
            fileId: file.id,
            path: file.path,
            startLine: lineNumber,
            startColumn: match.index - lines.slice(0, lineNumber - 1).join('\n').length,
            endLine: lineNumber,
            endColumn: 0,
          },
          references: [],
          definitions: [],
        });
      }
    }
    
    return symbols;
  }

  /**
   * Extract imports from file
   */
  private extractImports(file: FileContext): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Extract exports from file
   */
  private extractExports(file: FileContext): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface)\s+(\w+)/g;
    
    let match;
    while ((match = exportRegex.exec(file.content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder - in production, this would call an embedding API
    const dimension = 1536;
    const embedding = new Array(dimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = i % dimension;
      embedding[index] += Math.sin(charCode * (i + 1)) * 0.1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  /**
   * Calculate cosine similarity
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
   * Get line number from index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Estimate tokens for text
   */
  private estimateTokens(text: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Apply search filters
   */
  private applyFilters(results: SearchResult[], filters: SearchFilter): SearchResult[] {
    return results.filter(result => {
      // File pattern filter
      if (filters.filePatterns && filters.filePatterns.length > 0) {
        const matches = filters.filePatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return result.file && regex.test(result.file.path);
        });
        if (!matches) return false;
      }
      
      // Language filter
      if (filters.languages && filters.languages.length > 0) {
        if (result.file && !filters.languages.includes(result.file.language)) {
          return false;
        }
      }
      
      // Symbol kind filter
      if (filters.symbolKinds && filters.symbolKinds.length > 0) {
        if (result.symbol && !filters.symbolKinds.includes(result.symbol.kind)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Start watching for file changes
   */
  private startWatching(): void {
    this.watchInterval = setInterval(async () => {
      // Check for file changes
      // In production, this would use fs.watch or similar
    }, this.config.performance.indexUpdateInterval);
  }

  // =========================================================================
  // ID Generators
  // =========================================================================

  private generateIndexId(): IndexId {
    return `idx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFileId(filePath: string): FileId {
    return `file_${Buffer.from(filePath).toString('base64').slice(0, 20)}`;
  }

  private generateSymbolId(fileId: FileId, name: string, line: number): SymbolId {
    return `sym_${fileId}_${name}_${line}`;
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  private initializeStats(): ContextEngineStatistics {
    return {
      totalFiles: 0,
      totalSymbols: 0,
      totalSize: 0,
      indexSize: 0,
      windowUtilization: 0,
      averageTokensPerFile: 0,
      compressionRatio: 0,
      totalSearches: 0,
      averageSearchTime: 0,
      cacheHitRate: 0,
      indexingTime: 0,
      lastIndexUpdate: 0,
    };
  }

  /**
   * Get statistics
   */
  public getStatistics(): ContextEngineStatistics {
    return {
      ...this.stats,
      totalFiles: this.index.files.size,
      totalSymbols: this.index.symbols.size,
      totalSize: this.index.totalSize,
      windowUtilization: this.contextWindow.utilization,
      averageTokensPerFile: this.contextWindow.files.length > 0
        ? this.contextWindow.totalTokens / this.contextWindow.files.length
        : 0,
    };
  }
}
