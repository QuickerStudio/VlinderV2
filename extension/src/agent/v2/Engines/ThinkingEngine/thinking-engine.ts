/**
 * @fileoverview ThinkingEngine - 思维链推理引擎
 * 
 * Implements chain-of-thought reasoning with:
 * - Multiple reasoning patterns
 * - Reflection and self-correction
 * - Planning and hypothesis generation
 * - Confidence scoring
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  ThinkingChainId,
  ThinkingStepId,
  ThinkingChain,
  ThinkingStep,
  ThinkingStepType,
  ThinkingStepStatus,
  ThinkingChainStatus,
  ReasoningPattern,
  ReasoningPatternConfig,
  ThinkingEngineConfig,
  ThinkingContext,
  ThinkingStatistics,
  ThinkingEventType,
  ThinkingEvent,
  ReflectionResult,
  SelfCorrection,
  Plan,
  PlanStep,
  Hypothesis,
  ThinkingChainSchema,
} from './types';

/**
 * Default Thinking Engine Configuration
 */
const DEFAULT_CONFIG: ThinkingEngineConfig = {
  reasoning: {
    defaultPattern: ReasoningPattern.DEDDUCTIVE,
    enabledPatterns: [
      ReasoningPattern.DEDDUCTIVE,
      ReasoningPattern.INDUCTIVE,
      ReasoningPattern.ABDUCTIVE,
      ReasoningPattern.ANALOGICAL,
      ReasoningPattern.CAUSAL,
    ],
    maxSteps: 50,
    maxDepth: 10,
    minConfidence: 0.5,
    autoValidation: true,
    backtrackingEnabled: true,
    maxBacktrackingSteps: 5,
  },
  reflection: {
    enabled: true,
    frequency: 'on_completion',
    depth: 'medium',
    selfCorrectionEnabled: true,
  },
  planning: {
    enabled: true,
    maxPlanSteps: 20,
    complexityThreshold: 0.7,
    autoReplanning: true,
    parallelExecution: false,
  },
  performance: {
    maxConcurrentChains: 5,
    stepTimeout: 30000,
    chainTimeout: 300000,
    cacheEnabled: true,
    cacheSize: 1000,
  },
  logging: {
    enabled: true,
    level: 'info',
    includeSteps: true,
    includeReasoning: true,
    includeMetrics: true,
  },
};

/**
 * ThinkingEngine - Chain-of-Thought Reasoning Engine
 */
export class ThinkingEngine extends EventEmitter {
  private config: ThinkingEngineConfig;
  
  // Active chains
  private chains: Map<ThinkingChainId, ThinkingChain> = new Map();
  private activeChain: ThinkingChainId | null = null;
  
  // Step cache
  private stepCache: Map<string, ThinkingStep> = new Map();
  
  // Statistics
  private stats: ThinkingStatistics;
  
  // State
  private isInitialized: boolean = false;

