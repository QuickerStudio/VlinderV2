/**
 * @fileoverview AgentSwarm - Bee Orchestration System
 * 
 * The AgentSwarm manages and orchestrates multiple Bee agents,
 * handling task distribution, load balancing, and fault tolerance.
 * 
 * Design based on:
 * - OpenAI Swarm (https://github.com/openai/swarm)
 * - Goose (https://github.com/block/goose)
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  AgentId,
  BeeId,
  BeeConfig,
  BeeState,
  BeePriority,
  BeeMetrics,
  BeeCapability,
  ContextVariables,
  Message,
  ToolResult,
  HandoffConfig,
} from '../core/types';

/**
 * Swarm configuration
 */
export interface SwarmConfig {
  mainAgentId: AgentId;
  bees: BeeConfig[];
  
  // Load balancing
  loadBalancing?: LoadBalancingConfig;
  
  // Fault tolerance
  faultTolerance?: FaultToleranceConfig;
  
  // Health monitoring
  healthCheck?: HealthCheckConfig;
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  strategy: 'round_robin' | 'least_loaded' | 'capability_based' | 'adaptive';
  healthCheckIntervalMs: number;
  unhealthyThreshold: number;
}

/**
 * Fault tolerance configuration
 */
export interface FaultToleranceConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  circuitBreaker: CircuitBreakerConfig;
  fallbackBee?: BeeId;
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

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  intervalMs: number;
  timeout: number;
}

/**
 * Bee health status
 */
interface BeeHealth {
  beeId: BeeId;
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
  lastError?: string;
  responseTime: number;
}

/**
 * Task for scheduling
 */
interface ScheduledTask {
  id: string;
  message: Message;
  targetBee?: BeeId;
  priority: BeePriority;
  scheduledAt: number;
  executeAt: number;
  retries: number;
  maxRetries: number;
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker for fault tolerance
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenCalls: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCalls = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.state = CircuitState.OPEN;
      }
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  getState(): CircuitState {
    return this.state;
  }
}

/**
 * AgentSwarm - Orchestrates Bee agents
 * 
 * Like a bee hive, the swarm manages worker bees (agents) that
 * collaborate to accomplish complex tasks.
 */
export class AgentSwarm extends EventEmitter {
  private config: SwarmConfig;
  private mainAgentId: AgentId;
  
  // Bee management
  private bees: Map<BeeId, BeeConfig> = new Map();
  private beeHealth: Map<BeeId, BeeHealth> = new Map();
  private beeLoad: Map<BeeId, number> = new Map();
  private beeMetrics: Map<BeeId, BeeMetrics> = new Map();
  
  // Circuit breakers
  private circuitBreakers: Map<BeeId, CircuitBreaker> = new Map();
  
  // Task queue
  private taskQueue: ScheduledTask[] = [];
  private activeTasks: Map<string, ScheduledTask> = new Map();
  
  // Health monitoring
  private healthCheckInterval?: NodeJS.Timeout;
  
  // State
  private isRunning: boolean = false;

  constructor(config: SwarmConfig) {
    super();
    this.config = config;
    this.mainAgentId = config.mainAgentId;
    
    // Initialize bees
    for (const bee of config.bees) {
      this.bees.set(bee.id, bee);
      this.beeLoad.set(bee.id, 0);
      this.initializeBeeHealth(bee.id);
      this.initializeCircuitBreaker(bee.id);
    }
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the swarm
   */
  public async initialize(): Promise<void> {
    this.emit('initialized');
  }

  /**
   * Start the swarm
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    
    // Start health monitoring
    if (this.config.healthCheck?.enabled) {
      this.startHealthMonitoring();
    }
    
    this.emit('started');
  }

  /**
   * Stop the swarm
   */
  public async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.emit('stopped');
  }

  // =========================================================================
  // Bee Management
  // =========================================================================

  /**
   * Register a new Bee
   */
  public registerBee(bee: BeeConfig): void {
    this.bees.set(bee.id, bee);
    this.beeLoad.set(bee.id, 0);
    this.initializeBeeHealth(bee.id);
    this.initializeCircuitBreaker(bee.id);
    
    this.emit('beeRegistered', bee);
  }

