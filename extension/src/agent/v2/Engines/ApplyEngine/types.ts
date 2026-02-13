/**
 * @fileoverview ApplyEngine Types - 多轮工具执行引擎类型定义
 * 
 * Implements multi-round tool execution with:
 * - Execution planning
 * - Dependency resolution
 * - Parallel execution
 * - Rollback support
 * - Permission management
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// Identifiers
// ============================================================================

export type ExecutionPlanId = string;
export type ExecutionStepId = string;
export type ExecutionSessionId = string;

// ============================================================================
// Execution Plan Types
// ============================================================================

/**
 * Execution plan
 */
export interface ExecutionPlan {
  id: ExecutionPlanId;
  sessionId: ExecutionSessionId;
  
  // Steps
  steps: ExecutionStep[];
  
  // Dependencies
  dependencyGraph: DependencyGraph;
  
  // Configuration
  config: ExecutionPlanConfig;
  
  // Status
  status: ExecutionPlanStatus;
  
  // Timing
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  
  // Metrics
  metrics: ExecutionPlanMetrics;
}

/**
 * Execution step
 */
export interface ExecutionStep {
  id: ExecutionStepId;
  planId: ExecutionPlanId;
  
  // Tool info
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  
  // Dependencies
  dependencies: ExecutionStepId[];
  dependents: ExecutionStepId[];
  
  // Execution
  status: ExecutionStepStatus;
  result?: ExecutionStepResult;
  
  // Retry
  retryCount: number;
  maxRetries: number;
  
  // Timing
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  
  // Priority
  priority: number;
  
  // Rollback
  rollbackData?: RollbackData;
}

/**
 * Execution step status
 */
export enum ExecutionStepStatus {
  PENDING = 'pending',
  WAITING_DEPENDENCIES = 'waiting_dependencies',
  WAITING_PERMISSION = 'waiting_permission',
  READY = 'ready',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ROLLED_BACK = 'rolled_back',
}

/**
 * Execution step result
 */
export interface ExecutionStepResult {
  success: boolean;
  output?: unknown;
  error?: ExecutionError;
  sideEffects?: SideEffect[];
}

/**
 * Execution error
 */
export interface ExecutionError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
  suggestedAction?: string;
}

/**
 * Side effect
 */
export interface SideEffect {
  type: SideEffectType;
  description: string;
  data?: unknown;
  reversible: boolean;
}

/**
 * Side effect types
 */
export enum SideEffectType {
  FILE_CREATED = 'file_created',
  FILE_MODIFIED = 'file_modified',
  FILE_DELETED = 'file_deleted',
  COMMAND_EXECUTED = 'command_executed',
  NETWORK_REQUEST = 'network_request',
  STATE_CHANGED = 'state_changed',
}

/**
 * Rollback data
 */
export interface RollbackData {
  stepId: ExecutionStepId;
  sideEffects: SideEffect[];
  rollbackActions: RollbackAction[];
}

/**
 * Rollback action
 */
export interface RollbackAction {
  type: RollbackActionType;
  description: string;
  execute: () => Promise<void>;
}

/**
 * Rollback action types
 */
export enum RollbackActionType {
  RESTORE_FILE = 'restore_file',
  DELETE_FILE = 'delete_file',
  REVERT_CHANGES = 'revert_changes',
  EXECUTE_COMMAND = 'execute_command',
  CUSTOM = 'custom',
}

/**
 * Dependency graph
 */
export interface DependencyGraph {
  nodes: Map<ExecutionStepId, ExecutionStep>;
  edges: Map<ExecutionStepId, ExecutionStepId[]>;  // step -> dependencies
  reverseEdges: Map<ExecutionStepId, ExecutionStepId[]>;  // step -> dependents
}

/**
 * Execution plan status
 */
export enum ExecutionPlanStatus {
  CREATED = 'created',
  VALIDATING = 'validating',
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled',
}

/**
 * Execution plan configuration
 */
export interface ExecutionPlanConfig {
  // Execution mode
  mode: ExecutionMode;
  
  // Parallelism
  maxParallel: number;
  
  // Retry
  retryFailed: boolean;
  maxRetries: number;
  retryDelay: number;
  
  // Rollback
  enableRollback: boolean;
  rollbackOnFailure: boolean;
  
  // Permissions
  autoApprove: boolean;
  requireApproval: string[];  // Tool IDs that require approval
  
  // Timeout
  stepTimeout: number;
  planTimeout: number;
}

/**
 * Execution mode
 */
export enum ExecutionMode {
  SEQUENTIAL = 'sequential',     // Execute steps one by one
  PARALLEL = 'parallel',         // Execute all parallel steps together
  ADAPTIVE = 'adaptive',         // Dynamically adjust based on dependencies
  PRIORITY = 'priority',         // Execute by priority
}

/**
 * Execution plan metrics
 */
export interface ExecutionPlanMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  
  totalDuration: number;
  averageStepDuration: number;
  
  parallelism: number;
  efficiency: number;
  
  rollbackCount: number;
  permissionRequests: number;
}

// ============================================================================
// Permission Management Types
// ============================================================================

/**
 * Permission level
 */
export enum PermissionLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

/**
 * Permission rule
 */
export interface PermissionRule {
  id: string;
  toolId: string;
  level: PermissionLevel;
  
  // Conditions
  conditions?: PermissionCondition[];
  
  // Scope
  scope: PermissionScope;
  
