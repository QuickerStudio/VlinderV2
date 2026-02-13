/**
 * @fileoverview V2 Base Agent - Core Agent Implementation
 * 
 * Implements the next-generation agent architecture with:
 * - Async concurrent task processing
 * - Built-in memory integration
 * - Thinking engine support
 * - Event-driven communication
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  AgentId,
  AgentState,
  AgentConfig,
  AgentMessage,
  MessageType,
  TaskPriority,
  AgentCapability,
  AgentMetrics,
  MemoryEntry,
  MemoryQuery,
  ThinkingChain,
  ThinkingStep,
  ThinkingStepType,
  ContextWindow,
  ToolExecutionContext,
  ToolResult,
  SharedState,
  MessageQueue,
  MessageHandler,
} from './types';

/**
 * Abstract base class for all V2 agents
 */
export abstract class BaseAgent extends EventEmitter {
  protected id: AgentId;
  protected config: AgentConfig;
  protected state: AgentState = AgentState.IDLE;
  protected capabilities: Map<string, AgentCapability> = new Map();
  protected taskQueue: AgentMessage[] = [];
  protected activeTasks: Set<string> = new Set();
  protected metrics: AgentMetrics;
  protected startTime: number;
  protected abortController: AbortController | null = null;
  
  // Engine references (injected via Shared middleware)
  protected memoryEngine: MemoryEngineInterface | null = null;
  protected thinkingEngine: ThinkingEngineInterface | null = null;
  protected contextEngine: ContextEngineInterface | null = null;
  protected toolsEngine: ToolsEngineInterface | null = null;
  protected sharedState: SharedState | null = null;
  protected messageQueue: MessageQueue | null = null;

  constructor(config: AgentConfig) {
    super();
    this.id = config.id;
    this.config = config;
    this.startTime = Date.now();
    
    // Initialize capabilities
    for (const cap of config.capabilities) {
      this.capabilities.set(cap.name, cap);
    }
    
    // Initialize metrics
    this.metrics = {
      agentId: this.id,
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      queueSize: 0,
      uptime: 0,
      timestamp: Date.now(),
    };
  }

  // =========================================================================
  // Lifecycle Methods
  // =========================================================================

  /**
   * Initialize the agent
   */
  public async initialize(): Promise<void> {
    this.state = AgentState.INITIALIZING;
    this.emit('stateChange', this.state);
    
    try {
      await this.onInitialize();
      this.state = AgentState.IDLE;
      this.emit('initialized');
    } catch (error) {
      this.state = AgentState.ERROR;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start the agent
   */
  public async start(): Promise<void> {
    if (this.state !== AgentState.IDLE) {
      throw new Error(`Cannot start agent in state: ${this.state}`);
    }
    
    this.state = AgentState.RUNNING;
    this.abortController = new AbortController();
    this.emit('stateChange', this.state);
    
    await this.onStart();
    this.emit('started');
  }

  /**
   * Pause the agent
   */
  public async pause(): Promise<void> {
    if (this.state !== AgentState.RUNNING) {
      throw new Error(`Cannot pause agent in state: ${this.state}`);
    }
    
    this.state = AgentState.PAUSED;
    this.emit('stateChange', this.state);
    
    await this.onPause();
    this.emit('paused');
  }

  /**
   * Resume the agent
   */
  public async resume(): Promise<void> {
    if (this.state !== AgentState.PAUSED) {
      throw new Error(`Cannot resume agent in state: ${this.state}`);
    }
    
    this.state = AgentState.RUNNING;
    this.emit('stateChange', this.state);
    
    await this.onResume();
    this.emit('resumed');
  }

  /**
   * Stop the agent gracefully
   */
  public async stop(): Promise<void> {
    this.state = AgentState.TERMINATED;
    this.abortController?.abort();
    this.emit('stateChange', this.state);
    
    await this.onStop();
    this.emit('stopped');
  }

  // =========================================================================
  // Task Processing
  // =========================================================================

  /**
   * Submit a task to the agent
   */
  public async submitTask(message: AgentMessage): Promise<void> {
    if (this.state !== AgentState.RUNNING) {
      throw new Error(`Agent not running: ${this.state}`);
    }
    
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      // Queue the task
      this.enqueueTask(message);
      return;
    }
    
    await this.processTask(message);
  }

  /**
   * Process a task
   */
  protected async processTask(message: AgentMessage): Promise<void> {
    const taskId = message.id;
    this.activeTasks.add(taskId);
    
    const startTime = Date.now();
    
    try {
      // Execute thinking chain if available
      if (this.thinkingEngine) {
        const thinkingChain = await this.thinkingEngine.createChain(taskId);
        await this.executeWithThinking(message, thinkingChain);
      } else {
        await this.executeTask(message);
      }
      
      this.metrics.tasksCompleted++;
    } catch (error) {
      this.metrics.tasksFailed++;
      this.emit('taskError', { taskId, error });
    } finally {
      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);
      this.activeTasks.delete(taskId);
      
      // Process next task in queue
      const nextTask = this.dequeueTask();
      if (nextTask) {
        void this.processTask(nextTask);
      }
    }
  }

