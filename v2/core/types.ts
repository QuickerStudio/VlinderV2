/**
 * @fileoverview V2 Agent Core Types - 2026 Advanced Agent Architecture
 * 
 * This module defines the core types for the next-generation Agent system,
 * incorporating the latest advances in multi-agent orchestration, memory systems,
 * and asynchronous concurrent scheduling.
 * 
 * Key Features:
 * - Agent Swarm orchestration
 * - Multi-threaded async concurrent scheduling
 * - Modular engine architecture with Shared middleware
 * - Router-based communication
 * 
 * @version 2.0.0
 * @author Vlinder Team
 */

import { EventEmitter } from 'events';

// ============================================================================
// Core Agent Types
// ============================================================================

/**
 * Unique identifier for agents, tasks, and messages
 */
export type AgentId = string;
export type TaskId = string;
export type MessageId = string;
export type SessionId = string;

/**
 * Agent capability definition
 */
export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

/**
 * Agent state enumeration
 */
export enum AgentState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  BACKGROUND = 4
}

/**
 * Message types for inter-agent communication
 */
export enum MessageType {
  TASK = 'task',
  RESULT = 'result',
  ERROR = 'error',
  CONTROL = 'control',
  HEARTBEAT = 'heartbeat',
  SYNC = 'sync',
  BROADCAST = 'broadcast'
}

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * Base agent configuration
 */
export interface AgentConfig {
  id: AgentId;
  name: string;
  description?: string;
  version: string;
  capabilities: AgentCapability[];
  maxConcurrentTasks: number;
  timeout: number;
  retryPolicy: RetryPolicy;
  memoryConfig?: MemoryConfig;
  thinkingConfig?: ThinkingConfig;
  contextConfig?: ContextConfig;
}

/**
 * Swarm agent configuration
 */
export interface SwarmConfig extends AgentConfig {
  agents: AgentConfig[];
  orchestrationStrategy: OrchestrationStrategy;
  loadBalancing: LoadBalancingConfig;
  faultTolerance: FaultToleranceConfig;
}

/**
 * Orchestration strategies for agent swarms
 */
export enum OrchestrationStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  PIPELINE = 'pipeline',
  HIERARCHICAL = 'hierarchical',
  ADAPTIVE = 'adaptive',
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  CAPABILITY_BASED = 'capability_based'
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  strategy: 'round_robin' | 'least_loaded' | 'weighted' | 'adaptive';
  healthCheckIntervalMs: number;
  unhealthyThreshold: number;
  weights?: Record<AgentId, number>;
}

/**
 * Fault tolerance configuration
 */
export interface FaultToleranceConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  circuitBreaker: CircuitBreakerConfig;
  fallbackAgent?: AgentId;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxCalls: number;
}

// ============================================================================
// Memory Engine Types
// ============================================================================

/**
 * Memory configuration
 */
export interface MemoryConfig {
  shortTermCapacity: number;
  longTermCapacity: number;
  embeddingDimension: number;
  similarityThreshold: number;
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
  persistencePath?: string;
}

/**
 * Memory entry types
 */
export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  importance: number;
}

/**
 * Memory metadata
 */
export interface MemoryMetadata {
  source: 'user' | 'agent' | 'system' | 'external';
  type: 'fact' | 'preference' | 'context' | 'instruction' | 'experience';
  tags: string[];
  confidence: number;
  expiresAt?: number;
}

/**
 * Memory query options
 */
export interface MemoryQuery {
  query: string;
  queryEmbedding?: number[];
  topK: number;
  minSimilarity?: number;
  filter?: MemoryFilter;
  includeEmbeddings?: boolean;
}

/**
 * Memory filter for queries
 */
export interface MemoryFilter {
  source?: MemoryMetadata['source'][];
  type?: MemoryMetadata['type'][];
  tags?: string[];
  timeRange?: {
    start: number;
    end: number;
  };
}

// ============================================================================
// Thinking Engine Types
// ============================================================================

/**
 * Thinking configuration
 */
