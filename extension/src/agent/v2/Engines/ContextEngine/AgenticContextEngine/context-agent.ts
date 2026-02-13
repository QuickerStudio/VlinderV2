/**
 * @fileoverview Agentic Context Engine - 代理上下文引擎
 * 
 * Agentic Context Engine 是 ContextEngine 的主代理，
 * 负责上下文的全局领导人和管理，为 MainAgent 提供关键的有价值信息。
 * 
 * 子代理:
 * - AgenticSearchEngine: 异步并发搜索
 * - AgenticResearchEngine: 异步并发研究
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  ContextAgentId,
  ContextAgentState,
  ContextInfo,
  ContextInfoType,
  ContextInfoSource,
  ContextImportance,
  ContextRequest,
  ContextResponse,
  ContextResponseStats,
  ContextAgentConfig,
  ContextAgentStats,
  ContextAgentEventType,
  ContextAgentEvent,
  SearchTask,
  SearchTaskId,
  ResearchTask,
  ResearchTaskId,
  SubAgentType,
} from './types';
import { AgenticSearchEngine } from '../AgenticSearchEngine/search-engine';
import { AgenticResearchEngine } from '../AgenticResearchEngine/research-engine';

/**
 * 默认上下文代理配置
 */
const DEFAULT_CONFIG: ContextAgentConfig = {
  id: 'context_agent_main',
  name: 'AgenticContextEngine',
  
  searchAgent: {
    enabled: true,
    defaultSearchType: 'hybrid',
    maxResults: 50,
    timeout: 30000,
  },
  
  researchAgent: {
    enabled: true,
    defaultDepth: 'medium',
    maxFindings: 20,
    timeout: 60000,
  },
  
  maxConcurrentSearches: 5,
  maxConcurrentResearch: 3,
  
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  
  defaultTimeout: 30000,
  maxTimeout: 120000,
};

/**
 * AgenticContextEngine - 上下文全局领导人
 * 
 * 职责:
 * - 接收 MainAgent 的上下文请求
 * - 协调 SearchAgent 和 ResearchAgent
 * - 综合信息并返回关键价值信息
 * - 管理上下文缓存
 */
export class AgenticContextEngine extends EventEmitter {
  private config: ContextAgentConfig;
  private id: ContextAgentId;
  private state: ContextAgentState = ContextAgentState.IDLE;
  
  // 子代理
  private searchEngine: AgenticSearchEngine | null = null;
  private researchEngine: AgenticResearchEngine | null = null;
  
  // 任务管理
  private activeSearchTasks: Map<SearchTaskId, SearchTask> = new Map();
  private activeResearchTasks: Map<ResearchTaskId, ResearchTask> = new Map();
  
  // 缓存
  private contextCache: Map<string, { info: ContextInfo[]; timestamp: number }> = new Map();
  
  // 统计
  private stats: ContextAgentStats;
  
  // 状态
  private isInitialized: boolean = false;

  constructor(config: Partial<ContextAgentConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as ContextAgentConfig;
    this.id = this.config.id;
    
    this.stats = this.initializeStats();
  }

  // =========================================================================
  // 生命周期
  // =========================================================================

  /**
   * 初始化上下文代理
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.setState(ContextAgentState.INITIALIZING);
    
    try {
      // 初始化搜索代理
      if (this.config.searchAgent.enabled) {
        this.searchEngine = new AgenticSearchEngine(this.config.searchAgent);
        await this.searchEngine.initialize();
        
        // 监听搜索代理事件
        this.searchEngine.on('searchCompleted', this.handleSearchCompleted.bind(this));
      }
      
      // 初始化研究代理
      if (this.config.researchAgent.enabled) {
        this.researchEngine = new AgenticResearchEngine(this.config.researchAgent);
        await this.researchEngine.initialize();
        
        // 监听研究代理事件
        this.researchEngine.on('researchCompleted', this.handleResearchCompleted.bind(this));
      }
      
      this.isInitialized = true;
      this.setState(ContextAgentState.IDLE);
      
      this.emit('initialized', { agentId: this.id });
      
    } catch (error) {
      this.setState(ContextAgentState.ERROR);
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * 关闭上下文代理
   */
  public async shutdown(): Promise<void> {
    // 取消所有活动任务
    for (const [taskId] of this.activeSearchTasks) {
      await this.searchEngine?.cancelSearch(taskId);
    }
    
    for (const [taskId] of this.activeResearchTasks) {
      await this.researchEngine?.cancelResearch(taskId);
    }
    
    // 关闭子代理
    if (this.searchEngine) {
      await this.searchEngine.shutdown();
    }
    
    if (this.researchEngine) {
      await this.researchEngine.shutdown();
    }
    
    // 清理缓存
    this.contextCache.clear();
    
    this.isInitialized = false;
    this.setState(ContextAgentState.IDLE);
    
    this.emit('shutdown', { agentId: this.id });
  }

