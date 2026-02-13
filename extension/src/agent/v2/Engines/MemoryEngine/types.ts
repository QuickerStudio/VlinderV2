/**
 * @fileoverview MemoryEngine Types - 持久化记忆系统类型定义
 * 
 * 基于时间线的重要信息存入向量数据库ChromaDB的检索式记忆系统引擎
 * 
 * Features:
 * - Timeline-based memory storage
 * - ChromaDB vector database integration
 * - Importance-based retention
 * - Semantic search with embeddings
 * - Memory consolidation and pruning
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// Memory Identifiers
// ============================================================================

export type MemoryId = string;
export type TimelineId = string;
export type EmbeddingVector = number[];

// ============================================================================
// Memory Entry Types
// ============================================================================

/**
 * Memory importance levels
 */
export enum MemoryImportance {
  CRITICAL = 1.0,   // Never forget
  HIGH = 0.8,       // Long-term retention
  MEDIUM = 0.5,     // Standard retention
  LOW = 0.3,        // Short-term retention
  EPHEMERAL = 0.1   // Temporary, quick decay
}

/**
 * Memory source types
 */
export enum MemorySource {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
  TOOL = 'tool',
  EXTERNAL = 'external'
}

/**
 * Memory content types
 */
export enum MemoryContentType {
  CONVERSATION = 'conversation',
  CODE = 'code',
  FILE = 'file',
  ERROR = 'error',
  DECISION = 'decision',
  LEARNING = 'learning',
  PREFERENCE = 'preference',
  CONTEXT = 'context',
  INSTRUCTION = 'instruction',
  FEEDBACK = 'feedback'
}

/**
 * Memory entry - Core memory unit
 */
export interface MemoryEntry {
  id: MemoryId;
  
  // Content
  content: string;
  contentType: MemoryContentType;
  
  // Embedding for semantic search
  embedding?: EmbeddingVector;
  embeddingModel?: string;
  
  // Metadata
  metadata: MemoryMetadata;
  
  // Timeline
  timeline: TimelineInfo;
  
  // Importance and retention
  importance: number;
  decayRate: number;
  accessCount: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  expiresAt?: number;
  
  // Relationships
  parentMemoryId?: MemoryId;
  relatedMemoryIds?: MemoryId[];
  
  // Tags for categorization
  tags: string[];
}

/**
 * Memory metadata
 */
export interface MemoryMetadata {
  source: MemorySource;
  sessionId?: string;
  taskId?: string;
  agentId?: string;
  toolName?: string;
  filePath?: string;
  language?: string;
  confidence: number;
  verified: boolean;
  custom?: Record<string, unknown>;
}

/**
 * Timeline information
 */
export interface TimelineInfo {
  timelineId: TimelineId;
  timestamp: number;
  sequence: number;
  epoch?: string;  // e.g., "session_1", "task_5"
  phase?: string;  // e.g., "planning", "execution", "review"
}

// ============================================================================
// Timeline Types
// ============================================================================

/**
 * Timeline epoch - A significant period in the timeline
 */
export interface TimelineEpoch {
  id: TimelineId;
  name: string;
  description?: string;
  startTime: number;
  endTime?: number;
  parentEpochId?: TimelineId;
  
  // Statistics
  memoryCount: number;
  importantMemoryCount: number;
  
  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Timeline event - A significant event in the timeline
 */
export interface TimelineEvent {
  id: string;
  timelineId: TimelineId;
  type: TimelineEventType;
  timestamp: number;
  description: string;
  relatedMemoryIds: MemoryId[];
  metadata?: Record<string, unknown>;
}

/**
 * Timeline event types
 */
export enum TimelineEventType {
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  TASK_START = 'task_start',
  TASK_COMPLETE = 'task_complete',
  TASK_FAIL = 'task_fail',
  DECISION = 'decision',
  ERROR = 'error',
  LEARNING = 'learning',
  HANDOFF = 'handoff',
  MILESTONE = 'milestone'
}

// ============================================================================
// Memory Query Types
// ============================================================================

/**
 * Memory query options
 */
export interface MemoryQuery {
  // Query content
  query: string;
  queryEmbedding?: EmbeddingVector;
  
  // Search parameters
  topK: number;
  minSimilarity?: number;
  minImportance?: number;
  
  // Filters
  filter?: MemoryFilter;
  
  // Options
  includeEmbeddings?: boolean;
  includeContent?: boolean;
  sortBy?: 'relevance' | 'importance' | 'recency';
}

/**
 * Memory filter for queries
 */
export interface MemoryFilter {
  // Content filters
  contentTypes?: MemoryContentType[];
  sources?: MemorySource[];
  
  // Time filters
  timeRange?: {
    start: number;
    end: number;
  };
  
  // Tag filters
  tags?: string[];
  tagMatch?: 'any' | 'all';
  
  // Importance filter
  importanceRange?: {
    min: number;
    max: number;
  };
  
  // Timeline filter
  timelineIds?: TimelineId[];
  epochs?: string[];
  
  // Relationship filters
  parentMemoryId?: MemoryId;
  relatedToMemoryId?: MemoryId;
  
