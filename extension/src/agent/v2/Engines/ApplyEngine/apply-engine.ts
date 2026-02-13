/**
 * @fileoverview ApplyEngine - 多轮工具执行引擎
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

import { EventEmitter } from 'events';
import {
  ExecutionPlanId,
  ExecutionStepId,
  ExecutionSessionId,
  ExecutionPlan,
  ExecutionStep,
  ExecutionStepStatus,
  ExecutionStepResult,
  ExecutionPlanStatus,
  ExecutionPlanConfig,
  ExecutionPlanMetrics,
  ExecutionMode,
  ExecutionError,
  ExecutionSession,
  SessionState,
  SessionContext,
  ExecutionHistory,
  DependencyGraph,
  SideEffect,
  RollbackData,
  RollbackAction,
  PermissionLevel,
  PermissionRule,
  PermissionRequest,
  PermissionDecision,
  ApplyEngineConfig,
  ApplyEngineStatistics,
  ApplyEventType,
  ApplyEvent,
  ExecutionPlanSchema,
} from './types';

/**
 * Default Apply Engine Configuration
 */
const DEFAULT_CONFIG: ApplyEngineConfig = {
  execution: {
    defaultMode: ExecutionMode.ADAPTIVE,
    maxParallel: 5,
    defaultTimeout: 30000,
    maxTimeout: 300000,
    enableRetry: true,
    maxRetries: 3,
  },
  permissions: {
    defaultLevel: PermissionLevel.EXECUTE,
    autoApproveSafe: true,
    requireApprovalFor: [],
    cacheDecisions: true,
    auditEnabled: true,
  },
  rollback: {
    enabled: true,
    autoRollback: true,
    maxRollbackSteps: 10,
    preserveRollbackData: true,
  },
  performance: {
    maxConcurrentPlans: 3,
    maxConcurrentSteps: 10,
    queueSize: 100,
    cacheResults: true,
    cacheSize: 500,
  },
  logging: {
    enabled: true,
    level: 'info',
    logInput: true,
    logOutput: false,
    logPermissions: true,
  },
};

/**
 * ApplyEngine - Multi-round Tool Execution Engine
 */
export class ApplyEngine extends EventEmitter {
  private config: ApplyEngineConfig;
  
  // Sessions
  private sessions: Map<ExecutionSessionId, ExecutionSession> = new Map();
  private currentSession: ExecutionSessionId | null = null;
  
  // Plans
  private plans: Map<ExecutionPlanId, ExecutionPlan> = new Map();
  
  // Execution state
  private activeSteps: Map<ExecutionStepId, AbortController> = new Map();
  private stepQueue: ExecutionStep[] = [];
  
  // Permissions
  private permissionRules: Map<string, PermissionRule> = new Map();
  private permissionCache: Map<string, PermissionDecision> = new Map();
  private pendingPermissions: Map<string, PermissionRequest> = new Map();
  
  // Rollback
  private rollbackStack: RollbackData[] = [];
  
  // Statistics
  private stats: ApplyEngineStatistics;
  
  // State
  private isInitialized: boolean = false;