  // =========================================================================
  // 核心功能 - 上下文请求处理
  // =========================================================================

  /**
   * 处理上下文请求 - 主入口
   */
  public async handleRequest(request: ContextRequest): Promise<ContextResponse> {
    const startTime = Date.now();
    
    // 检查缓存
    if (this.config.cacheEnabled) {
      const cached = this.getCachedContext(request.query);
      if (cached) {
        this.stats.cacheHits++;
        return {
          requestId: request.id,
          info: cached,
          stats: {
            totalResults: cached.length,
            searchResults: 0,
            researchResults: 0,
            cacheHits: 1,
            tokensUsed: 0,
          },
          duration: Date.now() - startTime,
          success: true,
        };
      }
      this.stats.cacheMisses++;
    }
    
    // 分析请求，确定需要执行的任务
    const { searchTasks, researchTasks } = this.analyzeRequest(request);
    
    // 并发执行搜索和研究任务
    this.setState(ContextAgentState.SEARCHING);
    
    const [searchResults, researchResults] = await Promise.all([
      this.executeSearchTasks(searchTasks),
      this.executeResearchTasks(researchTasks),
    ]);
    
    // 综合信息
    this.setState(ContextAgentState.SYNTHESIZING);
    
    const synthesizedInfo = this.synthesizeInfo(searchResults, researchResults, request);
    
    // 缓存结果
    if (this.config.cacheEnabled) {
      this.cacheContext(request.query, synthesizedInfo);
    }
    
    // 生成响应
    this.setState(ContextAgentState.REPORTING);
    
    const response: ContextResponse = {
      requestId: request.id,
      info: synthesizedInfo,
      stats: {
        totalResults: synthesizedInfo.length,
        searchResults: searchResults.length,
        researchResults: researchResults.length,
        cacheHits: 0,
        tokensUsed: this.estimateTokens(synthesizedInfo),
      },
      duration: Date.now() - startTime,
      success: true,
    };
    
    // 更新统计
    this.updateStats(response);
    
    this.setState(ContextAgentState.IDLE);
    
    return response;
  }

  /**
   * 分析请求，确定需要执行的任务
   */
  private analyzeRequest(request: ContextRequest): {
    searchTasks: Partial<SearchTask>[];
    researchTasks: Partial<ResearchTask>[];
  } {
    const searchTasks: Partial<SearchTask>[] = [];
    const researchTasks: Partial<ResearchTask>[] = [];
    
    // 根据需求类型创建任务
    for (const need of request.needs) {
      switch (need) {
        case 'code_context':
        case 'dependencies':
        case 'patterns':
          searchTasks.push({
            query: request.query,
            type: 'hybrid',
            config: {
              maxResults: request.constraints.maxResults,
              minScore: 0.5,
              includePatterns: request.constraints.filePatterns,
              excludePatterns: request.constraints.excludePatterns,
              fileTypes: request.constraints.languages,
              caseSensitive: false,
              wholeWord: false,
              regex: false,
            },
          });
          break;
          
        case 'errors':
        case 'solutions':
          researchTasks.push({
            topic: `${need}: ${request.query}`,
            questions: [
              `What are common ${need} related to ${request.query}?`,
              `How can these ${need} be addressed?`,
            ],
            config: {
              depth: 'medium',
              breadth: 5,
              timeout: request.timeout || this.config.defaultTimeout,
              includeWebSearch: false,
              includeCodeAnalysis: true,
              includeDocumentation: true,
            },
          });
          break;
          
        case 'documentation':
        case 'api_info':
          searchTasks.push({
            query: request.query,
            type: 'semantic',
            config: {
              maxResults: 10,
              minScore: 0.7,
              includePatterns: ['**/*.md', '**/docs/**'],
              excludePatterns: request.constraints.excludePatterns,
              fileTypes: [],
              caseSensitive: false,
              wholeWord: false,
              regex: false,
            },
          });
          break;
      }
    }
    
    return { searchTasks, researchTasks };
  }

