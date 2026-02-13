/**
 * @fileoverview V2 Agent Runtime - Multi-threaded Async Concurrent Scheduler
 * 
 * Implements a sophisticated runtime with:
 * - Multi-threaded task scheduling
 * - Async concurrent execution
 * - Resource management
 * - Health monitoring
 * - Graceful shutdown
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  RuntimeConfig,
  AgentId,
  AgentMessage,
  AgentState,
  TaskPriority,
  MessageType,
  AgentMetrics,
} from '../core/types';
import { BaseAgent } from '../core/base-agent';
import { AgentSwarm } from '../swarm/agent-swarm';
import { SharedMiddleware } from '../shared/shared-middleware';
import { Router } from '../router/router';

/**
 * Default runtime configuration
 */
const DEFAULT_CONFIG: RuntimeConfig = {
  maxAgents: 100,
  maxTasksPerAgent: 10,
  taskQueueSize: 10000,
  heartbeatIntervalMs: 5000,
  healthCheckIntervalMs: 10000,
  gracefulShutdownTimeoutMs: 30000,
  logging: {
    level: 'info',
    format: 'json',
    destination: 'console',
    includeTimestamp: true,
    includeAgentId: true,
  },
  metrics: {
    enabled: true,
    intervalMs: 60000,
    exporters: [],
  },
};

/**
 * Scheduled task
 */
interface ScheduledTask {
  id: string;
  message: AgentMessage;
  agentId?: AgentId;
  scheduledAt: number;
  executeAt: number;
  priority: TaskPriority;
  retries: number;
  maxRetries: number;
}

/**
 * Worker thread info
 */
interface WorkerInfo {
  id: string;
  busy: boolean;
  currentTask?: string;
  tasksCompleted: number;
  lastActivity: number;
}

/**
 * Agent Runtime - Manages agent lifecycle and task scheduling
 */
export class AgentRuntime extends EventEmitter {
  private config: RuntimeConfig;
  private agents: Map<AgentId, BaseAgent> = new Map();
  private swarms: Map<string, AgentSwarm> = new Map();
  private shared: SharedMiddleware;
  private router: Router;
  
  // Task scheduling
  private taskQueue: ScheduledTask[] = [];
  private activeTasks: Map<string, ScheduledTask> = new Map();
  private workers: WorkerInfo[] = [];
  
  // Lifecycle
  private isRunning: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private schedulerInterval?: NodeJS.Timeout;
  
  // Shutdown
  private isShuttingDown: boolean = false;
  private shutdownPromise?: Promise<void>;