  /**
   * Execute task with thinking chain
   */
  protected async executeWithThinking(
    message: AgentMessage,
    chain: ThinkingChain
  ): Promise<void> {
    // Add observation step
    await this.thinkingEngine!.addStep(chain.id, {
      type: ThinkingStepType.OBSERVATION,
      content: JSON.stringify(message.payload),
      confidence: 1.0,
      dependencies: [],
    });
    
    // Execute the actual task
    const result = await this.executeTask(message);
    
    // Add reflection step
    await this.thinkingEngine!.addStep(chain.id, {
      type: ThinkingStepType.REFLECTION,
      content: JSON.stringify(result),
      confidence: 0.9,
      dependencies: chain.steps.map(s => s.id),
    });
    
    // Complete the chain
    await this.thinkingEngine!.completeChain(chain.id);
  }

  // =========================================================================
  // Abstract Methods
  // =========================================================================

  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onPause(): Promise<void>;
  protected abstract onResume(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract executeTask(message: AgentMessage): Promise<unknown>;

  // =========================================================================
  // Engine Injection (via Shared middleware)
  // =========================================================================

  public setMemoryEngine(engine: MemoryEngineInterface): void {
    this.memoryEngine = engine;
  }

  public setThinkingEngine(engine: ThinkingEngineInterface): void {
    this.thinkingEngine = engine;
  }

  public setContextEngine(engine: ContextEngineInterface): void {
    this.contextEngine = engine;
  }

  public setToolsEngine(engine: ToolsEngineInterface): void {
    this.toolsEngine = engine;
  }

  public setSharedState(state: SharedState): void {
    this.sharedState = state;
  }

  public setMessageQueue(queue: MessageQueue): void {
    this.messageQueue = queue;
  }

  // =========================================================================
  // Memory Operations
  // =========================================================================

  protected async remember(content: string, metadata?: Partial<MemoryEntry['metadata']>): Promise<void> {
    if (!this.memoryEngine) {
      throw new Error('Memory engine not initialized');
    }
    
    await this.memoryEngine.store({
      content,
      metadata: {
        source: 'agent',
        type: 'experience',
        tags: [],
        confidence: 1.0,
        ...metadata,
      },
    });
  }

  protected async recall(query: MemoryQuery): Promise<MemoryEntry[]> {
    if (!this.memoryEngine) {
      throw new Error('Memory engine not initialized');
    }
    
    return this.memoryEngine.retrieve(query);
  }

  // =========================================================================
  // Tool Operations
  // =========================================================================

  protected async useTool(
    toolName: string,
    input: unknown,
    context: Partial<ToolExecutionContext>
  ): Promise<ToolResult> {
    if (!this.toolsEngine) {
      throw new Error('Tools engine not initialized');
    }
    
    return this.toolsEngine.execute(toolName, input, {
      agentId: this.id,
      taskId: '',
      workingDirectory: '',
      environment: {},
      permissions: [],
      timeout: this.config.timeout,
      ...context,
    });
  }

  // =========================================================================
  // Queue Management
  // =========================================================================

  protected enqueueTask(message: AgentMessage): void {
    // Insert based on priority
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (message.priority < this.taskQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    this.taskQueue.splice(insertIndex, 0, message);
    this.metrics.queueSize = this.taskQueue.length;
  }

  protected dequeueTask(): AgentMessage | undefined {
    const task = this.taskQueue.shift();
    this.metrics.queueSize = this.taskQueue.length;
    return task;
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  protected updateAverageExecutionTime(time: number): void {
    const total = this.metrics.averageExecutionTime * (this.metrics.tasksCompleted - 1);
    this.metrics.averageExecutionTime = (total + time) / this.metrics.tasksCompleted;
  }

  public getMetrics(): AgentMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
    };
  }

  public getState(): AgentState {
    return this.state;
  }

  public getId(): AgentId {
    return this.id;
  }

  public getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  public hasCapability(name: string): boolean {
    return this.capabilities.has(name);
  }
}

// ============================================================================
// Engine Interfaces (for dependency injection via Shared middleware)
// ============================================================================

export interface MemoryEngineInterface {
  store(entry: Partial<MemoryEntry>): Promise<MemoryEntry>;
  retrieve(query: MemoryQuery): Promise<MemoryEntry[]>;
  forget(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface ThinkingEngineInterface {
  createChain(taskId: string): Promise<ThinkingChain>;
  addStep(chainId: string, step: Partial<ThinkingStep>): Promise<ThinkingStep>;
  completeChain(chainId: string): Promise<void>;
  getChain(chainId: string): Promise<ThinkingChain | undefined>;
}

export interface ContextEngineInterface {
  createWindow(taskId: string, maxTokens: number): Promise<ContextWindow>;
  addEntry(windowId: string, entry: Partial<ContextWindow['entries'][0]>): Promise<void>;
  compress(windowId: string): Promise<void>;
  getWindow(windowId: string): Promise<ContextWindow | undefined>;
}

export interface ToolsEngineInterface {
  register(tool: unknown): Promise<void>;
  execute(name: string, input: unknown, context: ToolExecutionContext): Promise<ToolResult>;
  list(): Promise<string[]>;
}