  /**
   * 执行搜索任务
   */
  private async executeSearchTasks(tasks: Partial<SearchTask>[]): Promise<ContextInfo[]> {
    if (!this.searchEngine || tasks.length === 0) {
      return [];
    }
    
    const results: ContextInfo[] = [];
    
    // 并发执行搜索任务
    const searchPromises = tasks.slice(0, this.config.maxConcurrentSearches).map(async (task) => {
      const searchTask = await this.searchEngine!.createSearchTask(
        task.query || '',
        task.type || 'hybrid',
        task.config
      );
      
      this.activeSearchTasks.set(searchTask.id, searchTask);
      
      try {
        const result = await this.searchEngine!.executeSearch(searchTask.id);
        return this.convertSearchResultsToContextInfo(result.results);
      } finally {
        this.activeSearchTasks.delete(searchTask.id);
      }
    });
    
    const searchResults = await Promise.all(searchPromises);
    
    for (const info of searchResults.flat()) {
      results.push(info);
    }
    
    return results;
  }

  /**
   * 执行研究任务
   */
  private async executeResearchTasks(tasks: Partial<ResearchTask>[]): Promise<ContextInfo[]> {
    if (!this.researchEngine || tasks.length === 0) {
      return [];
    }
    
    const results: ContextInfo[] = [];
    
    // 并发执行研究任务
    const researchPromises = tasks.slice(0, this.config.maxConcurrentResearch).map(async (task) => {
      const researchTask = await this.researchEngine!.createResearchTask(
        task.topic || '',
        task.questions || [],
        task.config
      );
      
      this.activeResearchTasks.set(researchTask.id, researchTask);
      
      try {
        const result = await this.researchEngine!.executeResearch(researchTask.id);
        return this.convertResearchFindingsToContextInfo(result.findings, result.synthesis);
      } finally {
        this.activeResearchTasks.delete(researchTask.id);
      }
    });
    
    const researchResults = await Promise.all(researchPromises);
    
    for (const info of researchResults.flat()) {
      results.push(info);
    }
    
    return results;
  }

  /**
   * 综合信息
   */
  private synthesizeInfo(
    searchResults: ContextInfo[],
    researchResults: ContextInfo[],
    request: ContextRequest
  ): ContextInfo[] {
    const allInfo = [...searchResults, ...researchResults];
    
    // 按相关性和重要性排序
    allInfo.sort((a, b) => {
      // 首先按重要性排序
      const importanceOrder = {
        [ContextImportance.CRITICAL]: 4,
        [ContextImportance.HIGH]: 3,
        [ContextImportance.MEDIUM]: 2,
        [ContextImportance.LOW]: 1,
      };
      
      const importanceDiff = importanceOrder[b.importance] - importanceOrder[a.importance];
      if (importanceDiff !== 0) {
        return importanceDiff;
      }
      
      // 然后按相关性分数排序
      return b.relevanceScore - a.relevanceScore;
    });
    
    // 限制结果数量
    const maxResults = request.constraints.maxResults || 20;
    return allInfo.slice(0, maxResults);
  }

  // =========================================================================
  // 转换方法
  // =========================================================================

  /**
   * 将搜索结果转换为上下文信息
   */
  private convertSearchResultsToContextInfo(results: any[]): ContextInfo[] {
    return results.map((result, index) => ({
      id: `ctx_search_${index}_${Date.now()}`,
      type: ContextInfoType.CODE,
      title: `Code match in ${result.filePath}`,
      summary: result.context.substring(0, 200),
      details: result.content,
      source: ContextInfoSource.SEARCH_AGENT,
      confidence: result.score,
      relevanceScore: result.score,
      importance: result.score > 0.8 ? ContextImportance.HIGH : ContextImportance.MEDIUM,
      timestamp: Date.now(),
      metadata: {
        filePath: result.filePath,
        lineNumbers: [result.startLine, result.endLine],
        tags: ['search', 'code'],
      },
    }));
  }

