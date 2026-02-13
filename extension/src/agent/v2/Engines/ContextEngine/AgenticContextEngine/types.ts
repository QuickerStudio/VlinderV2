/**
 * @fileoverview Agentic Context Engine Types - 代理上下文引擎类型定义
 * 
 * Agentic Context Engine 是 ContextEngine 的主代理，
 * 负责上下文的全局领导人和管理，为 MainAgent 提供关键的有价值信息。
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// 标识符
// ============================================================================

export type ContextAgentId = string;
export type SearchTaskId = string;
export type ResearchTaskId = string;

// ============================================================================
// 上下文代理状态
// ============================================================================

/**
 * 上下文代理状态
 */
export enum ContextAgentState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  SEARCHING = 'searching',
  RESEARCHING = 'researching',
  SYNTHESIZING = 'synthesizing',
  REPORTING = 'reporting',
  ERROR = 'error',
}

/**
 * 子代理类型
 */
export enum SubAgentType {
  SEARCH = 'search',
  RESEARCH = 'research',
}

// ============================================================================
// 上下文信息
// ============================================================================

/**
 * 上下文信息 - 提供给 MainAgent 的关键信息
 */
export interface ContextInfo {
  id: string;
  type: ContextInfoType;
  
  // 内容
  title: string;
  summary: string;
  details: string;
  
  // 来源
  source: ContextInfoSource;
  confidence: number;
  
  // 相关性
  relevanceScore: number;
  importance: ContextImportance;
  
  // 时间戳
  timestamp: number;
  expiresAt?: number;
  
  // 元数据
  metadata: ContextInfoMetadata;
}

/**
 * 上下文信息类型
 */
export enum ContextInfoType {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  ERROR = 'error',
  SOLUTION = 'solution',
  PATTERN = 'pattern',
  DEPENDENCY = 'dependency',
  CONFIGURATION = 'configuration',
  API = 'api',
  TEST = 'test',
  REFACTORING = 'refactoring',
}

/**
 * 上下文信息来源
 */
export enum ContextInfoSource {
  SEARCH_AGENT = 'search_agent',
  RESEARCH_AGENT = 'research_agent',
  MEMORY = 'memory',
  CACHE = 'cache',
  EXTERNAL = 'external',
}

/**
 * 上下文重要性
 */
export enum ContextImportance {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * 上下文信息元数据
 */
export interface ContextInfoMetadata {
  filePath?: string;
  lineNumbers?: [number, number];
  language?: string;
  symbolName?: string;
  tags: string[];
  custom?: Record<string, unknown>;
}

// ============================================================================
// 搜索任务
// ============================================================================

/**
 * 搜索任务
 */
export interface SearchTask {
  id: SearchTaskId;
  query: string;
  type: SearchType;
  
  // 状态
  status: SearchTaskStatus;
  progress: number;
  
  // 结果
  results: SearchResult[];
  
  // 配置
  config: SearchConfig;
  
  // 时间
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * 搜索类型
 */
export enum SearchType {
  CODE = 'code',
  SYMBOL = 'symbol',
  TEXT = 'text',
  SEMANTIC = 'semantic',
  HYBRID = 'hybrid',
}

/**
 * 搜索任务状态
 */
export enum SearchTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 搜索结果
 */
export interface SearchResult {
  id: string;
  taskId: SearchTaskId;
  
  // 内容
  content: string;
  context: string;
  
  // 位置
  filePath: string;
  startLine: number;
  endLine: number;
  
  // 相关性
  score: number;
  matchType: 'exact' | 'fuzzy' | 'semantic';
  
  // 元数据
  metadata?: Record<string, unknown>;
}

/**
 * 搜索配置
 */
export interface SearchConfig {
  maxResults: number;
  minScore: number;
  includePatterns: string[];
  excludePatterns: string[];
  fileTypes: string[];
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

// ============================================================================
// 研究任务
// ============================================================================

/**
 * 研究任务
 */
export interface ResearchTask {
  id: ResearchTaskId;
  topic: string;
  questions: string[];
  
  // 状态
  status: ResearchTaskStatus;
  progress: number;
  
  // 结果
  findings: ResearchFinding[];
  synthesis?: ResearchSynthesis;
  
  // 配置
  config: ResearchConfig;
  
  // 时间
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * 研究任务状态
 */
export enum ResearchTaskStatus {
  PENDING = 'pending',
  GATHERING = 'gathering',
  ANALYZING = 'analyzing',
  SYNTHESIZING = 'synthesizing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 研究发现
 */
export interface ResearchFinding {
  id: string;
  taskId: ResearchTaskId;
  