  // Custom filters
  custom?: Record<string, unknown>;
}

/**
 * Memory query result
 */
export interface MemoryQueryResult {
  memories: MemoryEntry[];
  total: number;
  queryTime: number;
  similarities?: number[];
}

// ============================================================================
// ChromaDB Integration Types
// ============================================================================

/**
 * ChromaDB collection configuration
 */
export interface ChromaDBConfig {
  host: string;
  port: number;
  collectionName: string;
  embeddingFunction?: string;
  distanceFunction?: 'cosine' | 'l2' | 'ip';
  metadata?: Record<string, unknown>;
}

/**
 * ChromaDB document for storage
 */
export interface ChromaDocument {
  id: string;
  embedding: EmbeddingVector;
  metadata: Record<string, unknown>;
  document: string;
}

/**
 * ChromaDB query result
 */
export interface ChromaQueryResult {
  ids: string[][];
  embeddings?: EmbeddingVector[][];
  documents: string[][];
  metadatas: Record<string, unknown>[][];
  distances: number[][];
}

// ============================================================================
// Memory Engine Configuration
// ============================================================================

/**
 * Memory engine configuration
 */
export interface MemoryEngineConfig {
  // Storage configuration
  storage: MemoryStorageConfig;
  
  // ChromaDB configuration
  chromadb: ChromaDBConfig;
  
  // Embedding configuration
  embedding: EmbeddingConfig;
  
  // Retention configuration
  retention: RetentionConfig;
  
  // Timeline configuration
  timeline: TimelineConfig;
  
  // Performance configuration
  performance: MemoryPerformanceConfig;
}

/**
 * Memory storage configuration
 */
export interface MemoryStorageConfig {
  // Capacity limits
  maxShortTermMemories: number;
  maxLongTermMemories: number;
  maxTotalMemories: number;
  
  // Persistence
  persistenceEnabled: boolean;
  persistencePath?: string;
  autoSaveInterval: number;
  
  // Compression
  compressionEnabled: boolean;
  compressionThreshold: number;
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  model: string;
  dimension: number;
  batchSize: number;
  cacheEnabled: boolean;
  cacheSize: number;
}

/**
 * Retention configuration
 */
export interface RetentionConfig {
  // Decay settings
  defaultDecayRate: number;
  importanceBoostOnAccess: number;
  
  // Consolidation
  consolidationEnabled: boolean;
  consolidationInterval: number;
  consolidationThreshold: number;
  
  // Pruning
  pruningEnabled: boolean;
  pruningInterval: number;
  pruningThreshold: number;
  
  // Archive
  archiveEnabled: boolean;
  archiveAge: number;
}

/**
 * Timeline configuration
 */
export interface TimelineConfig {
  enabled: boolean;
  autoEpochDetection: boolean;
  maxEpochs: number;
  eventCaptureEnabled: boolean;
}

/**
 * Memory performance configuration
 */
export interface MemoryPerformanceConfig {
  // Caching
  queryCacheEnabled: boolean;
  queryCacheSize: number;
  queryCacheTTL: number;
  
  // Indexing
  indexEnabled: boolean;
  indexUpdateInterval: number;
  
  // Parallel processing
  maxConcurrentQueries: number;
  maxConcurrentEmbeddings: number;
}

// ============================================================================
// Memory Operations
// ============================================================================

/**
 * Memory store operation
 */
export interface MemoryStoreOperation {
  entry: Partial<MemoryEntry>;
  options?: {
    generateEmbedding?: boolean;
    calculateImportance?: boolean;
    linkToTimeline?: boolean;
    detectEpoch?: boolean;
  };
}

/**
 * Memory consolidation result
 */
export interface MemoryConsolidationResult {
  consolidated: number;
  archived: number;
  pruned: number;
  summary?: string;
}

/**
 * Memory statistics
 */
export interface MemoryStatistics {
  totalMemories: number;
  shortTermMemories: number;
  longTermMemories: number;
  
  averageImportance: number;
  averageAccessCount: number;
  
  memoriesByType: Record<MemoryContentType, number>;
  memoriesBySource: Record<MemorySource, number>;
  
  oldestMemory: number;
  newestMemory: number;
  
  totalEmbeddings: number;
  embeddingDimension: number;
  
  timelineStats: {
    totalEpochs: number;
    totalEvents: number;
    currentEpoch?: TimelineEpoch;
  };
  
  storageStats: {
    usedBytes: number;
    indexSize: number;
    cacheHitRate: number;
  };
}

// ============================================================================
// Memory Events
// ============================================================================

/**
 * Memory event types
 */
export enum MemoryEventType {
  STORED = 'memory:stored',
  RETRIEVED = 'memory:retrieved',
  UPDATED = 'memory:updated',
  DELETED = 'memory:deleted',
  CONSOLIDATED = 'memory:consolidated',
  PRUNED = 'memory:pruned',
  ARCHIVED = 'memory:archived',
  EPOCH_STARTED = 'memory:epoch_started',
  EPOCH_ENDED = 'memory:epoch_end',
  EVENT_CAPTURED = 'memory:event_captured'
}

/**
 * Memory event
 */
export interface MemoryEvent {
  type: MemoryEventType;
  memoryId?: MemoryId;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const MemoryEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  contentType: z.nativeEnum(MemoryContentType),
  embedding: z.array(z.number()).optional(),
  metadata: z.object({
    source: z.nativeEnum(MemorySource),
    sessionId: z.string().optional(),
    taskId: z.string().optional(),
    agentId: z.string().optional(),
    confidence: z.number().min(0).max(1),
    verified: z.boolean(),
  }),
  importance: z.number().min(0).max(1),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastAccessedAt: z.number(),
  tags: z.array(z.string()),
});

export const MemoryQuerySchema = z.object({
  query: z.string(),
  topK: z.number().min(1).max(100).default(10),
  minSimilarity: z.number().min(0).max(1).optional(),
  minImportance: z.number().min(0).max(1).optional(),
  filter: z.object({
    contentTypes: z.array(z.nativeEnum(MemoryContentType)).optional(),
    sources: z.array(z.nativeEnum(MemorySource)).optional(),
    timeRange: z.object({
      start: z.number(),
      end: z.number(),
    }).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});