export interface ThinkingConfig {
  maxIterations: number;
  timeoutMs: number;
  reflectionEnabled: boolean;
  planningEnabled: boolean;
  reasoningDepth: 'shallow' | 'medium' | 'deep';
  modelConfig?: ModelConfig;
}

/**
 * Model configuration for thinking
 */
export interface ModelConfig {
  provider: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Thinking step types
 */
export interface ThinkingStep {
  id: string;
  type: ThinkingStepType;
  content: string;
  reasoning?: string;
  confidence: number;
  dependencies: string[];
  createdAt: number;
}

/**
 * Thinking step type enumeration
 */
export enum ThinkingStepType {
  OBSERVATION = 'observation',
  ANALYSIS = 'analysis',
  HYPOTHESIS = 'hypothesis',
  PLAN = 'plan',
  ACTION = 'action',
  REFLECTION = 'reflection',
  DECISION = 'decision',
  VALIDATION = 'validation'
}

/**
 * Thinking chain for complex reasoning
 */
export interface ThinkingChain {
  id: string;
  taskId: TaskId;
  steps: ThinkingStep[];
  conclusion?: string;
  status: 'in_progress' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
}

// ============================================================================
// Context Engine Types
// ============================================================================

/**
 * Context configuration
 */
export interface ContextConfig {
  maxTokens: number;
  compressionThreshold: number;
  relevanceThreshold: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  priorityBoost: Record<string, number>;
}

/**
 * Context window for managing token limits
 */
export interface ContextWindow {
  id: string;
  taskId: TaskId;
  entries: ContextEntry[];
  totalTokens: number;
  maxTokens: number;
  compressed: boolean;
  lastCompressedAt?: number;
}

/**
 * Context entry
 */
export interface ContextEntry {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentBlock[];
  tokens: number;
  priority: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Content block for multimodal content
 */
export interface ContentBlock {
  type: 'text' | 'image' | 'code' | 'file' | 'tool_result';
  content: string;
  language?: string;
  path?: string;
  mimeType?: string;
}

// ============================================================================
// Tools Engine Types
// ============================================================================

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  category: ToolCategory;
  permissions: ToolPermission[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * JSON Schema definition
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: string[];
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

/**
 * Tool categories
 */
export enum ToolCategory {
  FILE_SYSTEM = 'file_system',
  CODE_EDITING = 'code_editing',
  TERMINAL = 'terminal',
  WEB = 'web',
  SEARCH = 'search',
  ANALYSIS = 'analysis',
  COMMUNICATION = 'communication',
  SYSTEM = 'system',
  EXTERNAL = 'external'
}

/**
 * Tool permissions
 */
export enum ToolPermission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  NETWORK = 'network',
  ADMIN = 'admin'
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  agentId: AgentId;
  taskId: TaskId;
  workingDirectory: string;
  environment: Record<string, string>;
  permissions: ToolPermission[];
  timeout: number;
  abortSignal?: AbortSignal;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  executionTime: number;
  tokensUsed?: number;
}

// ============================================================================
// Apply Engine Types
// ============================================================================

/**
 * Apply operation types
 */
export interface ApplyOperation {
  id: string;
  type: ApplyOperationType;
  target: string;
  content?: string;
  changes?: ChangeSet;
  metadata?: Record<string, unknown>;
}

/**
 * Apply operation types
 */
export enum ApplyOperationType {
  CREATE_FILE = 'create_file',
  EDIT_FILE = 'edit_file',
  DELETE_FILE = 'delete_file',
  MOVE_FILE = 'move_file',
  CREATE_DIRECTORY = 'create_directory',
  DELETE_DIRECTORY = 'delete_directory',
  APPLY_DIFF = 'apply_diff',
  APPLY_PATCH = 'apply_patch'
}

/**
 * Change set for file modifications
 */
export interface ChangeSet {
  additions: number;
  deletions: number;
  modifications: number;
  hunks: ChangeHunk[];
}

/**
 * Change hunk for diff operations
 */
export interface ChangeHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

// ============================================================================
// Runtime Types
// ============================================================================

/**
 * Agent runtime configuration
 */
export interface RuntimeConfig {
  maxAgents: number;
  maxTasksPerAgent: number;
  taskQueueSize: number;
  heartbeatIntervalMs: number;
  healthCheckIntervalMs: number;
  gracefulShutdownTimeoutMs: number;
  logging: LoggingConfig;
  metrics: MetricsConfig;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destination: 'console' | 'file' | 'both';
  filePath?: string;
  includeTimestamp: boolean;
  includeAgentId: boolean;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  intervalMs: number;
  exporters: MetricsExporter[];
}

/**
 * Metrics exporter type
 */
export interface MetricsExporter {
  type: 'prometheus' | 'datadog' | 'custom';
  endpoint?: string;
  apiKey?: string;
  customHandler?: (metrics: AgentMetrics) => void;
}

/**
 * Agent metrics
 */
export interface AgentMetrics {
  agentId: AgentId;
  tasksCompleted: number;
  tasksFailed: number;
  averageExecutionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  queueSize: number;
  uptime: number;
  timestamp: number;
}

// ============================================================================
// Shared Types
// ============================================================================

/**
 * Event types for the shared event bus
 */
export interface AgentEvent {
  id: string;
  type: string;
  source: AgentId;
  target?: AgentId | 'broadcast';
  payload: unknown;
  timestamp: number;
  correlationId?: string;
}

/**
 * Shared state interface
 */
export interface SharedState {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * Message queue interface
 */
export interface MessageQueue {
  publish(message: AgentMessage): Promise<void>;
  subscribe(handler: MessageHandler): Promise<void>;
  unsubscribe(handler: MessageHandler): Promise<void>;
  size(): number;
  clear(): void;
}

/**
 * Agent message
 */
export interface AgentMessage {
  id: MessageId;
  type: MessageType;
  from: AgentId;
  to: AgentId | 'broadcast';
  payload: unknown;
  priority: TaskPriority;
  timestamp: number;
  expiresAt?: number;
  correlationId?: string;
  replyTo?: MessageId;
}

/**
 * Message handler type
 */
export type MessageHandler = (message: AgentMessage) => Promise<void> | void;

// ============================================================================
// Router Types
// ============================================================================

/**
 * Router configuration
 */
export interface RouterConfig {
  routes: RouteDefinition[];
  middleware: MiddlewareConfig[];
  errorHandler?: ErrorHandler;
}

/**
 * Route definition
 */
export interface RouteDefinition {
  pattern: string | RegExp;
  handler: RouteHandler;
  middleware?: string[];
  priority: number;
}

/**
 * Route handler type
 */
export type RouteHandler = (
  message: AgentMessage,
  context: RouteContext
) => Promise<unknown>;

/**
 * Route context
 */
export interface RouteContext {
  params: Record<string, string>;
  agent: AgentId;
  session: SessionId;
  metadata: Record<string, unknown>;
}

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  name: string;
  handler: MiddlewareHandler;
  priority: number;
}

/**
 * Middleware handler type
 */
export type MiddlewareHandler = (
  message: AgentMessage,
  next: () => Promise<unknown>
) => Promise<unknown>;

/**
 * Error handler type
 */
export type ErrorHandler = (
  error: Error,
  message: AgentMessage
) => Promise<unknown>;

// ============================================================================
// System Environment Types
// ============================================================================

/**
 * System environment configuration
 */
export interface SystemEnvironment {
  platform: 'windows' | 'macos' | 'linux';
  shell: string;
  editor: string;
  workspaceRoot: string;
  gitEnabled: boolean;
  dockerEnabled: boolean;
  customTools: CustomTool[];
  environmentVariables: Record<string, string>;
}

/**
 * Custom tool definition
 */
export interface CustomTool {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * API request types
 */
export interface APIRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  timestamp: number;
}

/**
 * API response types
 */
export interface APIResponse {
  id: string;
  requestId: string;
  status: number;
  headers: Record<string, string>;
  body?: unknown;
  executionTime: number;
}

/**
 * API endpoint definition
 */
export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: APIHandler;
  middleware?: string[];
  rateLimit?: RateLimitConfig;
}

/**
 * API handler type
 */
export type APIHandler = (request: APIRequest) => Promise<APIResponse>;

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: APIRequest) => string;
}
