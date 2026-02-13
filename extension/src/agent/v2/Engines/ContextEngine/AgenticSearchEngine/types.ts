/**
 * @fileoverview Agentic Search Engine Types - 代理搜索引擎类型定义
 * 
 * 异步并发搜索引擎，为 AgenticContextEngine 提供代码搜索功能
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// 标识符
// ============================================================================

export type SearchEngineId = string;
export type SearchQueryId = string;

// ============================================================================
// 搜索引擎状态
// ============================================================================

/**
 * 搜索引擎状态
 */
export enum SearchEngineState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  INDEXING = 'indexing',
  SEARCHING = 'searching',
  ERROR = 'error',
}

// ============================================================================
// 搜索查询
// ============================================================================

/**
 * 搜索查询
 */
export interface SearchQuery {
  id: SearchQueryId;
  text: string;
  type: SearchQueryType;
  
  // 过滤器
  filters: SearchFilters;
  
  // 选项
  options: SearchOptions;
  
  // 时间
  createdAt: number;
}

/**
 * 搜索查询类型
 */
export enum SearchQueryType {
  KEYWORD = 'keyword',
  SEMANTIC = 'semantic',
  REGEX = 'regex',
  FUZZY = 'fuzzy',
  SYMBOL = 'symbol',
  HYBRID = 'hybrid',
}

/**
 * 搜索过滤器
 */
export interface SearchFilters {
  // 文件过滤
  filePatterns: string[];
  excludePatterns: string[];
  fileExtensions: string[];
  
  // 内容过滤
  languages: string[];
  symbols: string[];
  
  // 时间过滤
  modifiedAfter?: number;
  modifiedBefore?: number;
  
  // 大小过滤
  minSize?: number;
  maxSize?: number;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  maxResults: number;
  minScore: number;
  caseSensitive: boolean;
  wholeWord: boolean;
  includeContext: boolean;
  contextLines: number;
}

// ============================================================================
// 搜索结果
// ============================================================================

/**
 * 搜索结果
 */
export interface SearchResult {
  id: string;
  queryId: SearchQueryId;
  
  // 匹配信息
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  
  // 内容
  matchedText: string;
  context: string;
  
  // 分数
  score: number;
  matchType: MatchType;
  
  // 元数据
  metadata: SearchResultMetadata;
}

/**
 * 匹配类型
 */
export enum MatchType {
  EXACT = 'exact',
  FUZZY = 'fuzzy',
  SEMANTIC = 'semantic',
  REGEX = 'regex',
}

/**
 * 搜索结果元数据
 */
export interface SearchResultMetadata {
  fileSize: number;
  language: string;
  lastModified: number;
  symbolName?: string;
  symbolType?: string;
}

// ============================================================================
// 索引
// ============================================================================

/**
 * 文件索引
 */
export interface FileIndex {
  id: string;
  path: string;
  
  // 内容
  content: string;
  embedding?: number[];
  
  // 元数据
  size: number;
  lineCount: number;
  language: string;
  lastModified: number;
  
  // 符号
  symbols: SymbolIndex[];
  
  // 时间
  indexedAt: number;
}

/**
 * 符号索引
 */
export interface SymbolIndex {
  id: string;
  name: string;
  type: SymbolType;
  
  // 位置
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  
  // 签名
  signature?: string;
  documentation?: string;
}

/**
 * 符号类型
 */
export enum SymbolType {
  CLASS = 'class',
  INTERFACE = 'interface',
  FUNCTION = 'function',
  METHOD = 'method',
  VARIABLE = 'variable',
  CONSTANT = 'constant',
  PROPERTY = 'property',
  TYPE = 'type',
  ENUM = 'enum',
  MODULE = 'module',
}

// ============================================================================
// 搜索引擎配置
// ============================================================================

/**
 * 搜索引擎配置
 */
export interface SearchEngineConfig {
  id: SearchEngineId;
  
  // 索引配置
  indexing: IndexingConfig;
  
  // 搜索配置
  search: SearchConfig;
  
  // 并发配置
  concurrency: ConcurrencyConfig;
  
  // 缓存配置
  cache: CacheConfig;
}

/**
 * 索引配置
 */
export interface IndexingConfig {
  enabled: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number;
  generateEmbeddings: boolean;
  embeddingModel: string;
}

/**
 * 搜索配置
 */
export interface SearchConfig {
  defaultType: SearchQueryType;
  defaultMaxResults: number;
  defaultMinScore: number;
  contextLines: number;
}

/**
 * 并发配置
 */
export interface ConcurrencyConfig {
  maxConcurrentSearches: number;
  maxConcurrentIndexing: number;
  searchTimeout: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
}

// ============================================================================
// 事件
// ============================================================================

/**
 * 搜索引擎事件类型
 */
export enum SearchEngineEventType {
  STATE_CHANGED = 'search:state_changed',
  INDEXING_STARTED = 'search:indexing_started',
  INDEXING_COMPLETED = 'search:indexing_completed',
  SEARCH_STARTED = 'search:search_started',
  SEARCH_COMPLETED = 'search:search_completed',
  SEARCH_FAILED = 'search:search_failed',
  ERROR = 'search:error',
}

/**
 * 搜索引擎事件
 */
export interface SearchEngineEvent {
  type: SearchEngineEventType;
  engineId: SearchEngineId;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// 统计
// ============================================================================

/**
 * 搜索引擎统计
 */
export interface SearchEngineStats {
  // 索引统计
  filesIndexed: number;
  symbolsIndexed: number;
  indexSize: number;
  
  // 搜索统计
  searchesExecuted: number;
  averageSearchTime: number;
  totalResultsReturned: number;
  
  // 缓存统计
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  
  // 性能统计
  averageIndexingTime: number;
  lastIndexingTime: number;
}
