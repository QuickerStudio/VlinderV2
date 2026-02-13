/**
 * @fileoverview Memory Engine Types - 持久化记忆系统类型定义
 * 
 * 基于时间线的重要信息存入向量数据库ChromaDB的检索式记忆系统引擎
 * 
 * 设计参考:
 * - ChromaDB向量数据库
 * - Goose记忆系统
 * - Mem0记忆架构
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// 记忆标识符
// ============================================================================

export type MemoryId = string;
export type TimelineId = string;
export type EmbeddingVector = number[];

// ============================================================================
// 记忆类型枚举
// ============================================================================

/**
 * 记忆类型
 */
export enum MemoryType {
  EPISODIC = 'episodic',       // 情景记忆 - 特定事件和经历
  SEMANTIC = 'semantic',       // 语义记忆 - 事实和概念
  PROCEDURAL = 'procedural',   // 程序记忆 - 技能和流程
  WORKING = 'working',         // 工作记忆 - 当前任务上下文
  META = 'meta',               // 元记忆 - 关于记忆的记忆
}

/**
 * 记忆重要性级别
 */
export enum MemoryImportance {
  CRITICAL = 5,    // 关键信息，永不遗忘
  HIGH = 4,        // 高重要性
  MEDIUM = 3,      // 中等重要性
  LOW = 2,         // 低重要性
  TRIVIAL = 1,     // 琐碎信息
}

/**
 * 记忆来源
 */
export enum MemorySource {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
  TOOL = 'tool',
  EXTERNAL = 'external',
  INFERENCE = 'inference',  // 推理得出
}

/**
 * 记忆状态
 */
export enum MemoryState {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DECAYING = 'decaying',
  FORGOTTEN = 'forgotten',
  CONSOLIDATED = 'consolidated',  // 已整合
}

// ============================================================================
// 记忆条目
// ============================================================================

/**
 * 记忆条目 - 存储在向量数据库中的基本单元
 */
export interface MemoryEntry {
  // 基本标识
  id: MemoryId;
  type: MemoryType;
  source: MemorySource;
  
  // 内容
  content: string;
  embedding?: EmbeddingVector;
  
  // 元数据
  metadata: MemoryMetadata;
  
  // 时间信息
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  
  // 重要性
  importance: MemoryImportance;
  
  // 状态
  state: MemoryState;
  
  // 关联
  associations: MemoryAssociation[];
  
  // 时间线
  timelineId?: TimelineId;
}

/**
 * 记忆元数据
 */
export interface MemoryMetadata {
  // 来源信息
  sourceId?: string;
  sourceType?: string;
  
  // 上下文
  context?: string;
  sessionId?: string;
  taskId?: string;
  agentId?: string;
  
  // 标签
  tags: string[];
  categories: string[];
  
  // 置信度
  confidence: number;
  
  // 过期
  expiresAt?: number;
  
  // 自定义属性
  custom?: Record<string, unknown>;
}

/**
 * 记忆关联
 */
export interface MemoryAssociation {
  targetId: MemoryId;
  relationType: MemoryRelationType;
  strength: number;  // 0-1
  createdAt: number;
}

/**
 * 记忆关系类型
 */
export enum MemoryRelationType {
  CAUSES = 'causes',
  ENABLES = 'enables',
  FOLLOWS = 'follows',
  PRECEDES = 'precedes',
  SIMILAR_TO = 'similar_to',
  CONTRADICTS = 'contradicts',
  SUPPORTS = 'supports',
  EXTENDS = 'extends',
  REFERENCES = 'references',
}

// ============================================================================
// 时间线
// ============================================================================

/**
 * 时间线条目
 */
export interface TimelineEntry {
  id: TimelineId;
  timestamp: number;
  endTime?: number;
  
  // 事件信息
  eventType: TimelineEventType;
  title: string;
  description: string;
  
  // 关联记忆
  memoryIds: MemoryId[];
  
  // 上下文
  context: TimelineContext;
  
  // 重要性
  importance: MemoryImportance;
  
  // 标签
  tags: string[];
}

/**
 * 时间线事件类型
 */
export enum TimelineEventType {
  TASK_START = 'task_start',
  TASK_PROGRESS = 'task_progress',
  TASK_COMPLETE = 'task_complete',
  TASK_FAILURE = 'task_failure',
  
  DECISION = 'decision',
  ACTION = 'action',
  OBSERVATION = 'observation',
  
  ERROR = 'error',
  RECOVERY = 'recovery',
  
  LEARNING = 'learning',
  INSIGHT = 'insight',
  
  USER_INTERACTION = 'user_interaction',
  AGENT_HANDOFF = 'agent_handoff',
  
  MILESTONE = 'milestone',
  CHECKPOINT = 'checkpoint',
}

/**
 * 时间线上下文
 */
export interface TimelineContext {
  sessionId: string;
  taskId?: string;
  agentId?: string;
  parentTimelineId?: TimelineId;
  
  // 环境信息
  workingDirectory?: string;
  gitBranch?: string;
  projectType?: string;
  
  // 状态快照
  stateSnapshot?: Record<string, unknown>;
}

// ============================================================================
// 查询接口
// ============================================================================