  constructor(config: Partial<ApplyEngineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as ApplyEngineConfig;
    this.stats = this.initializeStats();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the apply engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the apply engine
   */
  public async shutdown(): Promise<void> {
    // Cancel all active steps
    for (const [id, controller] of this.activeSteps) {
      controller.abort();
    }
    
    this.sessions.clear();
    this.plans.clear();
    this.activeSteps.clear();
    this.stepQueue = [];
    this.permissionRules.clear();
    this.permissionCache.clear();
    this.pendingPermissions.clear();
    this.rollbackStack = [];
    
    this.isInitialized = false;
    this.emit('shutdown');
  }

  // =========================================================================
  // Session Management
  // =========================================================================

  /**
   * Create a new execution session
   */
  public async createSession(context: SessionContext): Promise<ExecutionSession> {
    const sessionId = this.generateSessionId();
    
    const session: ExecutionSession = {
      id: sessionId,
      plans: [],
      state: {
        status: 'idle',
        progress: 0,
      },
      context,
      permissions: [],
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    this.sessions.set(sessionId, session);
    
    return session;
  }

  /**
   * Get session
   */
  public async getSession(sessionId: ExecutionSessionId): Promise<ExecutionSession | undefined> {
    return this.sessions.get(sessionId);
  }

  /**
   * Set current session
   */
  public setCurrentSession(sessionId: ExecutionSessionId): void {
    this.currentSession = sessionId;
  }

  // =========================================================================
  // Plan Management
  // =========================================================================

  /**
   * Create an execution plan
   */
  public async createPlan(
    sessionId: ExecutionSessionId,
    steps: Omit<ExecutionStep, 'id' | 'planId' | 'status' | 'result' | 'retryCount' | 'dependents'>[],
    config?: Partial<ExecutionPlanConfig>
  ): Promise<ExecutionPlan> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const planId = this.generatePlanId();
    
    // Create execution steps
    const executionSteps: ExecutionStep[] = steps.map((step, index) => ({
      ...step,
      id: this.generateStepId(),
      planId,
      status: ExecutionStepStatus.PENDING,
      retryCount: 0,
      maxRetries: step.maxRetries ?? this.config.execution.maxRetries,
      dependents: [],
    }));
    
    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(executionSteps);
    
    // Create plan
    const plan: ExecutionPlan = {
      id: planId,
      sessionId,
      steps: executionSteps,
      dependencyGraph,
      config: {
        mode: config?.mode ?? this.config.execution.defaultMode,
        maxParallel: config?.maxParallel ?? this.config.execution.maxParallel,
        retryFailed: config?.retryFailed ?? this.config.execution.enableRetry,
        maxRetries: config?.maxRetries ?? this.config.execution.maxRetries,
        retryDelay: config?.retryDelay ?? 1000,
        enableRollback: config?.enableRollback ?? this.config.rollback.enabled,
        rollbackOnFailure: config?.rollbackOnFailure ?? this.config.rollback.autoRollback,
        autoApprove: config?.autoApprove ?? this.config.permissions.autoApproveSafe,
        requireApproval: config?.requireApproval ?? this.config.permissions.requireApprovalFor,
        stepTimeout: config?.stepTimeout ?? this.config.execution.defaultTimeout,
        planTimeout: config?.planTimeout ?? this.config.execution.maxTimeout,
      },
      status: ExecutionPlanStatus.CREATED,
      createdAt: Date.now(),
      metrics: {
        totalSteps: executionSteps.length,
        completedSteps: 0,
        failedSteps: 0,
        skippedSteps: 0,
        totalDuration: 0,
        averageStepDuration: 0,
        parallelism: 0,
        efficiency: 0,
        rollbackCount: 0,
        permissionRequests: 0,
      },
    };
    
    // Add to session
    session.plans.push(planId);
    session.updatedAt = Date.now();
    
    // Store plan
    this.plans.set(planId, plan);
    
    this.emit(ApplyEventType.PLAN_CREATED, { planId, plan });
    
    return plan;
  }

  /**
   * Execute a plan
   */
  public async executePlan(planId: ExecutionPlanId): Promise<ExecutionPlan> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }
    
    const session = this.sessions.get(plan.sessionId);
    if (!session) {
      throw new Error(`Session ${plan.sessionId} not found`);
    }
    