  /**
   * 将研究发现转换为上下文信息
   */
  private convertResearchFindingsToContextInfo(
    findings: any[],
    synthesis?: any
  ): ContextInfo[] {
    const info: ContextInfo[] = findings.map((finding, index) => ({
      id: `ctx_research_${index}_${Date.now()}`,
      type: this.mapSourceTypeToInfoType(finding.sourceType),
      title: finding.title,
      summary: finding.content.substring(0, 200),
      details: finding.content,
      source: ContextInfoSource.RESEARCH_AGENT,
      confidence: finding.confidence,
      relevanceScore: finding.relevanceScore,
      importance: finding.confidence > 0.8 ? ContextImportance.HIGH : ContextImportance.MEDIUM,
      timestamp: Date.now(),
      metadata: {
        tags: ['research', finding.sourceType],
      },
    }));
    
    // 添加综合信息
    if (synthesis) {
      info.push({
        id: `ctx_synthesis_${Date.now()}`,
        type: ContextInfoType.SOLUTION,
        title: 'Research Synthesis',
        summary: synthesis.summary,
        details: synthesis.summary + '\n\nKey Points:\n' + synthesis.keyPoints.join('\n'),
        source: ContextInfoSource.RESEARCH_AGENT,
        confidence: synthesis.overallConfidence,
        relevanceScore: 1.0,
        importance: ContextImportance.HIGH,
        timestamp: Date.now(),
        metadata: {
          tags: ['research', 'synthesis'],
        },
      });
    }
    
    return info;
  }

  /**
   * 映射源类型到信息类型
   */
  private mapSourceTypeToInfoType(sourceType: string): ContextInfoType {
    const mapping: Record<string, ContextInfoType> = {
      code: ContextInfoType.CODE,
      documentation: ContextInfoType.DOCUMENTATION,
      web: ContextInfoType.API,
      memory: ContextInfoType.PATTERN,
    };
    
    return mapping[sourceType] || ContextInfoType.CODE;
  }

  // =========================================================================
  // 缓存管理
  // =========================================================================

  /**
   * 获取缓存的上下文
   */
  private getCachedContext(query: string): ContextInfo[] | null {
    const cacheKey = this.getCacheKey(query);
    const cached = this.contextCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.info;
    }
    
    return null;
  }

  /**
   * 缓存上下文
   */
  private cacheContext(query: string, info: ContextInfo[]): void {
    const cacheKey = this.getCacheKey(query);
    this.contextCache.set(cacheKey, {
      info,
      timestamp: Date.now(),
    });
    
    // 限制缓存大小
    if (this.contextCache.size > 100) {
      const oldestKey = this.contextCache.keys().next().value;
      if (oldestKey) {
        this.contextCache.delete(oldestKey);
      }
    }
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(query: string): string {
    return query.toLowerCase().trim();
  }

  // =========================================================================
  // 事件处理
  // =========================================================================

  /**
   * 处理搜索完成事件
   */
  private handleSearchCompleted(data: any): void {
    this.emitEvent(ContextAgentEventType.SEARCH_COMPLETED, data);
  }

  /**
   * 处理研究完成事件
   */
  private handleResearchCompleted(data: any): void {
    this.emitEvent(ContextAgentEventType.RESEARCH_COMPLETED, data);
  }

  // =========================================================================
  // 辅助方法
  // =========================================================================

  /**
   * 设置状态
   */
  private setState(state: ContextAgentState): void {
    this.state = state;
    this.emitEvent(ContextAgentEventType.STATE_CHANGED, { state });
  }

  /**
   * 发射事件
   */
  private emitEvent(type: ContextAgentEventType, data?: unknown): void {
    const event: ContextAgentEvent = {
      type,
      agentId: this.id,
      data,
      timestamp: Date.now(),
    };
    
    this.emit(type, event);
  }

  /**
   * 估算令牌数
   */
  private estimateTokens(info: ContextInfo[]): number {
    let totalChars = 0;
    for (const item of info) {
      totalChars += item.summary.length + item.details.length;
    }
    return Math.ceil(totalChars / 4); // 粗略估算
  }

  /**
   * 更新统计
   */
  private updateStats(response: ContextResponse): void {
    this.stats.totalRequests++;
    if (response.success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + response.duration) /
      this.stats.totalRequests;
    
    this.stats.totalTokensUsed += response.stats.tokensUsed;
    
    this.stats.cacheHitRate = 
      this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses);
  }

  /**
   * 初始化统计
   */
  private initializeStats(): ContextAgentStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      searchTasksExecuted: 0,
      averageSearchTime: 0,
      researchTasksExecuted: 0,
      averageResearchTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
    };
  }

  // =========================================================================
  // 公共 API
  // =========================================================================

  /**
   * 获取当前状态
   */
  public getState(): ContextAgentState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  public getStats(): ContextAgentStats {
    return { ...this.stats };
  }

  /**
   * 获取活动任务数
   */
  public getActiveTaskCount(): { search: number; research: number } {
    return {
      search: this.activeSearchTasks.size,
      research: this.activeResearchTasks.size,
    };
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.contextCache.clear();
  }
}