  constructor(config: Partial<ThinkingEngineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as ThinkingEngineConfig;
    this.stats = this.initializeStats();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the thinking engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the thinking engine
   */
  public async shutdown(): Promise<void> {
    this.chains.clear();
    this.stepCache.clear();
    this.isInitialized = false;
    this.emit('shutdown');
  }

  // =========================================================================
  // Chain Management
  // =========================================================================

  /**
   * Create a new thinking chain
   */
  public async createChain(options: {
    topic: string;
    pattern: ReasoningPattern;
  }): Promise<ThinkingChain> {
    const chainId = this.generateChainId();
    const { topic, pattern } = options;
    
    const chain: ThinkingChain = {
      id: chainId,
      topic,
      steps: [],
      pattern,
      status: ThinkingChainStatus.IDLE,
      overallConfidence: 0,
      startedAt: Date.now(),
    };
    
    this.chains.set(chainId, chain);
    
    this.emit(ThinkingEventType.CHAIN_STARTED, { chainId, topic, pattern });
    
    return chain;
  }

  /**
   * Get a thinking chain by ID (synchronous)
   */
  public getChain(chainId: ThinkingChainId): ThinkingChain | undefined {
    return this.chains.get(chainId);
  }

  /**
   * Get all thinking chains (synchronous)
   */
  public getAllChains(): ThinkingChain[] {
    return Array.from(this.chains.values());
  }

  /**
   * Execute a thinking chain
   */
  public async executeChain(
    chainId: ThinkingChainId,
    input: unknown
  ): Promise<ThinkingChain> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    chain.status = ThinkingChainStatus.IN_PROGRESS;
    this.activeChain = chainId;
    
    try {
      // Execute based on reasoning pattern
      switch (chain.pattern) {
        case ReasoningPattern.DEDDUCTIVE:
          await this.executeDeductive(chain, input);
          break;
        case ReasoningPattern.INDUCTIVE:
          await this.executeInductive(chain, input);
          break;
        case ReasoningPattern.ABDUCTIVE:
          await this.executeAbductive(chain, input);
          break;
        case ReasoningPattern.ANALOGICAL:
          await this.executeAnalogical(chain, input);
          break;
        case ReasoningPattern.CAUSAL:
          await this.executeCausal(chain, input);
          break;
        default:
          await this.executeDeductive(chain, input);
      }
      
      // Perform reflection if enabled
      if (this.config.reflection.enabled) {
        await this.performReflection(chain);
      }
      
      // Complete the chain
      chain.status = ThinkingChainStatus.COMPLETED;
      chain.completedAt = Date.now();
      chain.duration = chain.completedAt - chain.startedAt;
      
      // Calculate overall confidence
      chain.overallConfidence = this.calculateOverallConfidence(chain);
      
      this.emit(ThinkingEventType.CHAIN_COMPLETED, { chainId, chain });
      
    } catch (error) {
      chain.status = ThinkingChainStatus.FAILED;
      chain.completedAt = Date.now();
      chain.duration = chain.completedAt - chain.startedAt;
      chain.conclusion = `Failed: ${error}`;
      
      this.emit(ThinkingEventType.CHAIN_FAILED, { chainId, error });
      throw error;
    } finally {
      this.activeChain = null;
    }
    
    return chain;
  }

  // =========================================================================
  // Reasoning Patterns
  // =========================================================================

  /**
   * Execute deductive reasoning (General to Specific)
   */
  private async executeDeductive(
    chain: ThinkingChain,
    input: unknown
  ): Promise<void> {
    // Step 1: Observe the input
    const observation = await this.addStep(chain.id, {
      type: ThinkingStepType.OBSERVATION,
      content: `Observing input: ${JSON.stringify(input)}`,
      confidence: 1.0,
    });
    
    // Step 2: Analyze the input
    const analysis = await this.addStep(chain.id, {
      type: ThinkingStepType.ANALYSIS,
      content: 'Analyzing input against known principles',
      dependencies: [observation.id],
    });
    
    // Step 3: Apply general rules
    const inference = await this.addStep(chain.id, {
      type: ThinkingStepType.INFERENCE,
      content: 'Applying general rules to specific case',
      reasoning: 'Deductive inference from general principles',
      dependencies: [analysis.id],
    });
    
    // Step 4: Draw conclusion
    const decision = await this.addStep(chain.id, {
      type: ThinkingStepType.DECISION,
      content: 'Conclusion based on deductive reasoning',
      dependencies: [inference.id],
    });
    
    chain.conclusion = decision.content;
  }

  /**
   * Execute inductive reasoning (Specific to General)
   */
  private async executeInductive(
    chain: ThinkingChain,
    input: unknown
  ): Promise<void> {
    // Step 1: Observe specific instances
    const observation = await this.addStep(chain.id, {
      type: ThinkingStepType.OBSERVATION,
      content: `Observing specific instances: ${JSON.stringify(input)}`,
      confidence: 1.0,
    });
    
    // Step 2: Identify patterns
    const analysis = await this.addStep(chain.id, {
      type: ThinkingStepType.ANALYSIS,
      content: 'Identifying patterns from observations',
      dependencies: [observation.id],
    });
    
    // Step 3: Form hypothesis
    const hypothesis = await this.addStep(chain.id, {
      type: ThinkingStepType.HYPOTHESIS,
      content: 'Forming generalization from patterns',
      reasoning: 'Inductive generalization',
      dependencies: [analysis.id],
    });
    
    // Step 4: Validate hypothesis
    const validation = await this.addStep(chain.id, {
      type: ThinkingStepType.VALIDATION,
      content: 'Validating generalization',
      dependencies: [hypothesis.id],
    });
    
    // Step 5: Draw conclusion
    const decision = await this.addStep(chain.id, {
      type: ThinkingStepType.DECISION,
      content: 'Generalization based on inductive reasoning',
      dependencies: [validation.id],
    });
    
    chain.conclusion = decision.content;
  }