  // 内容
  title: string;
  content: string;
  
  // 来源
  source: string;
  sourceType: 'code' | 'documentation' | 'web' | 'memory';
  
  // 相关性
  relevanceScore: number;
  confidence: number;
  
  // 元数据
  metadata?: Record<string, unknown>;
}

/**
 * 研究综合
 */
export interface ResearchSynthesis {
  taskId: ResearchTaskId;
  
  // 综合内容
  summary: string;
  keyPoints: string[];
  recommendations: string[];
  
  // 置信度
  overallConfidence: number;
  
  // 来源
  sourceCount: number;
  sources: string[];
}

/**
 * 研究配置
 */
export interface ResearchConfig {
  depth: 'shallow' | 'medium' | 'deep';
  breadth: number;
  timeout: number;
  includeWebSearch: boolean;
  includeCodeAnalysis: boolean;
  includeDocumentation: boolean;
}

// ============================================================================
// 代理配置
// ============================================================================

/**
 * 上下文代理配置
 */
export interface ContextAgentConfig {
  id: ContextAgentId;
  name: string;
  
  // 子代理配置
  searchAgent: SearchAgentConfig;
  researchAgent: ResearchAgentConfig;
  
  // 并发配置
  maxConcurrentSearches: number;
  maxConcurrentResearch: number;
  
  // 缓存配置
  cacheEnabled: boolean;
  cacheTTL: number;
  
  // 超时配置
  defaultTimeout: number;
  maxTimeout: number;
}

/**
 * 搜索代理配置
 */
export interface SearchAgentConfig {
  enabled: boolean;
  defaultSearchType: SearchType;
  maxResults: number;
  timeout: number;
}

/**
 * 研究代理配置
 */
export interface ResearchAgentConfig {
  enabled: boolean;
  defaultDepth: 'shallow' | 'medium' | 'deep';
  maxFindings: number;
  timeout: number;
}

// ============================================================================
// 请求和响应
// ============================================================================

/**
 * 上下文请求
 */
export interface ContextRequest {
  id: string;
  query: string;
  
  // 需求
  needs: ContextNeed[];
  
  // 优先级
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // 约束
  constraints: ContextConstraints;
  
  // 时间
  timeout?: number;
}

/**
 * 上下文需求
 */
export enum ContextNeed {
  CODE_CONTEXT = 'code_context',
  DEPENDENCIES = 'dependencies',
  PATTERNS = 'patterns',
  ERRORS = 'errors',
  SOLUTIONS = 'solutions',
  DOCUMENTATION = 'documentation',
  API_INFO = 'api_info',
  TEST_INFO = 'test_info',
}

/**
 * 上下文约束
 */
export interface ContextConstraints {
  maxResults: number;
  maxTokens: number;
  filePatterns: string[];
  excludePatterns: string[];
  languages: string[];
  recency: 'any' | 'recent' | 'today';
}

/**
 * 上下文响应
 */
export interface ContextResponse {
  requestId: string;
  
  // 信息
  info: ContextInfo[];
  
  // 统计
  stats: ContextResponseStats;
  
  // 时间
  duration: number;
  
  // 状态
  success: boolean;
  error?: string;
}

/**
 * 上下文响应统计
 */
export interface ContextResponseStats {
  totalResults: number;
  searchResults: number;
  researchResults: number;
  cacheHits: number;
  tokensUsed: number;
}

// ============================================================================
// 事件
// ============================================================================

/**
 * 上下文代理事件类型
 */
export enum ContextAgentEventType {
  STATE_CHANGED = 'context:state_changed',
  SEARCH_STARTED = 'context:search_started',
  SEARCH_COMPLETED = 'context:search_completed',
  RESEARCH_STARTED = 'context:research_started',
  RESEARCH_COMPLETED = 'context:research_completed',
  INFO_READY = 'context:info_ready',
  ERROR = 'context:error',
}

/**
 * 上下文代理事件
 */
export interface ContextAgentEvent {
  type: ContextAgentEventType;
  agentId: ContextAgentId;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// 统计
// ============================================================================

/**
 * 上下文代理统计
 */
export interface ContextAgentStats {
  // 任务统计
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  
  // 搜索统计
  searchTasksExecuted: number;
  averageSearchTime: number;
  
  // 研究统计
  researchTasksExecuted: number;
  averageResearchTime: number;
  
  // 缓存统计
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  
  // 性能统计
  averageResponseTime: number;
  totalTokensUsed: number;
}
