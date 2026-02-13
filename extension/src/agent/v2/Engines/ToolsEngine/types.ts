/**
 * @fileoverview ToolsEngine Types - 工具调用引擎类型定义
 * 
 * Implements tool execution with:
 * - Tool registry and lifecycle
 * - Permission management
 * - Multi-round execution
 * - Error handling and retry
 * - Tool composition
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// Identifiers
// ============================================================================

export type ToolId = string;
export type ToolExecutionId = string;
export type PermissionId = string;

// ============================================================================
// Tool Definition Types
// ============================================================================

/**
 * Tool category
 */
export enum ToolCategory {
  FILE_SYSTEM = 'file_system',
  CODE_EDITING = 'code_editing',
  TERMINAL = 'terminal',
  SEARCH = 'search',
  WEB = 'web',
  ANALYSIS = 'analysis',
  COMMUNICATION = 'communication',
  SYSTEM = 'system',
  AGENT = 'agent',
  CUSTOM = 'custom',
}

/**
 * Tool risk level
 */
export enum ToolRiskLevel {
  SAFE = 'safe',           // No risk, auto-approve
  LOW = 'low',             // Minimal risk, usually auto-approve
  MEDIUM = 'medium',       // Moderate risk, may require approval
  HIGH = 'high',           // High risk, always require approval
  CRITICAL = 'critical',   // Critical risk, require explicit approval
}

/**
 * Tool permission
 */
export enum ToolPermission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  NETWORK = 'network',
  ADMIN = 'admin',
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  TERMINAL_EXECUTE = 'terminal_execute',
  WEB_ACCESS = 'web_access',
  AGENT_SPAWN = 'agent_spawn',
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  category: ToolCategory;
  
  // Schema
  inputSchema: z.ZodType<unknown>;
  outputSchema?: z.ZodType<unknown>;
  
  // Permissions and risk
  permissions: ToolPermission[];
  riskLevel: ToolRiskLevel;
  
  // Execution configuration
  timeout: number;
  retryPolicy?: RetryPolicy;
  
  // Handler
  handler: ToolHandler;
  
  // Metadata
  version: string;
  author?: string;
  tags?: string[];
  deprecated?: boolean;
  replacement?: ToolId;
}

/**
 * Tool handler function
 */
export type ToolHandler = (
  input: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolResult>;

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  executionId: ToolExecutionId;
  sessionId: string;
  taskId: string;
  agentId: string;
  workingDirectory: string;
  permissions: PermissionSet;
  metadata: Record<string, unknown>;
  
  // Callbacks
  onProgress?: (progress: ToolProgress) => void;
  onRequestPermission?: (request: PermissionRequest) => Promise<boolean>;
}

/**
 * Tool result
 */
export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: ToolError;
  metadata?: Record<string, unknown>;
  
  // For multi-step tools
  nextSteps?: ToolNextStep[];
  
  // For agent handoff
  agentHandoff?: {
    agentId: string;
    reason: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Tool error
 */
export interface ToolError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
  suggestedAction?: string;
}

/**
 * Tool progress
 */
export interface ToolProgress {
  executionId: ToolExecutionId;
  progress: number;  // 0-100
  message: string;
  intermediateResult?: unknown;
}

/**
 * Tool next step (for multi-round execution)
 */
export interface ToolNextStep {
  toolId: ToolId;
  input: Record<string, unknown>;
  condition?: string;
  priority: number;
}

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission set
 */
export interface PermissionSet {
  granted: Set<ToolPermission>;
  denied: Set<ToolPermission>;
  temporary: Map<ToolPermission, number>; // permission -> expiry timestamp
}

/**
 * Permission request
 */
export interface PermissionRequest {
  id: PermissionId;
  toolId: ToolId;
  permissions: ToolPermission[];
  reason: string;
  riskLevel: ToolRiskLevel;
  context: Record<string, unknown>;
  timestamp: number;
}

/**
 * Permission decision
 */
export interface PermissionDecision {
  requestId: PermissionId;
  granted: boolean;
  temporary: boolean;
  expiry?: number;
  reason?: string;
}

/**
 * Permission policy
 */
export interface PermissionPolicy {
  // Auto-approve rules
  autoApprove: {
    safeTools: boolean;
    lowRiskTools: boolean;
    readOperations: boolean;
    trustedAgents: string[];
  };
  
  // Auto-deny rules
  autoDeny: {
    criticalOperations: boolean;
    untrustedSources: boolean;
  };
  
  // Temporary permissions
  temporaryPermissions: {
    enabled: boolean;
    defaultDuration: number;
    maxDuration: number;
  };
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  toolId: ToolId;
  input: Record<string, unknown>;
  context: Partial<ToolExecutionContext>;
  
  // Execution options
  options?: ToolExecutionOptions;
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  skipApproval?: boolean;
  trackProgress?: boolean;
  collectMetrics?: boolean;
}

/**
 * Tool execution record
 */