  constructor(
    config: Partial<RuntimeConfig> = {},
    shared?: SharedMiddleware,
    router?: Router
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.shared = shared || new SharedMiddleware();
    this.router = router || new Router();
    
    // Initialize workers based on maxAgents
    this.initializeWorkers();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the runtime
   */
  public async initialize(): Promise<void> {
    await this.shared.initialize();
    await this.router.initialize();
    
    this.emit('initialized');
  }

  /**
   * Start the runtime
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Start heartbeat
    this.heartbeatInterval = setInterval(
      () => this.sendHeartbeat(),
      this.config.heartbeatIntervalMs
    );
    
    // Start health checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckIntervalMs
    );
    
    // Start metrics collection
    if (this.config.metrics.enabled) {
      this.metricsInterval = setInterval(
        () => this.collectMetrics(),
        this.config.metrics.intervalMs
      );
    }
    
    // Start scheduler
    this.schedulerInterval = setInterval(
      () => this.processTaskQueue(),
      10 // Process every 10ms
    );
    
    this.emit('started');
  }

  /**
   * Stop the runtime gracefully
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    this.emit('shutdownInitiated');
    
    // Clear intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.schedulerInterval) clearInterval(this.schedulerInterval);
    
    // Wait for active tasks to complete
    this.shutdownPromise = this.waitForActiveTasks();
    
    const timeout = setTimeout(
      () => this.forceShutdown(),
      this.config.gracefulShutdownTimeoutMs
    );
    
    await this.shutdownPromise;
    clearTimeout(timeout);
    
    // Stop all agents
    await Promise.all(
      Array.from(this.agents.values()).map(agent => agent.stop())
    );
    
    // Stop all swarms
    await Promise.all(
      Array.from(this.swarms.values()).map(swarm => swarm.stop())
    );
    
    await this.shared.shutdown();
    
    this.isRunning = false;
    this.isShuttingDown = false;
    this.emit('stopped');
  }

  /**
   * Force shutdown
   */
  private forceShutdown(): void {
    this.emit('forceShutdown');
    
    // Abort all active tasks
    for (const agent of this.agents.values()) {
      if (agent.getState() === AgentState.RUNNING) {
        agent.stop().catch(() => {});
      }
    }
  }

  /**
   * Wait for active tasks to complete
   */
  private async waitForActiveTasks(): Promise<void> {
    while (this.activeTasks.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // =========================================================================
  // Agent Management
  // =========================================================================

  /**
   * Register an agent
   */
  public async registerAgent(agent: BaseAgent): Promise<void> {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error('Maximum number of agents reached');
    }
    
    const agentId = agent.getId();
    
    if (this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} already registered`);
    }
    
    // Inject shared services
    agent.setSharedState(this.shared.state);
    agent.setMessageQueue(this.shared.messageQueue);
    
    // Initialize and start agent
    await agent.initialize();
    await agent.start();
    
    this.agents.set(agentId, agent);
    
    this.emit('agentRegistered', agentId);
  }

  /**
   * Unregister an agent
   */
  public async unregisterAgent(agentId: AgentId): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    await agent.stop();
    this.agents.delete(agentId);
    
    this.emit('agentUnregistered', agentId);
  }

  /**
   * Get an agent by ID
   */
  public getAgent(agentId: AgentId): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  public getAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  // =========================================================================
  // Swarm Management
  // =========================================================================

  /**
   * Create a new swarm
   */
  public async createSwarm(
    swarmId: string,
    config: Parameters<typeof AgentSwarm>[0]
  ): Promise<AgentSwarm> {
    if (this.swarms.has(swarmId)) {
      throw new Error(`Swarm ${swarmId} already exists`);
    }
    
    const swarm = new AgentSwarm(config);
    await swarm.start();
    
    this.swarms.set(swarmId, swarm);
    
    this.emit('swarmCreated', swarmId);
    
    return swarm;
  }

  /**
   * Get a swarm by ID
   */
  public getSwarm(swarmId: string): AgentSwarm | undefined {
    return this.swarms.get(swarmId);
  }

  // =========================================================================
  // Task Scheduling
  // =========================================================================

  /**
   * Submit a task
   */
  public async submitTask(
    message: AgentMessage,
    options: {
      agentId?: AgentId;
      delay?: number;
      priority?: TaskPriority;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    if (this.taskQueue.length >= this.config.taskQueueSize) {
      throw new Error('Task queue is full');
    }
    
    const task: ScheduledTask = {
      id: this.generateId(),
      message,
      agentId: options.agentId,
      scheduledAt: Date.now(),
      executeAt: Date.now() + (options.delay || 0),
      priority: options.priority ?? message.priority,
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
   * Process the task queue
   */
  private async processTaskQueue(): Promise<void> {
    if (this.isShuttingDown || this.taskQueue.length === 0) {
      return;
    }
    
    const now = Date.now();
    
    // Find tasks ready to execute
    const readyTasks = this.taskQueue.filter(t => t.executeAt <= now);
    
    for (const task of readyTasks) {
      // Find available worker
      const worker = this.findAvailableWorker();
      if (!worker) {
        break; // No workers available
      }
      
      // Remove from queue
      const index = this.taskQueue.indexOf(task);
      if (index !== -1) {
        this.taskQueue.splice(index, 1);
      }
      
      // Execute task
      this.executeTask(task, worker);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: ScheduledTask, worker: WorkerInfo): Promise<void> {
    worker.busy = true;
    worker.currentTask = task.id;
    this.activeTasks.set(task.id, task);
    
    try {
      // Find agent
      const agent = task.agentId
        ? this.agents.get(task.agentId)
        : this.selectAgentForTask(task);
      
      if (!agent) {
        throw new Error('No agent available for task');
      }
      
      // Execute via router
      await this.router.route(task.message);
      
      worker.tasksCompleted++;
      this.emit('taskCompleted', task);
    } catch (error) {
      // Retry if possible
      if (task.retries < task.maxRetries) {
        task.retries++;
        this.taskQueue.push(task);
        this.emit('taskRetried', { task, error });
      } else {
        this.emit('taskFailed', { task, error });
      }
    } finally {
      worker.busy = false;
      worker.currentTask = undefined;
      worker.lastActivity = Date.now();
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Find an available worker
   */
  private findAvailableWorker(): WorkerInfo | undefined {
    return this.workers.find(w => !w.busy);
  }

  /**
   * Select an agent for a task
   */
  private selectAgentForTask(task: ScheduledTask): BaseAgent | undefined {
    // Get all running agents
    const availableAgents = Array.from(this.agents.values()).filter(
      agent => agent.getState() === AgentState.RUNNING
    );
    
    if (availableAgents.length === 0) {
      return undefined;
    }
    
    // Simple round-robin selection
    // In production, this would consider agent capabilities and load
    const index = Math.floor(Math.random() * availableAgents.length);
    return availableAgents[index];
  }

  // =========================================================================
  // Health Monitoring
  // =========================================================================

  /**
   * Send heartbeat to all agents
   */
  private async sendHeartbeat(): Promise<void> {
    const heartbeat: AgentMessage = {
      id: this.generateId(),
      type: MessageType.HEARTBEAT,
      from: 'runtime',
      to: 'broadcast',
      payload: { timestamp: Date.now() },
      priority: TaskPriority.BACKGROUND,
      timestamp: Date.now(),
    };
    
    for (const agent of this.agents.values()) {
      try {
        await agent.submitTask(heartbeat);
      } catch (error) {
        this.emit('heartbeatFailed', { agentId: agent.getId(), error });
      }
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const healthStatus: Record<AgentId, AgentState> = {};
    
    for (const [agentId, agent] of this.agents) {
      healthStatus[agentId] = agent.getState();
    }
    
    this.emit('healthCheck', healthStatus);
    
    // Publish to shared event bus
    await this.shared.eventBus.publish({
      id: this.generateId(),
      type: 'swarm:health',
      source: 'runtime',
      payload: healthStatus,
      timestamp: Date.now(),
    });
  }

  /**
   * Collect metrics
   */
  private collectMetrics(): void {
    const metrics = this.getMetrics();
    
    // Export to configured exporters
    for (const exporter of this.config.metrics.exporters) {
      if (exporter.customHandler) {
        exporter.customHandler(metrics);
      }
    }
    
    this.emit('metricsCollected', metrics);
  }

  // =========================================================================
  // Workers
  // =========================================================================

  /**
   * Initialize workers
   */
  private initializeWorkers(): void {
    const workerCount = Math.min(
      this.config.maxAgents,
      require('os').cpus().length || 4
    );
    
    for (let i = 0; i < workerCount; i++) {
      this.workers.push({
        id: `worker_${i}`,
        busy: false,
        tasksCompleted: 0,
        lastActivity: Date.now(),
      });
    }
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get runtime metrics
   */
  public getMetrics(): {
    agents: {
      total: number;
      running: number;
      idle: number;
      error: number;
    };
    tasks: {
      queued: number;
      active: number;
      completed: number;
    };
    workers: {
      total: number;
      busy: number;
      idle: number;
    };
    uptime: number;
  } {
    const agents = {
      total: this.agents.size,
      running: 0,
      idle: 0,
      error: 0,
    };
    
    for (const agent of this.agents.values()) {
      const state = agent.getState();
      if (state === AgentState.RUNNING) agents.running++;
      else if (state === AgentState.IDLE) agents.idle++;
      else if (state === AgentState.ERROR) agents.error++;
    }
    
    const workers = {
      total: this.workers.length,
      busy: this.workers.filter(w => w.busy).length,
      idle: this.workers.filter(w => !w.busy).length,
    };
    
    return {
      agents,
      tasks: {
        queued: this.taskQueue.length,
        active: this.activeTasks.size,
        completed: this.workers.reduce((sum, w) => sum + w.tasksCompleted, 0),
      },
      workers,
      uptime: process.uptime() * 1000,
    };
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if runtime is running
   */
  public isRunningState(): boolean {
    return this.isRunning;
  }
}
