/**
 * @fileoverview ContextEngine Types - 上下文管理引擎类型定义
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

import { z } from 'zod';

// ============================================================================
// Identifiers
// ============================================================================

export type ContextId = string;
export type FileId = string;
export type SymbolId = string;
export type IndexId = string;

// ============================================================================
// File Context Types
// ============================================================================

/**
 * File context
 */
export interface FileContext {
  id: FileId;
  path: string;
  content: string;
  language: string;
  
  // Metadata
  size: number;
  lineCount: number;
  lastModified: number;
  
  // Indexing
  embedding?: number[];
  symbols: SymbolInfo[];
  imports: string[];
  exports: string[];
  
  // Relevance
  relevanceScore: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Symbol information
 */
export interface SymbolInfo {
  id: SymbolId;
  name: string;
  kind: SymbolKind;
  location: Location;
  signature?: string;
  documentation?: string;
  
  // Relationships
  references: SymbolId[];
  definitions: SymbolId[];
}

/**
 * Symbol kinds
 */
export enum SymbolKind {
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
  NAMESPACE = 'namespace',
  FILE = 'file',
}

/**
 * Location in file
 */
export interface Location {
  fileId: FileId;
  path: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

// ============================================================================
// Context Window Types
// ============================================================================

/**
 * Context window configuration
 */
export interface ContextWindow {
  maxTokens: number;
  reservedTokens: number;
  availableTokens: number;
  
  // Content
  systemPrompt: string;
  files: FileContext[];
  symbols: SymbolInfo[];
  snippets: CodeSnippet[];
  
  // Priority
  priorityQueue: ContextPriority[];
  
  // Statistics
  totalTokens: number;
  utilization: number;
}

/**
 * Context priority
 */
export interface ContextPriority {
  id: string;
  type: 'file' | 'symbol' | 'snippet' | 'memory';
  priority: number;
  tokens: number;
  lastAccessed: number;
}

/**
 * Code snippet
 */
export interface CodeSnippet {
  id: string;
  content: string;
  language: string;
  path?: string;
  startLine?: number;
  endLine?: number;
  
  // Relevance
  relevanceScore: number;
  tokens: number;
}

// ============================================================================
// Repository Index Types
// ============================================================================

/**
 * Repository index
 */
export interface RepositoryIndex {
  id: IndexId;
  rootPath: string;
  
  // Files
  files: Map<FileId, FileContext>;
  fileCount: number;
  totalSize: number;
  
  // Symbols
  symbols: Map<SymbolId, SymbolInfo>;
  symbolCount: number;
  
  // Indexes
  nameIndex: Map<string, SymbolId[]>;  // name -> symbols
  pathIndex: Map<string, FileId>;      // path -> file
  importIndex: Map<string, FileId[]>;  // import -> files
  
  // Embeddings
  embeddings: Map<string, number[]>;   // id -> embedding
  
  // Metadata
  indexedAt: number;
  lastUpdated: number;
  version: string;
}

/**
 * Index configuration
 */
export interface IndexConfig {
  // File filtering
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number;
  
  // Symbol extraction
  extractSymbols: boolean;
  extractImports: boolean;
  extractExports: boolean;
  
  // Embedding
  generateEmbeddings: boolean;
  embeddingModel: string;
  embeddingBatchSize: number;
  
  // Performance
  parallelIndexing: boolean;
  maxWorkers: number;
  cacheEnabled: boolean;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search query
 */
export interface SearchQuery {
  query: string;
  type: SearchType;
  
  // Filters
  filters?: SearchFilter;
  
  // Options
  topK: number;
  minScore: number;
  includeContent: boolean;
  includeEmbeddings: boolean;
}

/**
 * Search type
 */
export enum SearchType {
  SEMANTIC = 'semantic',     // Vector similarity search
  KEYWORD = 'keyword',       // Keyword matching
  SYMBOL = 'symbol',         // Symbol search
  REGEX = 'regex',           // Regular expression
  FUZZY = 'fuzzy',           // Fuzzy matching
  HYBRID = 'hybrid',         // Combined search
}

/**
 * Search filter
 */
export interface SearchFilter {
  // File filters
  filePatterns?: string[];
  languages?: string[];
  maxFileSize?: number;
  