    // Validate plan
    plan.status = ExecutionPlanStatus.VALIDATING;
    const validation = this.validatePlan(plan);
    if (!validation.valid) {
      plan.status = ExecutionPlanStatus.FAILED;
      throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Start execution
    plan.status = ExecutionPlanStatus.RUNNING;
    plan.startedAt = Date.now();
    
    session.state.status = 'running';
    session.currentPlan = planId;
    
    this.emit(ApplyEventType.PLAN_STARTED, { planId });
    
    try {
      // Execute based on mode
      switch (plan.config.mode) {
        case ExecutionMode.SEQUENTIAL:
          await this.executeSequential(plan);
          break;
        case ExecutionMode.PARALLEL:
          await this.executeParallel(plan);
          break;
        case ExecutionMode.ADAPTIVE:
          await this.executeAdaptive(plan);
          break;
        case ExecutionMode.PRIORITY:
          await this.executeByPriority(plan);
          break;
      }
      
      // Complete plan
      plan.status = ExecutionPlanStatus.COMPLETED;
      plan.completedAt = Date.now();
      plan.metrics.totalDuration = plan.completedAt - (plan.startedAt || plan.createdAt);
      
      session.state.status = 'completed';
      session.state.progress = 100;
      
      this.emit(ApplyEventType.PLAN_COMPLETED, { planId, plan });
      
    } catch (error) {
      plan.status = ExecutionPlanStatus.FAILED;
      plan.completedAt = Date.now();
      
      session.state.status = 'failed';
      session.state.error = {
        code: 'PLAN_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        recoverable: false,
      };
      
      // Rollback if enabled
      if (plan.config.rollbackOnFailure) {
        await this.rollbackPlan(plan);
      }
      
      this.emit(ApplyEventType.PLAN_FAILED, { planId, error });
      throw error;
    } finally {
      session.updatedAt = Date.now();
    }
    
    return plan;
  }

  /**
   * Execute steps sequentially
   */
  private async executeSequential(plan: ExecutionPlan): Promise<void> {
    for (const step of plan.steps) {
      if (plan.status !== ExecutionPlanStatus.RUNNING) break;
      
      await this.executeStep(plan, step);
    }
  }

  /**
   * Execute steps in parallel
   */
  private async executeParallel(plan: ExecutionPlan): Promise<void> {
    // Get all steps with no dependencies
    const readySteps = plan.steps.filter(
      s => s.dependencies.length === 0 && s.status === ExecutionStepStatus.PENDING
    );
    
    // Execute in parallel batches
    while (readySteps.length > 0 || plan.steps.some(s => s.status === ExecutionStepStatus.PENDING)) {
      if (plan.status !== ExecutionPlanStatus.RUNNING) break;
      
      // Get next batch of ready steps
      const batch = readySteps.splice(0, plan.config.maxParallel);
      
      // Execute batch
      await Promise.all(batch.map(step => this.executeStep(plan, step)));
      
      // Find newly ready steps
      for (const step of plan.steps) {
        if (step.status === ExecutionStepStatus.PENDING && this.areDependenciesMet(plan, step)) {
          if (!readySteps.includes(step)) {
            readySteps.push(step);
          }
        }
      }
    }
  }

  /**
   * Execute steps adaptively
   */
  private async executeAdaptive(plan: ExecutionPlan): Promise<void> {
    const executing = new Set<Promise<void>>();
    
    while (plan.steps.some(s => s.status === ExecutionStepStatus.PENDING || s.status === ExecutionStepStatus.RUNNING)) {
      if (plan.status !== ExecutionPlanStatus.RUNNING) break;
      
      // Find ready steps
      const readySteps = plan.steps.filter(
        s => s.status === ExecutionStepStatus.PENDING && this.areDependenciesMet(plan, s)
      );
      
      // Start executing ready steps up to max parallel
      while (executing.size < plan.config.maxParallel && readySteps.length > 0) {
        const step = readySteps.shift()!;
        const promise = this.executeStep(plan, step).then(() => executing.delete(promise));
        executing.add(promise);
      }
      
      // Wait for at least one step to complete
      if (executing.size > 0) {
        await Promise.race(executing);
      }
    }
    
    // Wait for all remaining executions
    await Promise.all(executing);
  }

