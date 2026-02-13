/**
 * @fileoverview V2 Core Types - Based on OpenAI Swarm & Goose Architecture
 * 
 * Core design principles:
 * - MainAgent: The supreme global leader of the autonomous programming system
 * - Bee: Worker agents that execute specific tasks (like bees in a hive)
 * - AgentSwarm: Orchestrates multiple Bees for complex tasks
 * 
 * References:
 * - https://github.com/openai/swarm
 * - https://github.com/block/goose
 * - https://github.com/anthropics/claude-agent-sdk-typescript
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { z } from 'zod';

// ============================================================================
// Core Identifiers
// ============================================================================

export type AgentId = string;
export type BeeId = string;
export type TaskId = string;
export type SessionId = string;
export type MessageId = string;
export type ToolCallId = string;

// ============================================================================
// Agent States (Based on Goose)
// ============================================================================

export enum AgentState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  WAITING_FOR_INPUT = 'waiting_for_input',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

export enum BeeState {
  IDLE = 'idle',
  BUSY = 'busy',
  WAITING = 'waiting',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// ============================================================================
// MainAgent - Supreme Global Leader
// ============================================================================

/**
 * MainAgent Configuration
 * The supreme global leader of the autonomous programming system
 */
export interface MainAgentConfig {
  id: AgentId;
  name: string;
  description?: string;
  version: string;
  
  // Model configuration
  model: ModelConfig;
  
  // Instructions (can be string or function for dynamic instructions)
  instructions: string | ((context: ContextVariables) => string);
  
  // Capabilities and tools
  capabilities: Capability[];
  tools: ToolDefinition[];
  
  // Behavior configuration
  behavior: AgentBehaviorConfig;
  
  // Session configuration
  session: SessionConfig;
  
  // Sub-agents (Bees)
  bees: BeeConfig[];
}

/**
 * Agent behavior configuration
 */
export interface AgentBehaviorConfig {
  maxTurns: number;
  maxRetries: number;
  timeout: number;
  parallelToolCalls: boolean;
  toolChoice: 'auto' | 'required' | 'none';
  autoApprove: boolean;
  verboseMode: boolean;
}

/**
 * Session configuration (Based on Goose)
 */
export interface SessionConfig {
  id: SessionId;
  scheduleId?: string;
  maxTurns?: number;
  retryConfig?: RetryConfig;
  persistenceEnabled: boolean;
  persistencePath?: string;
}

/**
 * Retry configuration (Based on Goose)
 */
export interface RetryConfig {
  maxRetries: number;
  checks: SuccessCheck[];
  onFailure?: string;
  timeoutSeconds?: number;
  onFailureTimeoutSeconds?: number;
}

/**
 * Success check for validation
 */
export interface SuccessCheck {
  type: 'shell' | 'function' | 'custom';
  command?: string;
  function?: string;
  validator?: (result: unknown) => boolean;
}

// ============================================================================
// Bee - Worker Agent
// ============================================================================

/**
 * Bee Configuration
 * Worker agents that execute specific tasks (like bees in a hive)
 */
export interface BeeConfig {
  id: BeeId;
  name: string;
  description?: string;
  
  // Model configuration (can inherit from MainAgent)
  model?: Partial<ModelConfig>;
  
  // Specific instructions for this Bee
  instructions: string | ((context: ContextVariables) => string);
  
  // Tools available to this Bee
  tools: ToolDefinition[];
  
  // Capabilities
  capabilities: BeeCapability[];
  
  // Handoff configuration
  handoffs: HandoffConfig[];
  
  // Priority and scheduling
  priority: BeePriority;
  maxConcurrentTasks: number;
}

/**
 * Bee capability types
 */
export enum BeeCapability {
  CODE_EDITING = 'code_editing',
  FILE_OPERATIONS = 'file_operations',
  TERMINAL = 'terminal',
  WEB_SEARCH = 'web_search',
  ANALYSIS = 'analysis',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  DEPLOYMENT = 'deployment',
  DEBUGGING = 'debugging',
  REFACTORING = 'refactoring'
}

/**
 * Bee priority levels
 */
export enum BeePriority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  BACKGROUND = 4
}

/**
 * Handoff configuration for agent switching (Based on OpenAI Swarm)
 */
export interface HandoffConfig {
  targetBee: BeeId;
  condition: string | ((context: ContextVariables) => boolean);
  description?: string;
  transferContext: boolean;
}

// ============================================================================
// Context Variables (Based on OpenAI Swarm)
// ============================================================================

/**
 * Context variables shared across agents
 */
export interface ContextVariables {
  [key: string]: unknown;
  
  // System context
  sessionId: SessionId;
  taskId: TaskId;
  workingDirectory: string;
  
  // User context
  userId?: string;
  userPreferences?: Record<string, unknown>;
  
  // Project context
  projectRoot?: string;
  projectType?: string;
  gitBranch?: string;
  