export interface ToolExecutionRecord {
  id: ToolExecutionId;
  toolId: ToolId;
  input: Record<string, unknown>;
  output?: unknown;
  
  // Status
  status: ToolExecutionStatus;
  
  // Timing
  startTime: number;
  endTime?: number;
  duration?: number;
  
  // Error
  error?: ToolError;
  
  // Permissions
  permissionRequests: PermissionRequest[];
  permissionDecisions: PermissionDecision[];
  
  // Metrics
  metrics: ToolExecutionMetrics;
  
  // Context
  context: ToolExecutionContext;
}

/**
 * Tool execution status
 */
export enum ToolExecutionStatus {
  PENDING = 'pending',
  WAITING_APPROVAL = 'waiting_approval',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

/**
 * Tool execution metrics
 */
export interface ToolExecutionMetrics {
  inputTokens?: number;
  outputTokens?: number;
  memoryUsed?: number;
  filesRead?: number;
  filesWritten?: number;
  commandsExecuted?: number;
  networkRequests?: number;
}

// ============================================================================
// Retry Policy
// ============================================================================

/**
 * Retry policy
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: ToolError) => void;
}

// ============================================================================
// Tool Composition
// ============================================================================

/**
 * Tool pipeline
 */
export interface ToolPipeline {
  id: string;
  name: string;
  description: string;
  steps: ToolPipelineStep[];
  
  // Error handling
  onError: 'stop' | 'skip' | 'retry' | 'continue';
  
  // Output aggregation
  aggregateOutput: boolean;
}

/**
 * Tool pipeline step
 */
export interface ToolPipelineStep {
  toolId: ToolId;
  inputMapping: Record<string, string>; // output key -> input key
  condition?: string;
  onError?: 'stop' | 'skip' | 'retry';
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Tools engine configuration
 */
export interface ToolsEngineConfig {
  // Registry configuration
  registry: ToolRegistryConfig;
  
  // Permission configuration
  permissions: PermissionConfig;
  
  // Execution configuration
  execution: ToolExecutionConfig;
  
  // Performance configuration
  performance: ToolPerformanceConfig;
  
  // Logging configuration
  logging: ToolLoggingConfig;
}

/**
 * Tool registry configuration
 */
export interface ToolRegistryConfig {
  autoRegisterBuiltins: boolean;
  validateSchemas: boolean;
  allowDeprecated: boolean;
  hotReload: boolean;
}

/**
 * Permission configuration
 */
export interface PermissionConfig {
  policy: PermissionPolicy;
  cacheDecisions: boolean;
  cacheSize: number;
  auditEnabled: boolean;
}

/**
 * Tool execution configuration
 */
export interface ToolExecutionConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  maxTimeout: number;
  queueSize: number;
  priorityLevels: number;
}

/**
 * Tool performance configuration
 */
export interface ToolPerformanceConfig {
  metricsEnabled: boolean;
  metricsInterval: number;
  profilingEnabled: boolean;
  cacheResults: boolean;
  cacheSize: number;
  cacheTTL: number;
}

/**
 * Tool logging configuration
 */
export interface ToolLoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  logInput: boolean;
  logOutput: boolean;
  logErrors: boolean;
  logPerformance: boolean;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Tool event types
 */
export enum ToolEventType {
  REGISTERED = 'tool:registered',
  UNREGISTERED = 'tool:unregistered',
  EXECUTION_STARTED = 'tool:execution_started',
  EXECUTION_PROGRESS = 'tool:execution_progress',
  EXECUTION_COMPLETED = 'tool:execution_completed',
  EXECUTION_FAILED = 'tool:execution_failed',
  PERMISSION_REQUESTED = 'tool:permission_requested',
  PERMISSION_GRANTED = 'tool:permission_granted',
  PERMISSION_DENIED = 'tool:permission_denied',
}

/**
 * Tool event
 */
export interface ToolEvent {
  type: ToolEventType;
  toolId?: ToolId;
  executionId?: ToolExecutionId;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Tools engine statistics
 */
export interface ToolsEngineStatistics {
  // Registry stats
  totalTools: number;
  toolsByCategory: Record<ToolCategory, number>;
  toolsByRiskLevel: Record<ToolRiskLevel, number>;
  
  // Execution stats
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  
  // Permission stats
  permissionRequests: number;
  permissionGrants: number;
  permissionDenials: number;
  autoApprovals: number;
  
  // Performance stats
  cacheHitRate: number;
  queueLength: number;
  activeExecutions: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const ToolDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.nativeEnum(ToolCategory),
  permissions: z.array(z.nativeEnum(ToolPermission)),
  riskLevel: z.nativeEnum(ToolRiskLevel),
  timeout: z.number().positive(),
  version: z.string(),
});

export const ToolExecutionRequestSchema = z.object({
  toolId: z.string(),
  input: z.record(z.unknown()),
  options: z.object({
    timeout: z.number().optional(),
    retryCount: z.number().optional(),
    skipApproval: z.boolean().optional(),
  }).optional(),
});