  /**
   * Execute steps by priority
   */
  private async executeByPriority(plan: ExecutionPlan): Promise<void> {
    // Sort steps by priority
    const sortedSteps = [...plan.steps].sort((a, b) => b.priority - a.priority);
    
    for (const step of sortedSteps) {
      if (plan.status !== ExecutionPlanStatus.RUNNING) break;
      
      // Wait for dependencies
      await this.waitForDependencies(plan, step);
      
      await this.executeStep(plan, step);
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(plan: ExecutionPlan, step: ExecutionStep): Promise<void> {
    // Check permissions
    const hasPermission = await this.checkPermission(plan, step);
    if (!hasPermission) {
      step.status = ExecutionStepStatus.WAITING_PERMISSION;
      const decision = await this.requestPermission(plan, step);
      if (!decision.granted) {
        step.status = ExecutionStepStatus.SKIPPED;
        plan.metrics.skippedSteps++;
        return;
      }
    }
    
    // Update status
    step.status = ExecutionStepStatus.RUNNING;
    step.startedAt = Date.now();
    
    this.activeSteps.set(step.id, new AbortController());
    
    this.emit(ApplyEventType.STEP_STARTED, { planId: plan.id, stepId: step.id, step });
    
    try {
      // Execute tool (placeholder - actual execution would call ToolsEngine)
      const result = await this.executeTool(step);
      
      // Update step
      step.result = result;
      step.status = result.success ? ExecutionStepStatus.COMPLETED : ExecutionStepStatus.FAILED;
      step.completedAt = Date.now();
      step.duration = step.completedAt - (step.startedAt || step.createdAt);
      
      // Update metrics
      if (result.success) {
        plan.metrics.completedSteps++;
      } else {
        plan.metrics.failedSteps++;
        
        // Retry if enabled
        if (plan.config.retryFailed && step.retryCount < step.maxRetries) {
          step.retryCount++;
          step.status = ExecutionStepStatus.PENDING;
          await this.executeStep(plan, step);
          return;
        }
      }
      
      // Store rollback data
      if (plan.config.enableRollback && result.sideEffects) {
        this.rollbackStack.push({
          stepId: step.id,
          sideEffects: result.sideEffects,
          rollbackActions: [],
        });
      }
      
      this.emit(ApplyEventType.STEP_COMPLETED, { planId: plan.id, stepId: step.id, result });
      
    } catch (error) {
      step.status = ExecutionStepStatus.FAILED;
      step.completedAt = Date.now();
      step.duration = step.completedAt - (step.startedAt || step.createdAt);
      step.result = {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
      
      plan.metrics.failedSteps++;
      
      this.emit(ApplyEventType.STEP_FAILED, { planId: plan.id, stepId: step.id, error });
      
      throw error;
    } finally {
      this.activeSteps.delete(step.id);
    }
  }

  /**
   * Execute tool (placeholder)
   */
  private async executeTool(step: ExecutionStep): Promise<ExecutionStepResult> {
    // Placeholder - actual implementation would call ToolsEngine
    return {
      success: true,
      output: { message: `Tool ${step.toolName} executed successfully` },
    };
  }

  // =========================================================================
  // Dependency Management
  // =========================================================================

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(steps: ExecutionStep[]): DependencyGraph {
    const nodes = new Map<ExecutionStepId, ExecutionStep>();
    const edges = new Map<ExecutionStepId, ExecutionStepId[]>();
    const reverseEdges = new Map<ExecutionStepId, ExecutionStepId[]>();
    
    for (const step of steps) {
      nodes.set(step.id, step);
      edges.set(step.id, step.dependencies);
      reverseEdges.set(step.id, []);
    }
    
    // Build reverse edges
    for (const step of steps) {
      for (const depId of step.dependencies) {
        const dependents = reverseEdges.get(depId) || [];
        dependents.push(step.id);
        reverseEdges.set(depId, dependents);
        
        // Update step's dependents
        const depStep = nodes.get(depId);
        if (depStep) {
          depStep.dependents.push(step.id);
        }
      }
    }
    
    return { nodes, edges, reverseEdges };
  }

  /**
   * Check if dependencies are met
   */
  private areDependenciesMet(plan: ExecutionPlan, step: ExecutionStep): boolean {
    return step.dependencies.every(depId => {
      const depStep = plan.steps.find(s => s.id === depId);
      return depStep?.status === ExecutionStepStatus.COMPLETED;
    });
  }

  /**
   * Wait for dependencies
   */
  private async waitForDependencies(plan: ExecutionPlan, step: ExecutionStep): Promise<void> {
    const checkDependencies = () => this.areDependenciesMet(plan, step);
    
    while (!checkDependencies()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // =========================================================================
  // Permission Management
  // =========================================================================

  /**
   * Check permission for step
   */
  private async checkPermission(plan: ExecutionPlan, step: ExecutionStep): Promise<boolean> {
    // Check if auto-approve
    if (plan.config.autoApprove && !plan.config.requireApproval.includes(step.toolId)) {
      return true;
    }
    
    // Check cached decisions
    const cacheKey = `${plan.sessionId}:${step.toolId}`;
    const cached = this.permissionCache.get(cacheKey);
    if (cached) {
      return cached.granted;
    }
    
    return false;
  }

  /**
   * Request permission
   */
  private async requestPermission(plan: ExecutionPlan, step: ExecutionStep): Promise<PermissionDecision> {
    const request: PermissionRequest = {
      id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stepId: step.id,
      toolId: step.toolId,
      level: PermissionLevel.EXECUTE,
      reason: `Tool "${step.toolName}" requires permission to execute`,
      context: step.input,
      timestamp: Date.now(),
    };
    
    this.pendingPermissions.set(request.id, request);
    plan.metrics.permissionRequests++;
    
    this.emit(ApplyEventType.PERMISSION_REQUESTED, { requestId: request.id, request });
    
    // In a real implementation, this would wait for user input
    // For now, auto-approve
    const decision: PermissionDecision = {
      requestId: request.id,
      granted: true,
      level: PermissionLevel.EXECUTE,
      temporary: false,
      timestamp: Date.now(),
    };
    
    this.pendingPermissions.delete(request.id);
    
    this.emit(ApplyEventType.PERMISSION_GRANTED, { requestId: request.id, decision });
    
    return decision;
  }

  // =========================================================================
  // Rollback
  // =========================================================================

  /**
   * Rollback a plan
   */
  public async rollbackPlan(plan: ExecutionPlan): Promise<void> {
    if (!this.config.rollback.enabled) {
      return;
    }
    
    this.emit(ApplyEventType.ROLLBACK_STARTED, { planId: plan.id });
    
    // Execute rollback actions in reverse order
    while (this.rollbackStack.length > 0) {
      const rollbackData = this.rollbackStack.pop()!;
      
      for (const action of rollbackData.rollbackActions) {
        try {
          await action.execute();
        } catch (error) {
          console.error(`Rollback action failed: ${action.description}`, error);
        }
      }
    }
    
    plan.status = ExecutionPlanStatus.ROLLED_BACK;
    plan.metrics.rollbackCount++;
    
    this.emit(ApplyEventType.ROLLBACK_COMPLETED, { planId: plan.id });
  }

  // =========================================================================
  // Validation
  // =========================================================================

  /**
   * Validate a plan
   */
  private validatePlan(plan: ExecutionPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for circular dependencies
    if (this.hasCircularDependencies(plan)) {
      errors.push('Plan contains circular dependencies');
    }
    
    // Check for missing dependencies
    for (const step of plan.steps) {
      for (const depId of step.dependencies) {
        if (!plan.steps.find(s => s.id === depId)) {
          errors.push(`Step ${step.id} has missing dependency: ${depId}`);
        }
      }
    }
    
    // Check for duplicate step IDs
    const stepIds = new Set<string>();
    for (const step of plan.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Check for circular dependencies
   */
  private hasCircularDependencies(plan: ExecutionPlan): boolean {
    const visited = new Set<ExecutionStepId>();
    const recursionStack = new Set<ExecutionStepId>();
    
    const hasCycle = (stepId: ExecutionStepId): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const step = plan.steps.find(s => s.id === stepId);
      if (step) {
        for (const depId of step.dependencies) {
          if (!visited.has(depId)) {
            if (hasCycle(depId)) return true;
          } else if (recursionStack.has(depId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    for (const step of plan.steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) return true;
      }
    }
    
    return false;
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Generate session ID
   */
  private generateSessionId(): ExecutionSessionId {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate plan ID
   */
  private generatePlanId(): ExecutionPlanId {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate step ID
   */
  private generateStepId(): ExecutionStepId {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): ApplyEngineStatistics {
    return {
      totalPlans: 0,
      completedPlans: 0,
      failedPlans: 0,
      rolledBackPlans: 0,
      totalSteps: 0,
      completedSteps: 0,
      failedSteps: 0,
      averageStepDuration: 0,
      permissionRequests: 0,
      permissionGrants: 0,
      permissionDenials: 0,
      averagePlanDuration: 0,
      parallelismUtilization: 0,
      cacheHitRate: 0,
    };
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * Get plan
   */
  public getPlan(planId: ExecutionPlanId): ExecutionPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Cancel plan
   */
  public async cancelPlan(planId: ExecutionPlanId): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan) return;
    
    plan.status = ExecutionPlanStatus.CANCELLED;
    
    // Cancel all active steps
    for (const step of plan.steps) {
      if (step.status === ExecutionStepStatus.RUNNING) {
        const controller = this.activeSteps.get(step.id);
        if (controller) {
          controller.abort();
        }
        step.status = ExecutionStepStatus.SKIPPED;
      }
    }
  }

  /**
   * Pause plan
   */
  public async pausePlan(planId: ExecutionPlanId): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan) return;
    
    plan.status = ExecutionPlanStatus.PAUSED;
  }

  /**
   * Resume plan
   */
  public async resumePlan(planId: ExecutionPlanId): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan || plan.status !== ExecutionPlanStatus.PAUSED) return;
    
    plan.status = ExecutionPlanStatus.RUNNING;
    await this.executeAdaptive(plan);
  }

  /**
   * Get statistics
   */
  public getStatistics(): ApplyEngineStatistics {
    const plans = Array.from(this.plans.values());
    
    const completedPlans = plans.filter(p => p.status === ExecutionPlanStatus.COMPLETED);
    const failedPlans = plans.filter(p => p.status === ExecutionPlanStatus.FAILED);
    const rolledBackPlans = plans.filter(p => p.status === ExecutionPlanStatus.ROLLED_BACK);
    
    let totalSteps = 0;
    let completedSteps = 0;
    let failedSteps = 0;
    let totalStepDuration = 0;
    let totalPlanDuration = 0;
    
    for (const plan of plans) {
      totalSteps += plan.metrics.totalSteps;
      completedSteps += plan.metrics.completedSteps;
      failedSteps += plan.metrics.failedSteps;
      totalStepDuration += plan.steps.reduce((sum, s) => sum + (s.duration || 0), 0);
      totalPlanDuration += plan.metrics.totalDuration;
    }
    
    return {
      totalPlans: plans.length,
      completedPlans: completedPlans.length,
      failedPlans: failedPlans.length,
      rolledBackPlans: rolledBackPlans.length,
      totalSteps,
      completedSteps,
      failedSteps,
      averageStepDuration: completedSteps > 0 ? totalStepDuration / completedSteps : 0,
      permissionRequests: plans.reduce((sum, p) => sum + p.metrics.permissionRequests, 0),
      permissionGrants: 0,
      permissionDenials: 0,
      averagePlanDuration: completedPlans.length > 0 ? totalPlanDuration / completedPlans.length : 0,
      parallelismUtilization: 0,
      cacheHitRate: 0,
    };
  }
}