/**
 * 记忆查询
 */
export interface MemoryQuery {
  // 查询内容
  query: string;
  queryEmbedding?: EmbeddingVector;
  
  // 过滤条件
  filters?: MemoryFilter;
  
  // 检索参数
  topK: number;
  minSimilarity?: number;
  includeEmbeddings?: boolean;
  
  // 时间范围
  timeRange?: {
    start: number;
    end: number;
  };
  
  // 排序
  sortBy?: 'relevance' | 'timestamp' | 'importance' | 'accessCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 记忆过滤器
 */
export interface MemoryFilter {
  types?: MemoryType[];
  sources?: MemorySource[];
  states?: MemoryState[];
  importance?: {
    min?: MemoryImportance;
    max?: MemoryImportance;
  };
  tags?: string[];
  categories?: string[];
  sessionId?: string;
  taskId?: string;
  agentId?: string;
  custom?: Record<string, unknown>;
}

/**
 * 查询结果
 */
export interface MemoryQueryResult {
  memories: MemoryEntry[];
  total: number;
  queryTime: number;
  
  // 相似度分数
  scores?: number[];
}

// ============================================================================
// 记忆配置
// ============================================================================

/**
 * 记忆引擎配置
 */
export interface MemoryEngineConfig {
  // 向量数据库配置
  vectorDb: VectorDbConfig;
  
  // 嵌入配置
  embedding: EmbeddingConfig;
  
  // 存储配置
  storage: MemoryStorageConfig;
  
  // 检索配置
  retrieval: RetrievalConfig;
  
  // 整合配置
  consolidation: ConsolidationConfig;
  
  // 遗忘配置
  forgetting: ForgettingConfig;
}

/**
 * 向量数据库配置
 */
export interface VectorDbConfig {
  provider: 'chromadb' | 'pinecone' | 'weaviate' | 'milvus' | 'local';
  
  // ChromaDB配置
  chromadb?: {
    host: string;
    port: number;
    collectionName: string;
    persistDirectory?: string;
  };
  
  // 连接配置
  connectionTimeout?: number;
  requestTimeout?: number;
}

/**
 * 嵌入配置
 */
export interface EmbeddingConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  model: string;
  dimension: number;
  
  // 批处理
  batchSize: number;
  
  // 缓存
  cacheEnabled: boolean;
  cacheSize?: number;
}

/**
 * 存储配置
 */
export interface MemoryStorageConfig {
  // 容量限制
  maxMemories: number;
  maxWorkingMemory: number;
  
  // 持久化
  persistenceEnabled: boolean;
  persistencePath?: string;
  autoSaveInterval?: number;
  
  // 压缩
  compressionEnabled: boolean;
  compressionThreshold?: number;
}

/**
 * 检索配置
 */
export interface RetrievalConfig {
  // 默认参数
  defaultTopK: number;
  defaultMinSimilarity: number;
  
  // 混合检索
  hybridSearchEnabled: boolean;
  keywordWeight?: number;
  semanticWeight?: number;
  
  // 重排序
  rerankingEnabled: boolean;
  rerankingModel?: string;
}

/**
 * 整合配置
 */
export interface ConsolidationConfig {
  enabled: boolean;
  interval: number;
  
  // 整合策略
  strategy: 'time_based' | 'importance_based' | 'similarity_based' | 'hybrid';
  
  // 聚类参数
  clusteringThreshold: number;
  minClusterSize: number;
}

/**
 * 遗忘配置
 */
export interface ForgettingConfig {
  enabled: boolean;
  
  // 衰减参数
  decayRate: number;
  minImportanceThreshold: number;
  
  // 清理间隔
  cleanupInterval: number;
  
  // 保护规则
  protectedTypes?: MemoryType[];
  protectedTags?: string[];
}

// ============================================================================
// 记忆操作接口
// ============================================================================

/**
 * 记忆操作结果
 */
export interface MemoryOperationResult {
  success: boolean;
  memoryId?: MemoryId;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

// ============================================================================
// 记忆统计
// ============================================================================

/**
 * 记忆统计信息
 */
export interface MemoryStats {
  // 总量
  totalMemories: number;
  memoriesByType: Record<MemoryType, number>;
  memoriesBySource: Record<MemorySource, number>;
  memoriesByState: Record<MemoryState, number>;
  
  // 时间线
  timelineEntries: number;
  
  // 存储
  storageSize: number;
  vectorDbSize: number;
  
  // 性能
  averageQueryTime: number;
  cacheHitRate: number;
  
  // 整合
  lastConsolidation?: number;
  consolidatedMemories: number;
}

// ============================================================================
// 事件类型
// ============================================================================

/**
 * 记忆引擎事件类型
 */
export type MemoryEngineEventType =
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:updated'
  | 'memory:deleted'
  | 'memory:consolidated'
  | 'memory:forgotten'
  | 'timeline:entry_added'
  | 'timeline:updated'
  | 'engine:initialized'
  | 'engine:error';

/**
 * 记忆引擎事件
 */
export interface MemoryEngineEvent {
  type: MemoryEngineEventType;
  timestamp: number;
  payload: unknown;
  metadata?: Record<string, unknown>;
}