  // Symbol filters
  symbolKinds?: SymbolKind[];
  symbolNames?: string[];
  
  // Time filters
  modifiedAfter?: number;
  modifiedBefore?: number;
  
  // Path filters
  paths?: string[];
  excludePaths?: string[];
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  type: 'file' | 'symbol' | 'snippet';
  score: number;
  
  // Content
  content?: string;
  location?: Location;
  symbol?: SymbolInfo;
  file?: FileContext;
  
  // Highlights
  highlights?: SearchHighlight[];
}

/**
 * Search highlight
 */
export interface SearchHighlight {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
}

// ============================================================================
// Context Management Types
// ============================================================================

/**
 * Context manager configuration
 */
export interface ContextManagerConfig {
  // Window configuration
  window: ContextWindowConfig;
  
  // Indexing configuration
  indexing: IndexConfig;
  
  // Search configuration
  search: SearchConfig;
  
  // Compression configuration
  compression: CompressionConfig;
  
  // Performance configuration
  performance: ContextPerformanceConfig;
}

/**
 * Context window configuration
 */
export interface ContextWindowConfig {
  maxTokens: number;
  reservedTokens: number;
  systemPromptTokens: number;
  
  // Prioritization
  prioritizationStrategy: 'recency' | 'relevance' | 'hybrid';
  relevanceDecay: number;
  
  // Compression
  autoCompress: boolean;
  compressionThreshold: number;
  compressionRatio: number;
}

/**
 * Search configuration
 */
export interface SearchConfig {
  defaultType: SearchType;
  defaultTopK: number;
  cacheResults: boolean;
  cacheSize: number;
  cacheTTL: number;
}

/**
 * Compression configuration
 */
export interface CompressionConfig {
  enabled: boolean;
  strategy: 'summarize' | 'extract' | 'truncate';
  maxSnippetLength: number;
  preserveImports: boolean;
  preserveExports: boolean;
  preserveSignatures: boolean;
}

/**
 * Context performance configuration
 */
export interface ContextPerformanceConfig {
  maxConcurrentSearches: number;
  indexUpdateInterval: number;
  watchForChanges: boolean;
  incrementalIndexing: boolean;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Context event types
 */
export enum ContextEventType {
  FILE_INDEXED = 'context:file_indexed',
  FILE_REMOVED = 'context:file_removed',
  INDEX_UPDATED = 'context:index_updated',
  CONTEXT_ADDED = 'context:context_added',
  CONTEXT_REMOVED = 'context:context_removed',
  CONTEXT_COMPRESSED = 'context:context_compressed',
  SEARCH_COMPLETED = 'context:search_completed',
}

/**
 * Context event
 */
export interface ContextEvent {
  type: ContextEventType;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Context engine statistics
 */
export interface ContextEngineStatistics {
  // Index stats
  totalFiles: number;
  totalSymbols: number;
  totalSize: number;
  indexSize: number;
  
  // Window stats
  windowUtilization: number;
  averageTokensPerFile: number;
  compressionRatio: number;
  
  // Search stats
  totalSearches: number;
  averageSearchTime: number;
  cacheHitRate: number;
  
  // Performance stats
  indexingTime: number;
  lastIndexUpdate: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const FileContextSchema = z.object({
  id: z.string(),
  path: z.string(),
  content: z.string(),
  language: z.string(),
  size: z.number(),
  lineCount: z.number(),
  relevanceScore: z.number(),
});

export const SearchQuerySchema = z.object({
  query: z.string(),
  type: z.nativeEnum(SearchType),
  topK: z.number().min(1).max(100).default(10),
  minScore: z.number().min(0).max(1).default(0.5),
  includeContent: z.boolean().default(true),
});

// ============================================================================
// Context Priority Level
// ============================================================================

/**
 * Context priority level for ranking
 */
export enum ContextPriorityLevel {
  CRITICAL = 100,
  HIGH = 75,
  NORMAL = 50,
  LOW = 25,
  BACKGROUND = 10,
}