  // Agent context
  currentAgent?: AgentId;
  previousAgent?: AgentId;
  agentHistory?: AgentId[];
  
  // Task context
  taskDescription?: string;
  taskPriority?: BeePriority;
  taskDeadline?: number;
  
  // Memory context
  recentMemories?: MemoryEntry[];
  relevantContext?: string[];
}

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Model configuration
 */
export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

/**
 * Supported model providers
 */
export enum ModelProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google',
  AZURE = 'azure',
  CUSTOM = 'custom'
}

// ============================================================================
// Tools (Based on OpenAI Swarm & Goose)
// ============================================================================

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  outputSchema?: z.ZodType<unknown>;
  
  // Execution configuration
  timeout?: number;
  retryPolicy?: RetryPolicy;
  
  // Permissions
  permissions: ToolPermission[];
  
  // Handler
  handler: ToolHandler;
}

/**
 * Tool handler function type
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  context: ContextVariables
) => Promise<ToolResult | BeeConfig | string>;

/**
 * Tool result (Based on OpenAI Swarm Result)
 */
export interface ToolResult {
  value: string;
  agent?: BeeConfig;  // For handoffs
  contextVariables?: Partial<ContextVariables>;
  metadata?: Record<string, unknown>;
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
 * Retry policy
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryOn: string[];  // Error types to retry on
}

// ============================================================================
// Capability Definition
// ============================================================================

/**
 * Capability definition
 */
export interface Capability {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  outputSchema: z.ZodType<unknown>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

// ============================================================================
// Messages (Based on OpenAI Swarm)
// ============================================================================

/**
 * Message types
 */
export interface Message {
  id: MessageId;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentBlock[];
  sender?: string;
  timestamp: number;
  
  // Tool call information
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  
  // Metadata
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

/**
 * Tool call
 */
export interface ToolCall {
  id: ToolCallId;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ============================================================================
// Response (Based on OpenAI Swarm)
// ============================================================================

/**
 * Agent response
 */
export interface AgentResponse {
  messages: Message[];
  agent: BeeConfig | null;
  contextVariables: ContextVariables;
}

// ============================================================================
// Memory
// ============================================================================

/**
 * Memory entry
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
  source: 'user' | 'agent' | 'system' | 'tool';
  type: 'fact' | 'preference' | 'context' | 'instruction' | 'experience';
  tags: string[];
  confidence: number;
  expiresAt?: number;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Agent event types
 */
export type AgentEventType =
  | 'agent:started'
  | 'agent:completed'
  | 'agent:error'
  | 'agent:handoff'
  | 'bee:spawned'
  | 'bee:completed'
  | 'bee:error'
  | 'tool:called'
  | 'tool:completed'
  | 'tool:error'
  | 'message:sent'
  | 'message:received'
  | 'context:updated'
  | 'memory:stored'
  | 'memory:retrieved';

/**
 * Agent event
 */
export interface AgentEvent {
  id: string;
  type: AgentEventType;
  source: AgentId | BeeId;
  target?: AgentId | BeeId;
  payload: unknown;
  timestamp: number;
  correlationId?: string;
}

// ============================================================================
// Metrics
// ============================================================================

/**
 * Agent metrics
 */
export interface AgentMetrics {
  agentId: AgentId;
  tasksCompleted: number;
  tasksFailed: number;
  averageExecutionTime: number;
  totalTokensUsed: number;
  memoryUsage: number;
  uptime: number;
  lastActivity: number;
}

/**
 * Bee metrics
 */
export interface BeeMetrics {
  beeId: BeeId;
  tasksCompleted: number;
  tasksFailed: number;
  averageExecutionTime: number;
  handoffsReceived: number;
  handoffsSent: number;
  currentState: BeeState;
}

// ============================================================================
// Shared Types
// ============================================================================

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
  publish(message: Message): Promise<void>;
  subscribe(handler: MessageHandler): Promise<void>;
  unsubscribe(handler: MessageHandler): Promise<void>;
  size(): number;
  clear(): void;
}

export type MessageHandler = (message: Message) => Promise<void> | void;

// ============================================================================
// Provider Interface (Based on Goose)
// ============================================================================

/**
 * Provider interface for LLM abstraction
 */
export interface Provider {
  name: string;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  completeStream(request: CompletionRequest): AsyncGenerator<CompletionChunk>;
  countTokens(text: string): number;
  isAvailable(): Promise<boolean>;
}

/**
 * Completion request
 */
export interface CompletionRequest {
  messages: Message[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'required' | 'none';
  model: ModelConfig;
  contextVariables?: ContextVariables;
}

/**
 * Completion response
 */
export interface CompletionResponse {
  id: string;
  message: Message;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

/**
 * Completion chunk for streaming
 */
export interface CompletionChunk {
  id: string;
  delta: {
    role?: string;
    content?: string;
    toolCalls?: Partial<ToolCall>[];
  };
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'error';
}
