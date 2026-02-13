/**
 * @fileoverview Agentic Research Engine Types - 代理研究引擎类型定义
 * 
 * 异步并发研究引擎，为 AgenticContextEngine 提供深度研究功能
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// 标识符
// ============================================================================

export type ResearchEngineId = string;
export type ResearchTaskId = string;

// ============================================================================
// 研究引擎状态
// ============================================================================

/**
 * 研究引擎状态
 */
export enum ResearchEngineState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  GATHERING = 'gathering',
  ANALYZING = 'analyzing',
  SYNTHESIZING = 'synthesizing',
  ERROR = 'error',
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
  
  // 配置
  config: ResearchTaskConfig;
  
  // 结果
  findings: ResearchFinding[];
  synthesis?: ResearchSynthesis;
  
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
  CANCELLED = 'cancelled',
}

/**
 * 研究任务配置
 */
export interface ResearchTaskConfig {
  depth: ResearchDepth;
  breadth: number;
  timeout: number;
  
  // 来源配置
  sources: ResearchSource[];
  
  // 过滤
  filters: ResearchFilters;
}

/**
 * 研究深度
 */
export enum ResearchDepth {
  SHALLOW = 'shallow',
  MEDIUM = 'medium',
  DEEP = 'deep',
}

/**
 * 研究来源
 */
export enum ResearchSource {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  WEB = 'web',
  MEMORY = 'memory',
  EXTERNAL = 'external',
}

/**
 * 研究过滤器
 */
export interface ResearchFilters {
  minRelevance: number;
  minConfidence: number;
  maxAge?: number;
  languages: string[];
  tags: string[];
}

// ============================================================================
// 研究发现
// ============================================================================

/**
 * 研究发现
 */
export interface ResearchFinding {
  id: string;
  taskId: ResearchTaskId;
  
  // 内容
  title: string;
  summary: string;
  content: string;
  
  // 来源
  source: ResearchSource;
  sourceUrl?: string;
  sourcePath?: string;
  
  // 相关性
  relevanceScore: number;
  confidence: number;
  
  // 元数据
  metadata: ResearchFindingMetadata;
  
  // 时间
  discoveredAt: number;
}

/**
 * 研究发现元数据
 */
export interface ResearchFindingMetadata {
  author?: string;
  date?: string;
  tags: string[];
  relatedFindings: string[];
  custom?: Record<string, unknown>;
}

// ============================================================================
// 研究综合
// ============================================================================

/**
 * 研究综合
 */
export interface ResearchSynthesis {
  taskId: ResearchTaskId;
  
  // 综合内容
  summary: string;
  keyPoints: string[];
  insights: ResearchInsight[];
  recommendations: string[];
  
  // 置信度
  overallConfidence: number;
  
  // 来源
  sourceCount: number;
  sources: string[];
  
  // 时间
  synthesizedAt: number;
}

/**
 * 研究洞察
 */
export interface ResearchInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  
  // 支持
  supportingEvidence: string[];
  confidence: number;
}

/**
 * 洞察类型
 */
export enum InsightType {
  PATTERN = 'pattern',
  TREND = 'trend',
  ANOMALY = 'anomaly',
  RELATIONSHIP = 'relationship',
  PREDICTION = 'prediction',
  RECOMMENDATION = 'recommendation',
}

// ============================================================================
// 研究引擎配置
// ============================================================================

/**
 * 研究引擎配置
 */
export interface ResearchEngineConfig {
  id: ResearchEngineId;
  
  // 任务配置
  tasks: ResearchTaskSettings;
  
  // 来源配置
  sources: ResearchSourceSettings;
  
  // 并发配置
  concurrency: ResearchConcurrencyConfig;
  
  // 缓存配置
  cache: ResearchCacheConfig;
}

/**
 * 研究任务设置
 */
export interface ResearchTaskSettings {
  defaultDepth: ResearchDepth;
  defaultBreadth: number;
  defaultTimeout: number;
  maxFindings: number;
}

/**
 * 研究来源设置
 */
export interface ResearchSourceSettings {
  enabledSources: ResearchSource[];
  codeSource: CodeSourceSettings;
  webSource: WebSourceSettings;
  memorySource: MemorySourceSettings;
}

/**
 * 代码来源设置
 */
export interface CodeSourceSettings {
  enabled: boolean;
  includePatterns: string[];
  excludePatterns: string[];
}

/**
 * Web来源设置
 */
export interface WebSourceSettings {
  enabled: boolean;
  searchEngine: string;
  maxResults: number;
}

/**
 * 记忆来源设置
 */
export interface MemorySourceSettings {
  enabled: boolean;
  maxMemories: number;
  minRelevance: number;
}

/**
 * 研究并发配置
 */
export interface ResearchConcurrencyConfig {
  maxConcurrentTasks: number;
  maxConcurrentSources: number;
  taskTimeout: number;
}

/**
 * 研究缓存配置
 */
export interface ResearchCacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
}

// ============================================================================
// 事件
// ============================================================================

/**
 * 研究引擎事件类型
 */
export enum ResearchEngineEventType {
  STATE_CHANGED = 'research:state_changed',
  TASK_STARTED = 'research:task_started',
  TASK_PROGRESS = 'research:task_progress',
  TASK_COMPLETED = 'research:task_completed',
  TASK_FAILED = 'research:task_failed',
  FINDING_DISCOVERED = 'research:finding_discovered',
  SYNTHESIS_READY = 'research:synthesis_ready',
  ERROR = 'research:error',
}

/**
 * 研究引擎事件
 */
export interface ResearchEngineEvent {
  type: ResearchEngineEventType;
  engineId: ResearchEngineId;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// 统计
// ============================================================================

/**
 * 研究引擎统计
 */
export interface ResearchEngineStats {
  // 任务统计
  tasksExecuted: number;
  tasksCompleted: number;
  tasksFailed: number;
  averageTaskTime: number;
  
  // 发现统计
  totalFindings: number;
  averageFindingsPerTask: number;
  
  // 来源统计
  sourcesQueried: number;
  sourceSuccessRate: number;
  
  // 缓存统计
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  
  // 性能统计
  averageGatheringTime: number;
  averageAnalysisTime: number;
  averageSynthesisTime: number;
}