  // Duration
  temporary: boolean;
  expiresAt?: number;
  
  // Metadata
  createdAt: number;
  createdBy: string;
  reason?: string;
}

/**
 * Permission condition
 */
export interface PermissionCondition {
  type: 'input' | 'output' | 'context' | 'time' | 'custom';
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches';
  value: unknown;
}

/**
 * Permission scope
 */
export interface PermissionScope {
  type: 'global' | 'session' | 'plan' | 'step';
  targetId?: string;
}

/**
 * Permission request
 */
export interface PermissionRequest {
  id: string;
  stepId: ExecutionStepId;
  toolId: string;
  level: PermissionLevel;
  reason: string;
  context: Record<string, unknown>;
  timestamp: number;
}

/**
 * Permission decision
 */
export interface PermissionDecision {
  requestId: string;
  granted: boolean;
  level: PermissionLevel;
  temporary: boolean;
  expiresAt?: number;
  reason?: string;
  timestamp: number;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Execution session
 */
export interface ExecutionSession {
  id: ExecutionSessionId;
  
  // Plans
  plans: ExecutionPlanId[];
  currentPlan?: ExecutionPlanId;
  
  // State
  state: SessionState;
  
  // Context
  context: SessionContext;
  
  // Permissions
  permissions: PermissionRule[];
  
  // History
  history: ExecutionHistory[];
  
  // Timing
  createdAt: number;
  updatedAt: number;
}

/**
 * Session state
 */
export interface SessionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep?: ExecutionStepId;
  progress: number;
  error?: ExecutionError;
}

/**
 * Session context
 */
export interface SessionContext {
  workingDirectory: string;
  agentId: string;
  taskId: string;
  variables: Record<string, unknown>;
}

/**
 * Execution history
 */
export interface ExecutionHistory {
  stepId: ExecutionStepId;
  toolId: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: ExecutionStepStatus;
  timestamp: number;
  duration?: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Apply engine configuration
 */
export interface ApplyEngineConfig {
  // Execution configuration
  execution: ExecutionConfig;
  
  // Permission configuration
  permissions: PermissionConfig;
  
  // Rollback configuration
  rollback: RollbackConfig;
  
  // Performance configuration
  performance: ApplyPerformanceConfig;
  
  // Logging configuration
  logging: ApplyLoggingConfig;
}

/**
 * Execution configuration
 */
export interface ExecutionConfig {
  defaultMode: ExecutionMode;
  maxParallel: number;
  defaultTimeout: number;
  maxTimeout: number;
  enableRetry: boolean;
  maxRetries: number;
}

/**
 * Permission configuration
 */
export interface PermissionConfig {
  defaultLevel: PermissionLevel;
  autoApproveSafe: boolean;
  requireApprovalFor: string[];
  cacheDecisions: boolean;
  auditEnabled: boolean;
}

/**
 * Rollback configuration
 */
export interface RollbackConfig {
  enabled: boolean;
  autoRollback: boolean;
  maxRollbackSteps: number;
  preserveRollbackData: boolean;
}

/**
 * Apply performance configuration
 */
export interface ApplyPerformanceConfig {
  maxConcurrentPlans: number;
  maxConcurrentSteps: number;
  queueSize: number;
  cacheResults: boolean;
  cacheSize: number;
}

/**
 * Apply logging configuration
 */
export interface ApplyLoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  logInput: boolean;
  logOutput: boolean;
  logPermissions: boolean;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Apply event types
 */
export enum ApplyEventType {
  PLAN_CREATED = 'apply:plan_created',
  PLAN_STARTED = 'apply:plan_started',
  PLAN_COMPLETED = 'apply:plan_completed',
  PLAN_FAILED = 'apply:plan_failed',
  STEP_STARTED = 'apply:step_started',
  STEP_COMPLETED = 'apply:step_completed',
  STEP_FAILED = 'apply:step_failed',
  PERMISSION_REQUESTED = 'apply:permission_requested',
  PERMISSION_GRANTED = 'apply:permission_granted',
  PERMISSION_DENIED = 'apply:permission_denied',
  ROLLBACK_STARTED = 'apply:rollback_started',
  ROLLBACK_COMPLETED = 'apply:rollback_completed',
}

/**
 * Apply event
 */
export interface ApplyEvent {
  type: ApplyEventType;
  planId?: ExecutionPlanId;
  stepId?: ExecutionStepId;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Apply engine statistics
 */
export interface ApplyEngineStatistics {
  // Plan stats
  totalPlans: number;
  completedPlans: number;
  failedPlans: number;
  rolledBackPlans: number;
  
  // Step stats
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  averageStepDuration: number;
  
  // Permission stats
  permissionRequests: number;
  permissionGrants: number;
  permissionDenials: number;
  
  // Performance stats
  averagePlanDuration: number;
  parallelismUtilization: number;
  cacheHitRate: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const ExecutionStepSchema = z.object({
  id: z.string(),
  planId: z.string(),
  toolId: z.string(),
  toolName: z.string(),
  input: z.record(z.unknown()),
  dependencies: z.array(z.string()),
  status: z.nativeEnum(ExecutionStepStatus),
  priority: z.number(),
});

export const ExecutionPlanSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  steps: z.array(ExecutionStepSchema),
  status: z.nativeEnum(ExecutionPlanStatus),
  config: z.object({
    mode: z.nativeEnum(ExecutionMode),
    maxParallel: z.number(),
    enableRollback: z.boolean(),
  }),
});
