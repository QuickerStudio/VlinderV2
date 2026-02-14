/**
 * @fileoverview ThinkingEngine Types - 思维链推理引擎类型定义
 * 
 * Implements chain-of-thought reasoning with:
 * - Multiple reasoning patterns
 * - Reflection and self-correction
 * - Planning and hypothesis generation
 * - Confidence scoring
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// Identifiers
// ============================================================================

export type ThinkingChainId = string;
export type ThinkingStepId = string;
export type ReasoningPatternId = string;

// ============================================================================
// Reasoning Patterns
// ============================================================================

/**
 * Supported reasoning patterns
 */
export enum ReasoningPattern {
  DEDUCTIVE = 'deductive',       // General to specific
  INDUCTIVE = 'inductive',       // Specific to general
  ABDUCTIVE = 'abductive',       // Best explanation
  ANALOGICAL = 'analogical',     // Similarity-based
  CAUSAL = 'causal',             // Cause and effect
  PROBABILISTIC = 'probabilistic', // Probability-based
  SPATIAL = 'spatial',           // Spatial reasoning
  TEMPORAL = 'temporal',         // Time-based reasoning
}

/**
 * Reasoning pattern configuration
 */
export interface ReasoningPatternConfig {
  pattern: ReasoningPattern;
  enabled: boolean;
  priority: number;
  maxSteps: number;
  requiredConfidence: number;
}

// ============================================================================
// Thinking Step Types
// ============================================================================

/**
 * Types of thinking steps
 */
export enum ThinkingStepType {
  OBSERVATION = 'observation',     // Initial observation
  ANALYSIS = 'analysis',           // Analysis of information
  HYPOTHESIS = 'hypothesis',       // Proposed explanation
  PLAN = 'plan',                   // Action plan
  ACTION = 'action',               // Executed action
  REFLECTION = 'reflection',       // Self-reflection
  DECISION = 'decision',           // Final decision
  VALIDATION = 'validation',       // Validation check
  INFERENCE = 'inference',         // Logical inference
  SYNTHESIS = 'synthesis',         // Combining information
  DECOMPOSITION = 'decomposition', // Breaking down problems
  EVALUATION = 'evaluation',       // Evaluating options
}

/**
 * Thinking step status
 */
export enum ThinkingStepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Thinking step - Core reasoning unit
 */
export interface ThinkingStep {
  id: ThinkingStepId;
  chainId: ThinkingChainId;
  
  // Step type and content
  type: ThinkingStepType;
  content: string;
  reasoning?: string;
  
  // Confidence and validation
  confidence: number;
  validated: boolean;
  validationErrors?: string[];
  
  // Dependencies
  dependencies: ThinkingStepId[];
  
  // Metadata
  metadata: ThinkingStepMetadata;
  
  // Timing
  createdAt: number;
  completedAt?: number;
  duration?: number;
  
  // Status
  status: ThinkingStepStatus;
  
  // Children (for decomposition)
  children?: ThinkingStepId[];
  parent?: ThinkingStepId;
}

/**
 * Thinking step metadata
 */
export interface ThinkingStepMetadata {
  pattern?: ReasoningPattern;
  source?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
}

// ============================================================================
// Thinking Chain Types
// ============================================================================

/**
 * Thinking chain status
 */
export enum ThinkingChainStatus {
  IDLE = 'idle',
  INITIALIZED = 'initialized',
  RUNNING = 'running',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted',
}

/**
 * Thinking chain - Complete reasoning process
 */
export interface ThinkingChain {
  id: ThinkingChainId;
  taskId?: string;
  topic?: string;
  
  // Chain content
  steps: ThinkingStep[];
  conclusion?: string;
  
  // Reasoning pattern
  pattern: ReasoningPattern;
  
  // Status
  status: ThinkingChainStatus;
  
  // Confidence
  overallConfidence: number;
  
  // Timing
  startedAt: number;
  completedAt?: number;
  duration?: number;
  
  // Metrics
  metrics?: ThinkingChainMetrics;
  
  // Context
  context?: ThinkingContext;
}

/**
 * Thinking chain metrics
 */
export interface ThinkingChainMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  averageStepConfidence: number;
  reasoningDepth: number;
  backtrackingCount: number;
  reflectionCount: number;
}

/**
 * Thinking context
 */
export interface ThinkingContext {
  input: unknown;
  goal?: string;
  constraints?: string[];
  assumptions?: string[];
  relevantKnowledge?: string[];
  previousChains?: ThinkingChainId[];
}

// ============================================================================
// Reflection Types
// ============================================================================

/**
 * Reflection result
 */
export interface ReflectionResult {
  chainId: ThinkingChainId;
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  confidence: number;
  recommendations: string[];
}

/**
 * Self-correction
 */
