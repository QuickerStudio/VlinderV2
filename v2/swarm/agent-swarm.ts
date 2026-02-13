/**
 * @fileoverview V2 Agent Swarm - Multi-Agent Orchestration System
 * 
 * Implements a sophisticated multi-agent orchestration system with:
 * - Multiple orchestration strategies (parallel, sequential, pipeline, hierarchical)
 * - Load balancing and fault tolerance
 * - Circuit breaker pattern
 * - Health monitoring
 * - Dynamic agent scaling
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  AgentId,
  AgentMessage,
  AgentState,
  SwarmConfig,
  OrchestrationStrategy,
  AgentMetrics,
  TaskPriority,
  MessageType,
  CircuitBreakerConfig,
  LoadBalancingConfig,
  FaultToleranceConfig,
} from '../core/types';
import { BaseAgent } from '../core/base-agent';

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
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

  getState(): CircuitState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
}

/**
 * Agent health status
 */
interface AgentHealth {
  agentId: AgentId;
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
  lastError?: string;
  responseTime: number;
}

/**
 * Task distribution result
 */
interface DistributionResult {
  agentId: AgentId;
  message: AgentMessage;
  estimatedLoad: number;
}

/**
 * Agent Swarm Manager - Orchestrates multiple agents
 */
export class AgentSwarm extends EventEmitter {
  private config: SwarmConfig;
  private agents: Map<AgentId, BaseAgent> = new Map();
  private agentHealth: Map<AgentId, AgentHealth> = new Map();
  private circuitBreakers: Map<AgentId, CircuitBreaker> = new Map();
  private agentLoad: Map<AgentId, number> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: SwarmConfig) {
    super();
    this.config = config;
  }

  // =========================================================================
  // Agent Management
  // =========================================================================

  /**
   * Register an agent with the swarm
   */
  public async registerAgent(agent: BaseAgent): Promise<void> {
    const agentId = agent.getId();
    
    if (this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} already registered`);
    }
    
    this.agents.set(agentId, agent);
    this.agentLoad.set(agentId, 0);
    
    // Initialize health status
    this.agentHealth.set(agentId, {
      agentId,
      healthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      responseTime: 0,
    });
    
    // Initialize circuit breaker
    this.circuitBreakers.set(
      agentId,
      new CircuitBreaker(this.config.faultTolerance.circuitBreaker)
    );
    
    this.emit('agentRegistered', agentId);
  }

  /**
   * Unregister an agent from the swarm
   */
  public async unregisterAgent(agentId: AgentId): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    await agent.stop();
    this.agents.delete(agentId);
    this.agentLoad.delete(agentId);
    this.agentHealth.delete(agentId);
    this.circuitBreakers.delete(agentId);
    
    this.emit('agentUnregistered', agentId);
  }

  /**
   * Get all registered agents
   */
  public getAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: AgentId): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  // =========================================================================
  // Swarm Lifecycle
  // =========================================================================

  /**
   * Start the swarm
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Initialize all agents
    for (const agent of this.agents.values()) {
      await agent.initialize();
      await agent.start();
    }
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    this.emit('started');
  }

  /**
   * Stop the swarm
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Stop all agents
    await Promise.all(
      Array.from(this.agents.values()).map(agent => agent.stop())
    );
    
    this.emit('stopped');
  }

  // =========================================================================
  // Task Distribution
  // =========================================================================

  /**
   * Distribute a task to agents based on orchestration strategy
   */
  public async distributeTask(message: AgentMessage): Promise<unknown> {
    const strategy = this.config.orchestrationStrategy;
    
    switch (strategy) {
      case OrchestrationStrategy.PARALLEL:
        return this.distributeParallel(message);
      case OrchestrationStrategy.SEQUENTIAL:
        return this.distributeSequential(message);
      case OrchestrationStrategy.PIPELINE:
        return this.distributePipeline(message);
      case OrchestrationStrategy.HIERARCHICAL:
        return this.distributeHierarchical(message);
      case OrchestrationStrategy.ADAPTIVE:
        return this.distributeAdaptive(message);
      case OrchestrationStrategy.ROUND_ROBIN:
        return this.distributeRoundRobin(message);
      case OrchestrationStrategy.LEAST_LOADED:
        return this.distributeLeastLoaded(message);
      case OrchestrationStrategy.CAPABILITY_BASED:
        return this.distributeByCapability(message);
      default:
        return this.distributeLeastLoaded(message);
    }
  }

  /**
   * Distribute task to all agents in parallel
   */
  private async distributeParallel(message: AgentMessage): Promise<unknown[]> {
    const healthyAgents = this.getHealthyAgents();
    
    const results = await Promise.allSettled(
      healthyAgents.map(agent => this.executeWithAgent(agent, message))
    );
    
    return results.map(r => 
      r.status === 'fulfilled' ? r.value : { error: r.reason }
    );
  }

  /**
   * Distribute task sequentially through agents
   */
  private async distributeSequential(message: AgentMessage): Promise<unknown> {
    const healthyAgents = this.getHealthyAgents();
    let result: unknown = message.payload;
    
    for (const agent of healthyAgents) {
      const msg = { ...message, payload: result };
      result = await this.executeWithAgent(agent, msg);
    }
    
    return result;
  }

  /**
   * Distribute task through a pipeline of agents
   */
  private async distributePipeline(message: AgentMessage): Promise<unknown> {
    const healthyAgents = this.getHealthyAgents();
    const results: unknown[] = [];
    
    for (const agent of healthyAgents) {
      const result = await this.executeWithAgent(agent, message);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Distribute task hierarchically (primary agent with fallbacks)
   */
  private async distributeHierarchical(message: AgentMessage): Promise<unknown> {
    const healthyAgents = this.getHealthyAgents();
    
    if (healthyAgents.length === 0) {
      throw new Error('No healthy agents available');
    }
    
    // Try primary agent first
    const primary = healthyAgents[0];
    
    try {
      return await this.executeWithAgent(primary, message);
    } catch (error) {
      // Try fallback agents
      for (let i = 1; i < healthyAgents.length; i++) {
        try {
          return await this.executeWithAgent(healthyAgents[i], message);
        } catch {
          continue;
        }
      }
      throw error;
    }
  }

  /**
   * Distribute task adaptively based on current load and health
   */
  private async distributeAdaptive(message: AgentMessage): Promise<unknown> {
    const agent = this.selectBestAgent(message);
    if (!agent) {
      throw new Error('No suitable agent available');
    }
    return this.executeWithAgent(agent, message);
  }

  /**
   * Distribute task using round-robin
   */
  private distributeRoundRobin(message: AgentMessage): Promise<unknown> {
    const healthyAgents = this.getHealthyAgents();
    if (healthyAgents.length === 0) {
      throw new Error('No healthy agents available');
    }
    
    // Simple round-robin based on message ID hash
    const index = this.hashString(message.id) % healthyAgents.length;
    const agent = healthyAgents[index];
    
    return this.executeWithAgent(agent, message);
  }

  /**
   * Distribute task to least loaded agent
   */
  private distributeLeastLoaded(message: AgentMessage): Promise<unknown> {
    const agent = this.selectLeastLoadedAgent();
    if (!agent) {
      throw new Error('No healthy agents available');
    }
    return this.executeWithAgent(agent, message);
  }

  /**
   * Distribute task based on agent capabilities
   */
  private distributeByCapability(message: AgentMessage): Promise<unknown> {
    const capableAgents = this.getHealthyAgents().filter(agent => {
      // Check if agent has required capabilities
      // This is a simplified check - real implementation would parse message requirements
      return agent.getCapabilities().length > 0;
    });
    
    if (capableAgents.length === 0) {
      throw new Error('No capable agents available');
    }
    
    const agent = this.selectLeastLoadedAgent(capableAgents);
    return this.executeWithAgent(agent!, message);
  }

  // =========================================================================
  // Agent Selection
  // =========================================================================

  /**
   * Select the best agent based on multiple factors
   */
  private selectBestAgent(message: AgentMessage): BaseAgent | undefined {
    const healthyAgents = this.getHealthyAgents();
    if (healthyAgents.length === 0) {
      return undefined;
    }
    
    // Score each agent
    const scored = healthyAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent),
    }));
    
    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0].agent;
  }

  /**
   * Select the least loaded agent
   */
  private selectLeastLoadedAgent(agents?: BaseAgent[]): BaseAgent | undefined {
    const candidates = agents || this.getHealthyAgents();
    
    let minLoad = Infinity;
    let selected: BaseAgent | undefined;
    
    for (const agent of candidates) {
      const load = this.agentLoad.get(agent.getId()) || 0;
      if (load < minLoad) {
        minLoad = load;
        selected = agent;
      }
    }
    
    return selected;
  }

  /**
   * Calculate agent score for selection
   */
  private calculateAgentScore(agent: BaseAgent): number {
    const health = this.agentHealth.get(agent.getId());
    const load = this.agentLoad.get(agent.getId()) || 0;
    const metrics = agent.getMetrics();
    
    let score = 100;
    
    // Penalize high load
    score -= load * 10;
    
    // Penalize high failure rate
    if (metrics.tasksCompleted > 0) {
      const failureRate = metrics.tasksFailed / metrics.tasksCompleted;
      score -= failureRate * 50;
    }
    
    // Penalize slow response time
    if (health?.responseTime) {
      score -= Math.min(health.responseTime / 100, 20);
    }
    
    // Bonus for circuit breaker being closed
    const breaker = this.circuitBreakers.get(agent.getId());
    if (breaker && !breaker.isOpen()) {
      score += 10;
    }
    
    return Math.max(0, score);
  }

  // =========================================================================
  // Execution
  // =========================================================================

  /**
   * Execute task with an agent using circuit breaker
   */
  private async executeWithAgent(
    agent: BaseAgent,
    message: AgentMessage
  ): Promise<unknown> {
    const agentId = agent.getId();
    const breaker = this.circuitBreakers.get(agentId);
    
    // Increment load
    this.agentLoad.set(agentId, (this.agentLoad.get(agentId) || 0) + 1);
    
    const startTime = Date.now();
    
    try {
      let result: unknown;
      
      if (breaker) {
        result = await breaker.execute(() => agent.submitTask(message));
      } else {
        await agent.submitTask(message);
        result = undefined;
      }
      
      // Update health
      this.updateAgentHealth(agentId, true, Date.now() - startTime);
      
      return result;
    } catch (error) {
      // Update health
      this.updateAgentHealth(agentId, false, Date.now() - startTime, String(error));
      
      // Try fallback agent if configured
      if (this.config.faultTolerance.fallbackAgent) {
        const fallback = this.agents.get(this.config.faultTolerance.fallbackAgent);
        if (fallback && fallback.getId() !== agentId) {
          return this.executeWithAgent(fallback, message);
        }
      }
      
      throw error;
    } finally {
      // Decrement load
      this.agentLoad.set(agentId, Math.max(0, (this.agentLoad.get(agentId) || 1) - 1));
    }
  }

  // =========================================================================
  // Health Monitoring
  // =========================================================================

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(
      () => this.checkAgentHealth(),
      this.config.loadBalancing.healthCheckIntervalMs
    );
  }

  /**
   * Check health of all agents
   */
  private async checkAgentHealth(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      const state = agent.getState();
      const health = this.agentHealth.get(agentId);
      
      if (!health) continue;
      
      // Check if agent is in error state
      if (state === AgentState.ERROR || state === AgentState.TERMINATED) {
        health.healthy = false;
        health.consecutiveFailures++;
      }
      
      // Check consecutive failures threshold
      if (health.consecutiveFailures >= this.config.loadBalancing.unhealthyThreshold) {
        health.healthy = false;
      }
      
      this.agentHealth.set(agentId, health);
    }
    
    this.emit('healthCheckComplete', this.getHealthStatus());
  }

  /**
   * Update agent health status
   */
  private updateAgentHealth(
    agentId: AgentId,
    success: boolean,
    responseTime: number,
    error?: string
  ): void {
    const health = this.agentHealth.get(agentId);
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
      
      if (health.consecutiveFailures >= this.config.loadBalancing.unhealthyThreshold) {
        health.healthy = false;
      }
    }
    
    this.agentHealth.set(agentId, health);
  }

  /**
   * Get health status of all agents
   */
  public getHealthStatus(): Map<AgentId, AgentHealth> {
    return new Map(this.agentHealth);
  }

  /**
   * Get all healthy agents
   */
  public getHealthyAgents(): BaseAgent[] {
    return Array.from(this.agents.values()).filter(agent => {
      const health = this.agentHealth.get(agent.getId());
      return health?.healthy && agent.getState() === AgentState.RUNNING;
    });
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get swarm metrics
   */
  public getMetrics(): {
    totalAgents: number;
    healthyAgents: number;
    totalLoad: number;
    agentMetrics: Map<AgentId, AgentMetrics>;
  } {
    const healthyAgents = this.getHealthyAgents();
    let totalLoad = 0;
    const agentMetrics = new Map<AgentId, AgentMetrics>();
    
    for (const [agentId, agent] of this.agents) {
      totalLoad += this.agentLoad.get(agentId) || 0;
      agentMetrics.set(agentId, agent.getMetrics());
    }
    
    return {
      totalAgents: this.agents.size,
      healthyAgents: healthyAgents.length,
      totalLoad,
      agentMetrics,
    };
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Simple string hash function
   */
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