  /**
   * Execute abductive reasoning (Best Explanation)
   */
  private async executeAbductive(
    chain: ThinkingChain,
    input: unknown
  ): Promise<void> {
    // Step 1: Observe phenomenon
    const observation = await this.addStep(chain.id, {
      type: ThinkingStepType.OBSERVATION,
      content: `Observing phenomenon: ${JSON.stringify(input)}`,
      confidence: 1.0,
    });
    
    // Step 2: Generate possible explanations
    const analysis = await this.addStep(chain.id, {
      type: ThinkingStepType.ANALYSIS,
      content: 'Generating possible explanations',
      dependencies: [observation.id],
    });
    
    // Step 3: Evaluate explanations
    const evaluation = await this.addStep(chain.id, {
      type: ThinkingStepType.EVALUATION,
      content: 'Evaluating possible explanations',
      reasoning: 'Comparing explanatory power',
      dependencies: [analysis.id],
    });
    
    // Step 4: Select best explanation
    const decision = await this.addStep(chain.id, {
      type: ThinkingStepType.DECISION,
      content: 'Best explanation selected',
      dependencies: [evaluation.id],
    });
    
    chain.conclusion = decision.content;
  }

  /**
   * Execute analogical reasoning (Similarity-based)
   */
  private async executeAnalogical(
    chain: ThinkingChain,
    input: unknown
  ): Promise<void> {
    // Step 1: Analyze current situation
    const observation = await this.addStep(chain.id, {
      type: ThinkingStepType.OBSERVATION,
      content: `Analyzing current situation: ${JSON.stringify(input)}`,
      confidence: 1.0,
    });
    
    // Step 2: Find similar cases
    const analysis = await this.addStep(chain.id, {
      type: ThinkingStepType.ANALYSIS,
      content: 'Finding similar past cases',
      dependencies: [observation.id],
    });
    
    // Step 3: Map similarities
    const inference = await this.addStep(chain.id, {
      type: ThinkingStepType.INFERENCE,
      content: 'Mapping similarities between cases',
      reasoning: 'Analogical mapping',
      dependencies: [analysis.id],
    });
    
    // Step 4: Apply solution from similar case
    const decision = await this.addStep(chain.id, {
      type: ThinkingStepType.DECISION,
      content: 'Solution based on analogy',
      dependencies: [inference.id],
    });
    
    chain.conclusion = decision.content;
  }

  /**
   * Execute causal reasoning (Cause and Effect)
   */
  private async executeCausal(
    chain: ThinkingChain,
    input: unknown
  ): Promise<void> {
    // Step 1: Observe effect
    const observation = await this.addStep(chain.id, {
      type: ThinkingStepType.OBSERVATION,
      content: `Observing effect: ${JSON.stringify(input)}`,
      confidence: 1.0,
    });
    
    // Step 2: Identify possible causes
    const analysis = await this.addStep(chain.id, {
      type: ThinkingStepType.ANALYSIS,
      content: 'Identifying possible causes',
      dependencies: [observation.id],
    });
    
    // Step 3: Test causal relationships
    const validation = await this.addStep(chain.id, {
      type: ThinkingStepType.VALIDATION,
      content: 'Testing causal relationships',
      reasoning: 'Causal validation',
      dependencies: [analysis.id],
    });
    
    // Step 4: Determine most likely cause
    const decision = await this.addStep(chain.id, {
      type: ThinkingStepType.DECISION,
      content: 'Most likely cause determined',
      dependencies: [validation.id],
    });
    
    chain.conclusion = decision.content;
  }