export interface SelfCorrection {
  stepId: ThinkingStepId;
  originalContent: string;
  correctedContent: string;
  reason: string;
  confidence: number;
}

// ============================================================================
// Planning Types
// ============================================================================

/**
 * Plan step
 */
export interface PlanStep {
  id: string;
  description: string;
  dependencies: string[];
  estimatedComplexity: number;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Plan
 */
export interface Plan {
  id: string;
  chainId: ThinkingChainId;
  steps: PlanStep[];
  totalEstimatedComplexity: number;
  createdAt: number;
}

// ============================================================================
// Hypothesis Types
// ============================================================================

/**
 * Hypothesis
 */
export interface Hypothesis {
  id: string;
  chainId: ThinkingChainId;
  content: string;
  confidence: number;
  evidence: string[];
  counterEvidence: string[];
  status: 'proposed' | 'testing' | 'confirmed' | 'rejected';
  createdAt: number;
  testedAt?: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Thinking engine configuration
 */
export interface ThinkingEngineConfig {
  // Reasoning configuration
  reasoning: ReasoningConfig;
  
  // Reflection configuration
  reflection: ReflectionConfig;
  
  // Planning configuration
  planning: PlanningConfig;
  
  // Performance configuration
  performance: ThinkingPerformanceConfig;
  
  // Logging configuration
  logging: ThinkingLoggingConfig;
}

/**
 * Reasoning configuration
 */
export interface ReasoningConfig {
  defaultPattern: ReasoningPattern;
  enabledPatterns: ReasoningPattern[];
  maxSteps: number;
  maxDepth: number;
  minConfidence: number;
  autoValidation: boolean;
  backtrackingEnabled: boolean;
  maxBacktrackingSteps: number;
}

/**
 * Reflection configuration
 */
export interface ReflectionConfig {
  enabled: boolean;
  frequency: 'always' | 'on_completion' | 'on_failure' | 'periodic';
  periodicInterval?: number;
  depth: 'shallow' | 'medium' | 'deep';
  selfCorrectionEnabled: boolean;
}

/**
 * Planning configuration
 */
export interface PlanningConfig {
  enabled: boolean;
  maxPlanSteps: number;
  complexityThreshold: number;
  autoReplanning: boolean;
  parallelExecution: boolean;
}

/**
 * Thinking performance configuration
 */
export interface ThinkingPerformanceConfig {
  maxConcurrentChains: number;
  stepTimeout: number;
  chainTimeout: number;
  cacheEnabled: boolean;
  cacheSize: number;
}

/**
 * Thinking logging configuration
 */
export interface ThinkingLoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  includeSteps: boolean;
  includeReasoning: boolean;
  includeMetrics: boolean;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Thinking event types
 */
export enum ThinkingEventType {
  CHAIN_STARTED = 'thinking:chain_started',
  CHAIN_COMPLETED = 'thinking:chain_completed',
  CHAIN_FAILED = 'thinking:chain_failed',
  STEP_ADDED = 'thinking:step_added',
  STEP_COMPLETED = 'thinking:step_completed',
  REFLECTION = 'thinking:reflection',
  CORRECTION = 'thinking:correction',
  HYPOTHESIS_PROPOSED = 'thinking:hypothesis_proposed',
  HYPOTHESIS_CONFIRMED = 'thinking:hypothesis_confirmed',
  HYPOTHESIS_REJECTED = 'thinking:hypothesis_rejected',
  PLAN_CREATED = 'thinking:plan_created',
  PLAN_UPDATED = 'thinking:plan_updated',
}

/**
 * Thinking event
 */
export interface ThinkingEvent {
  type: ThinkingEventType;
  chainId?: ThinkingChainId;
  stepId?: ThinkingStepId;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Thinking engine statistics
 */
export interface ThinkingStatistics {
  totalChains: number;
  completedChains: number;
  failedChains: number;
  averageChainDuration: number;
  averageStepsPerChain: number;
  averageConfidence: number;
  
  chainsByPattern: Record<ReasoningPattern, number>;
  stepsByType: Record<ThinkingStepType, number>;
  
  reflectionCount: number;
  correctionCount: number;
  hypothesisCount: number;
  
  cacheHitRate: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const ThinkingStepSchema = z.object({
  id: z.string(),
  chainId: z.string(),
  type: z.nativeEnum(ThinkingStepType),
  content: z.string(),
  reasoning: z.string().optional(),
  confidence: z.number().min(0).max(1),
  dependencies: z.array(z.string()),
  status: z.nativeEnum(ThinkingStepStatus),
  createdAt: z.number(),
});

export const ThinkingChainSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  steps: z.array(ThinkingStepSchema),
  pattern: z.nativeEnum(ReasoningPattern),
  status: z.nativeEnum(ThinkingChainStatus),
  overallConfidence: z.number().min(0).max(1),
  startedAt: z.number(),
});