  /**
   * Unregister a Bee
   */
  public unregisterBee(beeId: BeeId): void {
    this.bees.delete(beeId);
    this.beeLoad.delete(beeId);
    this.beeHealth.delete(beeId);
    this.circuitBreakers.delete(beeId);
    this.beeMetrics.delete(beeId);
    
    this.emit('beeUnregistered', beeId);
  }

  /**
   * Get a Bee by ID
   */
  public getBee(beeId: BeeId): BeeConfig | undefined {
    return this.bees.get(beeId);
  }

  /**
   * Get all Bees
   */
  public getBees(): BeeConfig[] {
    return Array.from(this.bees.values());
  }

  /**
   * Get healthy Bees
   */
  public getHealthyBees(): BeeConfig[] {
    return Array.from(this.bees.values()).filter(bee => {
      const health = this.beeHealth.get(bee.id);
      return health?.healthy && !this.circuitBreakers.get(bee.id)?.isOpen();
    });
  }

  /**
   * Get Bees by capability
   */
  public getBeesByCapability(capability: BeeCapability): BeeConfig[] {
    return this.getHealthyBees().filter(bee =>
      bee.capabilities.includes(capability)
    );
  }

  // =========================================================================
  // Task Distribution
  // =========================================================================

  /**
   * Submit a task to the swarm
   */
  public async submitTask(
    message: Message,
    options: {
      targetBee?: BeeId;
      priority?: BeePriority;
      delay?: number;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    const task: ScheduledTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      targetBee: options.targetBee,
      priority: options.priority ?? BeePriority.MEDIUM,
      scheduledAt: Date.now(),
      executeAt: Date.now() + (options.delay || 0),
      retries: 0,
      maxRetries: options.maxRetries ?? 3,
    };
    
    // Insert in priority order
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (task.priority < this.taskQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.taskQueue.splice(insertIndex, 0, task);
    
    this.emit('taskSubmitted', task);
    
    return task.id;
  }

  /**
   * Distribute task to best Bee
   */
  public async distributeTask(task: ScheduledTask): Promise<ToolResult> {
    // Select best bee for the task
    const bee = task.targetBee
      ? this.bees.get(task.targetBee)
      : this.selectBestBee(task);
    
    if (!bee) {
      throw new Error('No suitable bee available for task');
    }
    
    return this.executeWithBee(bee, task);
  }

  /**
   * Execute task with a specific Bee
   */
  private async executeWithBee(bee: BeeConfig, task: ScheduledTask): Promise<ToolResult> {
    const beeId = bee.id;
    const breaker = this.circuitBreakers.get(beeId);
    
    // Increment load
    this.beeLoad.set(beeId, (this.beeLoad.get(beeId) || 0) + 1);
    this.activeTasks.set(task.id, task);
    
    const startTime = Date.now();
    
    try {
      let result: ToolResult;
      
      if (breaker) {
        result = await breaker.execute(() => this.executeBeeTask(bee, task));
      } else {
        result = await this.executeBeeTask(bee, task);
      }
      
      // Update health
      this.updateBeeHealth(beeId, true, Date.now() - startTime);
      
      // Update metrics
      this.updateBeeMetrics(beeId, true);
      
      return result;
    } catch (error) {
      // Update health
      this.updateBeeHealth(beeId, false, Date.now() - startTime, String(error));
      
      // Update metrics
      this.updateBeeMetrics(beeId, false);
      
      // Retry if possible
      if (task.retries < task.maxRetries) {
        task.retries++;
        this.taskQueue.push(task);
        this.emit('taskRetried', { task, error });
      }
      
      // Try fallback bee
      if (this.config.faultTolerance?.fallbackBee) {
        const fallback = this.bees.get(this.config.faultTolerance.fallbackBee);
        if (fallback && fallback.id !== beeId) {
          return this.executeWithBee(fallback, task);
        }
      }
      
      throw error;
    } finally {
      this.beeLoad.set(beeId, Math.max(0, (this.beeLoad.get(beeId) || 1) - 1));
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Execute Bee task (placeholder - actual execution handled by MainAgent)
   */
  private async executeBeeTask(bee: BeeConfig, task: ScheduledTask): Promise<ToolResult> {
    // This is a placeholder - actual execution is handled by MainAgent
    // The swarm just manages orchestration
    return {
      value: `Task ${task.id} assigned to Bee ${bee.name}`,
    };
  }

  /**
   * Select best Bee for a task
   */
  private selectBestBee(task: ScheduledTask): BeeConfig | undefined {
    const healthyBees = this.getHealthyBees();
    
    if (healthyBees.length === 0) {
      return undefined;
    }
    
    const strategy = this.config.loadBalancing?.strategy || 'least_loaded';
    
    switch (strategy) {
      case 'round_robin':
        return this.selectRoundRobin(healthyBees, task);
      case 'least_loaded':
        return this.selectLeastLoaded(healthyBees);
      case 'capability_based':
        return this.selectByCapability(healthyBees, task);
      case 'adaptive':
        return this.selectAdaptive(healthyBees, task);
      default:
        return this.selectLeastLoaded(healthyBees);
    }
  }

  private selectRoundRobin(bees: BeeConfig[], task: ScheduledTask): BeeConfig {
    const index = Math.abs(this.hashString(task.id)) % bees.length;
    return bees[index];
  }

  private selectLeastLoaded(bees: BeeConfig[]): BeeConfig {
    let minLoad = Infinity;
    let selected: BeeConfig | undefined;
    
    for (const bee of bees) {
      const load = this.beeLoad.get(bee.id) || 0;
      if (load < minLoad) {
        minLoad = load;
        selected = bee;
      }
    }
    
    return selected!;
  }

  private selectByCapability(bees: BeeConfig[], task: ScheduledTask): BeeConfig {
    // Analyze task to determine required capabilities
    const requiredCapabilities = this.analyzeTaskCapabilities(task);
    
    // Find bees with matching capabilities
    const capableBees = bees.filter(bee =>
      requiredCapabilities.some(cap => bee.capabilities.includes(cap))
    );
    
    if (capableBees.length === 0) {
      return this.selectLeastLoaded(bees);
    }
    
    return this.selectLeastLoaded(capableBees);
  }

  private selectAdaptive(bees: BeeConfig[], task: ScheduledTask): BeeConfig {
    // Score each bee based on multiple factors
    const scored = bees.map(bee => ({
      bee,
      score: this.calculateBeeScore(bee, task),
    }));
    
    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0].bee;
  }

  private calculateBeeScore(bee: BeeConfig, task: ScheduledTask): number {
    let score = 100;
    
    // Penalize high load
    const load = this.beeLoad.get(bee.id) || 0;
    score -= load * 10;
    
    // Penalize high failure rate
    const metrics = this.beeMetrics.get(bee.id);
    if (metrics && metrics.tasksCompleted > 0) {
      const failureRate = metrics.tasksFailed / metrics.tasksCompleted;
      score -= failureRate * 50;
    }
    
    // Bonus for matching capabilities
    const requiredCapabilities = this.analyzeTaskCapabilities(task);
    const matchingCapabilities = requiredCapabilities.filter(cap =>
      bee.capabilities.includes(cap)
    );
    score += matchingCapabilities.length * 15;
    
    // Bonus for circuit breaker being closed
    const breaker = this.circuitBreakers.get(bee.id);
    if (breaker && !breaker.isOpen()) {
      score += 10;
    }
    
    return Math.max(0, score);
  }

  private analyzeTaskCapabilities(task: ScheduledTask): BeeCapability[] {
    // Simple analysis based on message content
    const content = task.message.content;
    const capabilities: BeeCapability[] = [];
    
    if (typeof content === 'string') {
      if (content.includes('edit') || content.includes('modify')) {
        capabilities.push(BeeCapability.CODE_EDITING);
      }
      if (content.includes('file') || content.includes('read') || content.includes('write')) {
        capabilities.push(BeeCapability.FILE_OPERATIONS);
      }
      if (content.includes('run') || content.includes('execute') || content.includes('terminal')) {
        capabilities.push(BeeCapability.TERMINAL);
      }
      if (content.includes('test')) {
        capabilities.push(BeeCapability.TESTING);
      }
      if (content.includes('debug')) {
        capabilities.push(BeeCapability.DEBUGGING);
      }
    }
    
    return capabilities.length > 0 ? capabilities : [BeeCapability.CODE_EDITING];
  }

  // =========================================================================
  // Health Monitoring
  // =========================================================================

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const interval = this.config.healthCheck?.intervalMs || 10000;
    
    this.healthCheckInterval = setInterval(() => {
      this.checkAllBeeHealth();
    }, interval);
  }

  /**
   * Check health of all Bees
   */
  private checkAllBeeHealth(): void {
    for (const [beeId] of this.bees) {
      this.checkBeeHealth(beeId);
    }
    
    this.emit('healthCheckComplete', this.getHealthStatus());
  }

  /**
   * Check health of a specific Bee
   */
  private checkBeeHealth(beeId: BeeId): void {
    const health = this.beeHealth.get(beeId);
    if (!health) return;
    
    // Check if bee has been failing
    if (health.consecutiveFailures >= (this.config.loadBalancing?.unhealthyThreshold || 3)) {
      health.healthy = false;
    }
    
    this.beeHealth.set(beeId, health);
  }

  /**
   * Update Bee health status
   */
  private updateBeeHealth(
    beeId: BeeId,
    success: boolean,
    responseTime: number,
    error?: string
  ): void {
    const health = this.beeHealth.get(beeId);
    if (!health) return;
    
    health.lastCheck = Date.now();
    health.responseTime = responseTime;
    
    if (success) {
      health.healthy = true;
      health.consecutiveFailures = 0;
      health.lastError = undefined;
    } else {
      health.consecutiveFailures++;
      health.lastError = error;
      
      if (health.consecutiveFailures >= (this.config.loadBalancing?.unhealthyThreshold || 3)) {
        health.healthy = false;
      }
    }
    
    this.beeHealth.set(beeId, health);
  }

  /**
   * Get health status of all Bees
   */
  public getHealthStatus(): Map<BeeId, BeeHealth> {
    return new Map(this.beeHealth);
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Update Bee metrics
   */
  private updateBeeMetrics(beeId: BeeId, success: boolean): void {
    let metrics = this.beeMetrics.get(beeId);
    
    if (!metrics) {
      metrics = {
        beeId,
        tasksCompleted: 0,
        tasksFailed: 0,
        averageExecutionTime: 0,
        handoffsReceived: 0,
        handoffsSent: 0,
        currentState: BeeState.IDLE,
      };
    }
    
    if (success) {
      metrics.tasksCompleted++;
    } else {
      metrics.tasksFailed++;
    }
    
    this.beeMetrics.set(beeId, metrics);
  }

  /**
   * Get Bee metrics
   */
  public getBeeMetrics(beeId: BeeId): BeeMetrics | undefined {
    return this.beeMetrics.get(beeId);
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): Map<BeeId, BeeMetrics> {
    return new Map(this.beeMetrics);
  }

  // =========================================================================
  // Handoff Management
  // =========================================================================

  /**
   * Process handoff from one Bee to another
   */
  public async processHandoff(
    fromBee: BeeId,
    toBee: BeeId,
    context: ContextVariables
  ): Promise<void> {
    const from = this.bees.get(fromBee);
    const to = this.bees.get(toBee);
    
    if (!from || !to) {
      throw new Error(`Invalid handoff: ${fromBee} -> ${toBee}`);
    }
    
    // Update metrics
    const fromMetrics = this.beeMetrics.get(fromBee);
    const toMetrics = this.beeMetrics.get(toBee);
    
    if (fromMetrics) {
      fromMetrics.handoffsSent++;
    }
    if (toMetrics) {
      toMetrics.handoffsReceived++;
    }
    
    this.emit('handoff', { from: fromBee, to: toBee, context });
  }

  // =========================================================================
  // Initialization Helpers
  // =========================================================================

  private initializeBeeHealth(beeId: BeeId): void {
    this.beeHealth.set(beeId, {
      beeId,
      healthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      responseTime: 0,
    });
  }

  private initializeCircuitBreaker(beeId: BeeId): void {
    this.circuitBreakers.set(beeId, new CircuitBreaker(
      this.config.faultTolerance?.circuitBreaker || {
        enabled: true,
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 30000,
        halfOpenMaxCalls: 3,
      }
    ));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