  // =========================================================================
  // Step Management
  // =========================================================================

  /**
   * Add a step to a thinking chain
   */
  public async addStep(
    chainId: ThinkingChainId,
    step: {
      type: ThinkingStepType;
      content: string;
    }
  ): Promise<ThinkingStep> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    const fullStep: ThinkingStep = {
      id: this.generateStepId(),
      chainId,
      type: step.type,
      content: step.content,
      confidence: 0.7,
      validated: false,
      dependencies: [],
      metadata: {},
      createdAt: Date.now(),
      status: ThinkingStepStatus.PENDING,
    };
    
    chain.steps.push(fullStep);
    
    // Cache step
    if (this.config.performance.cacheEnabled) {
      this.stepCache.set(fullStep.id, fullStep);
    }
    
    this.emit(ThinkingEventType.STEP_ADDED, { chainId, step: fullStep });
    
    return fullStep;
  }

  /**
   * Get steps from a chain (synchronous)
   */
  public getSteps(chainId: ThinkingChainId): ThinkingStep[] {
    const chain = this.chains.get(chainId);
    return chain?.steps || [];
  }

  /**
   * Get a step by ID (synchronous)
   */
  public getStep(stepId: ThinkingStepId): ThinkingStep | undefined {
    // First check the cache
    const cached = this.stepCache.get(stepId);
    if (cached) return cached;
    
    // Search in all chains
    for (const chain of this.chains.values()) {
      const step = chain.steps.find(s => s.id === stepId);
      if (step) return step;
    }
    
    return undefined;
  }

  /**
   * Update step status
   */
  public async updateStepStatus(stepId: ThinkingStepId, status: ThinkingStepStatus): Promise<void> {
    const step = this.getStep(stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }
    
    step.status = status;
    
    if (status === ThinkingStepStatus.COMPLETED) {
      step.completedAt = Date.now();
      step.duration = step.completedAt - step.createdAt;
    }
    
    this.emit(ThinkingEventType.STEP_COMPLETED, { stepId, status });
  }

  /**
   * Get last step of a specific type
   */
  public async getLastStepOfType(
    chainId: ThinkingChainId,
    type: ThinkingStepType
  ): Promise<ThinkingStep | undefined> {
    const chain = this.chains.get(chainId);
    if (!chain) return undefined;
    
    for (let i = chain.steps.length - 1; i >= 0; i--) {
      if (chain.steps[i].type === type) {
        return chain.steps[i];
      }
    }
    
    return undefined;
  }

  // =========================================================================
  // Chain Lifecycle Control
  // =========================================================================

  /**
   * Start a chain (set status to RUNNING)
   */
  public async startChain(chainId: ThinkingChainId): Promise<void> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    chain.status = ThinkingChainStatus.RUNNING;
    this.activeChain = chainId;
    
    this.emit(ThinkingEventType.CHAIN_STARTED, { chainId });
  }

  /**
   * Complete a chain
   */
  public async completeChain(chainId: ThinkingChainId): Promise<void> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    chain.status = ThinkingChainStatus.COMPLETED;
    chain.completedAt = Date.now();
    chain.duration = chain.completedAt - chain.startedAt;
    chain.overallConfidence = this.calculateOverallConfidence(chain);
    
    if (this.activeChain === chainId) {
      this.activeChain = null;
    }
    
    this.emit(ThinkingEventType.CHAIN_COMPLETED, { chainId, chain });
  }

  /**
   * Fail a chain
   */
  public async failChain(chainId: ThinkingChainId, reason: string): Promise<void> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    chain.status = ThinkingChainStatus.FAILED;
    chain.completedAt = Date.now();
    chain.duration = chain.completedAt - chain.startedAt;
    chain.conclusion = `Failed: ${reason}`;
    
    if (this.activeChain === chainId) {
      this.activeChain = null;
    }
    
    this.emit(ThinkingEventType.CHAIN_FAILED, { chainId, error: reason });
  }

  // =========================================================================
  // Reflection
  // =========================================================================

  /**
   * Perform reflection on a chain
   */
  public async performReflection(chain: ThinkingChain): Promise<ReflectionResult> {
    const result: ReflectionResult = {
      chainId: chain.id,
      overallAssessment: '',
      strengths: [],
      weaknesses: [],
      improvements: [],
      confidence: 0,
      recommendations: [],
    };
    
    // Analyze steps
    const completedSteps = chain.steps.filter(s => s.status === ThinkingStepStatus.COMPLETED);
    const failedSteps = chain.steps.filter(s => s.status === ThinkingStepStatus.FAILED);
    
    // Identify strengths
    if (completedSteps.length === chain.steps.length) {
      result.strengths.push('All steps completed successfully');
    }
    
    // Calculate average step confidence
    const avgConfidence = chain.steps.length > 0 
      ? chain.steps.reduce((sum, s) => sum + s.confidence, 0) / chain.steps.length 
      : 0;
    
    if (avgConfidence > 0.8) {
      result.strengths.push('High confidence in reasoning');
    }
    
    // Identify weaknesses
    if (failedSteps.length > 0) {
      result.weaknesses.push(`${failedSteps.length} steps failed`);
    }
    if (avgConfidence < 0.5) {
      result.weaknesses.push('Low confidence in reasoning');
    }
    
    // Generate improvements
    if (result.weaknesses.length > 0) {
      result.improvements.push('Consider alternative reasoning patterns');
      result.improvements.push('Gather more information before reasoning');
    }
    
    // Calculate reflection confidence
    result.confidence = avgConfidence;
    
    // Generate recommendations
    if (result.confidence < 0.7) {
      result.recommendations.push('Verify conclusions with additional validation');
    }
    
    // Add reflection step to chain
    await this.addStep(chain.id, {
      type: ThinkingStepType.REFLECTION,
      content: result.overallAssessment || 'Reflection completed',
    });
    
    this.emit(ThinkingEventType.REFLECTION, { chainId: chain.id, result });
    
    return result;
  }

  /**
   * Apply self-correction
   */
  public async applyCorrection(
    chainId: ThinkingChainId,
    stepId: ThinkingStepId,
    correctedContent: string,
    reason: string
  ): Promise<SelfCorrection> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    const step = chain.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }
    
    const correction: SelfCorrection = {
      stepId,
      originalContent: step.content,
      correctedContent,
      reason,
      confidence: step.confidence,
    };
    
    // Apply correction
    step.content = correctedContent;
    step.reasoning = `${step.reasoning}\nCorrection: ${reason}`;
    step.validated = true;
    
    chain.metrics.backtrackingCount++;
    
    this.emit(ThinkingEventType.CORRECTION, { chainId, correction });
    
    return correction;
  }

  // =========================================================================
  // Planning
  // =========================================================================

  /**
   * Create a plan for a chain
   */
  public async createPlan(
    chainId: ThinkingChainId,
    goal: string,
    subtasks: string[]
  ): Promise<Plan> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }
    
    const plan: Plan = {
      id: `plan_${Date.now()}`,
      chainId,
      steps: subtasks.map((task, index) => ({
        id: `plan_step_${index}`,
        description: task,
        dependencies: index > 0 ? [`plan_step_${index - 1}`] : [],
        estimatedComplexity: 0.5,
        priority: index,
        status: 'pending' as const,
      })),
      totalEstimatedComplexity: subtasks.length * 0.5,
      createdAt: Date.now(),
    };
    
    // Add plan step to chain
    await this.addStep(chainId, {
      type: ThinkingStepType.PLAN,
      content: `Plan created for: ${goal}`,
      reasoning: JSON.stringify(plan),
    });
    
    this.emit(ThinkingEventType.PLAN_CREATED, { chainId, plan });
    
    return plan;
  }

  // =========================================================================
  // Hypothesis Management
  // =========================================================================

  /**
   * Propose a hypothesis
   */
  public async proposeHypothesis(
    chainId: ThinkingChainId,
    content: string,
    evidence: string[] = []
  ): Promise<Hypothesis> {
    const hypothesis: Hypothesis = {
      id: `hyp_${Date.now()}`,
      chainId,
      content,
      confidence: 0.5,
      evidence,
      counterEvidence: [],
      status: 'proposed',
      createdAt: Date.now(),
    };
    
    this.emit(ThinkingEventType.HYPOTHESIS_PROPOSED, { chainId, hypothesis });
    
    return hypothesis;
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Validate a thinking step
   */
  private validateStep(step: ThinkingStep, chain: ThinkingChain): boolean {
    // Check dependencies
    for (const depId of step.dependencies) {
      const dep = chain.steps.find(s => s.id === depId);
      if (!dep || dep.status !== ThinkingStepStatus.COMPLETED) {
        return false;
      }
    }
    
    // Check confidence threshold
    if (step.confidence < this.config.reasoning.minConfidence) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate overall confidence for a chain
   */
  private calculateOverallConfidence(chain: ThinkingChain): number {
    if (chain.steps.length === 0) return 0;
    
    // Weight recent steps more heavily
    const weights = chain.steps.map((_, index) => 
      Math.exp(index / chain.steps.length)
    );
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    const weightedConfidence = chain.steps.reduce((sum, step, index) => 
      sum + step.confidence * weights[index], 0
    ) / totalWeight;
    
    // Factor in reflection if available
    const reflectionSteps = chain.steps.filter(s => s.type === ThinkingStepType.REFLECTION);
    if (reflectionSteps.length > 0) {
      const reflectionConfidence = reflectionSteps.reduce((sum, s) => sum + s.confidence, 0) / reflectionSteps.length;
      return (weightedConfidence + reflectionConfidence) / 2;
    }
    
    return weightedConfidence;
  }

  /**
   * Generate unique chain ID
   */
  private generateChainId(): ThinkingChainId {
    return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique step ID
   */
  private generateStepId(): ThinkingStepId {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): ThinkingStatistics {
    return {
      totalChains: 0,
      completedChains: 0,
      failedChains: 0,
      averageChainDuration: 0,
      averageStepsPerChain: 0,
      averageConfidence: 0,
      chainsByPattern: {} as Record<ReasoningPattern, number>,
      stepsByType: {} as Record<ThinkingStepType, number>,
      reflectionCount: 0,
      correctionCount: 0,
      hypothesisCount: 0,
      cacheHitRate: 0,
    };
  }

  // =========================================================================
  // Public API - Statistics
  // =========================================================================

  /**
   * Get thinking statistics
   */
  public getStatistics(): ThinkingStatistics {
    const chains = Array.from(this.chains.values());
    
    const completedChains = chains.filter(c => c.status === ThinkingChainStatus.COMPLETED);
    const failedChains = chains.filter(c => c.status === ThinkingChainStatus.FAILED);
    
    const chainsByPattern: Record<ReasoningPattern, number> = {} as any;
    const stepsByType: Record<ThinkingStepType, number> = {} as any;
    
    let totalSteps = 0;
    let totalConfidence = 0;
    let totalDuration = 0;
    let reflectionCount = 0;
    
    for (const chain of chains) {
      chainsByPattern[chain.pattern] = (chainsByPattern[chain.pattern] || 0) + 1;
      totalSteps += chain.steps.length;
      totalConfidence += chain.overallConfidence;
      
      if (chain.duration) {
        totalDuration += chain.duration;
      }
      
      // Count reflection steps
      reflectionCount += chain.steps.filter(s => s.type === ThinkingStepType.REFLECTION).length;
      
      for (const step of chain.steps) {
        stepsByType[step.type] = (stepsByType[step.type] || 0) + 1;
      }
    }
    
    return {
      totalChains: chains.length,
      completedChains: completedChains.length,
      failedChains: failedChains.length,
      averageChainDuration: chains.length > 0 ? totalDuration / chains.length : 0,
      averageStepsPerChain: chains.length > 0 ? totalSteps / chains.length : 0,
      averageConfidence: chains.length > 0 ? totalConfidence / chains.length : 0,
      chainsByPattern,
      stepsByType,
      reflectionCount,
      correctionCount: 0,
      hypothesisCount: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * Clear all chains
   */
  public async clear(): Promise<void> {
    this.chains.clear();
    this.stepCache.clear();
    this.stats = this.initializeStats();
  }
}
