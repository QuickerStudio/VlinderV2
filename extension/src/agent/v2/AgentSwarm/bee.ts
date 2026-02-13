/**
 * @fileoverview Bee - Worker Agent
 * 
 * Bee agents are the workers in the Vlinder V2 architecture.
 * Like bees in a hive, they perform specific tasks and can
 * handoff work to other bees when needed.
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  BeeId,
  BeeState,
  BeeConfig,
  BeeCapability,
  BeePriority,
  BeeMetrics,
  ContextVariables,
  Message,
  ToolDefinition,
  ToolResult,
  HandoffConfig,
  ToolHandler,
} from '../core/types';

/**
 * Bee - Worker Agent
 * 
 * A Bee is a specialized agent that performs specific tasks.
 * Bees can handoff work to other Bees based on conditions.
 */
export class Bee extends EventEmitter {
  private _id: BeeId;
  private _name: string;
  private _config: BeeConfig;
  private _state: BeeState = BeeState.IDLE;
  
  // Tools
  private _tools: Map<string, ToolDefinition> = new Map();
  
  // Handoffs
  private _handoffs: HandoffConfig[] = [];
  
  // Metrics
  private _metrics: BeeMetrics;
  
  // Context
  private _context: ContextVariables | null = null;

  constructor(config: BeeConfig) {
    super();
    this._id = config.id;
    this._name = config.name;
    this._config = config;
    
    // Initialize tools
    for (const tool of config.tools) {
      this._tools.set(tool.name, tool);
    }
    
    // Initialize handoffs
    this._handoffs = config.handoffs;
    
    // Initialize metrics
    this._metrics = {
      beeId: this._id,
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      handoffsReceived: 0,
      handoffsSent: 0,
      currentState: BeeState.IDLE,
    };
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the Bee
   */
  public async initialize(): Promise<void> {
    this._state = BeeState.IDLE;
    this.emit('initialized');
  }

  /**
   * Start the Bee
   */
  public async start(): Promise<void> {
    this._state = BeeState.IDLE;
    this.emit('started');
  }

  /**
   * Stop the Bee
   */
  public async stop(): Promise<void> {
    this._state = BeeState.OFFLINE;
    this.emit('stopped');
  }

  // =========================================================================
  // Task Execution
  // =========================================================================

  /**
   * Execute a task
   */
  public async execute(
    message: Message,
    context: ContextVariables
  ): Promise<ToolResult> {
    const startTime = Date.now();
    this._state = BeeState.BUSY;
    this._context = context;
    
    try {
      // Get instructions
      const instructions = typeof this._config.instructions === 'function'
        ? this._config.instructions(context)
        : this._config.instructions;
      
      // Process message and determine action
      const result = await this.processMessage(message, instructions, context);
      
      // Check for handoffs
      const handoffResult = this.checkHandoffs(context);
      if (handoffResult) {
        this._metrics.handoffsSent++;
        return handoffResult;
      }
      
      this._metrics.tasksCompleted++;
      this._state = BeeState.IDLE;
      
      return result;
    } catch (error) {
      this._metrics.tasksFailed++;
      this._state = BeeState.ERROR;
      this.emit('error', error);
      
      return {
        value: `Error: ${error}`,
      };
    } finally {
      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);
      this._metrics.lastActivity = Date.now();
    }
  }

  /**
   * Process a message
   */
  private async processMessage(
    message: Message,
    instructions: string,
    context: ContextVariables
  ): Promise<ToolResult> {
    // This is a placeholder - actual processing is done by the LLM
    // The Bee just provides the configuration and tools
    
    return {
      value: `Bee ${this._name} processed message`,
      contextVariables: context,
    };
  }

  /**
   * Check if any handoff conditions are met
   */
  private checkHandoffs(context: ContextVariables): ToolResult | null {
    for (const handoff of this._handoffs) {
      const shouldHandoff = typeof handoff.condition === 'function'
        ? handoff.condition(context)
        : this.evaluateCondition(handoff.condition, context);
      
      if (shouldHandoff) {
        return {
          value: JSON.stringify({ handoff: handoff.targetBee }),
          agent: { id: handoff.targetBee } as BeeConfig,
          contextVariables: handoff.transferContext ? context : undefined,
        };
      }
    }
    
    return null;
  }

  /**
   * Evaluate a string condition
   */
  private evaluateCondition(condition: string, context: ContextVariables): boolean {
    // Simple condition evaluation
    // In production, this would use a proper expression evaluator
    try {
      // Check for context variable references
      const match = condition.match(/context\.(\w+)/);
      if (match) {
        const varName = match[1];
        return !!context[varName];
      }
      
      return false;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // Tool Management
  // =========================================================================

  /**
   * Register a tool
   */
  public registerTool(tool: ToolDefinition): void {
    this._tools.set(tool.name, tool);
    this.emit('toolRegistered', tool);
  }

  /**
   * Unregister a tool
   */
  public unregisterTool(toolName: string): void {
    this._tools.delete(toolName);
    this.emit('toolUnregistered', toolName);
  }

  /**
   * Get a tool by name
   */
  public getTool(toolName: string): ToolDefinition | undefined {
    return this._tools.get(toolName);
  }

  /**
   * Get all tools
   */
  public getTools(): ToolDefinition[] {
    return Array.from(this._tools.values());
  }

  /**
   * Execute a tool
   */
  public async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ContextVariables
  ): Promise<ToolResult> {
    const tool = this._tools.get(toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    return tool.handler(args, context);
  }

  // =========================================================================
  // Handoff Management
  // =========================================================================

  /**
   * Add a handoff configuration
   */
  public addHandoff(handoff: HandoffConfig): void {
    this._handoffs.push(handoff);
  }

  /**
   * Remove a handoff
   */
  public removeHandoff(targetBee: BeeId): void {
    this._handoffs = this._handoffs.filter(h => h.targetBee !== targetBee);
  }

  /**
   * Get all handoffs
   */
  public getHandoffs(): HandoffConfig[] {
    return [...this._handoffs];
  }

  // =========================================================================
  // Capability Management
  // =========================================================================

  /**
   * Check if Bee has a capability
   */
  public hasCapability(capability: BeeCapability): boolean {
    return this._config.capabilities.includes(capability);
  }

  /**
   * Get all capabilities
   */
  public getCapabilities(): BeeCapability[] {
    return [...this._config.capabilities];
  }

  /**
   * Add a capability
   */
  public addCapability(capability: BeeCapability): void {
    if (!this._config.capabilities.includes(capability)) {
      this._config.capabilities.push(capability);
    }
  }

  /**
   * Remove a capability
   */
  public removeCapability(capability: BeeCapability): void {
    this._config.capabilities = this._config.capabilities.filter(c => c !== capability);
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get metrics
   */
  public getMetrics(): BeeMetrics {
    return { ...this._metrics };
  }

  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(time: number): void {
    const total = this._metrics.averageExecutionTime * (this._metrics.tasksCompleted - 1);
    this._metrics.averageExecutionTime = (total + time) / this._metrics.tasksCompleted;
  }

  // =========================================================================
  // State Management
  // =========================================================================

  /**
   * Get current state
   */
  public getState(): BeeState {
    return this._state;
  }

  /**
   * Get Bee ID
   */
  public getId(): BeeId {
    return this._id;
  }

  /**
   * Get Bee name
   */
  public getName(): string {
    return this._name;
  }

  /**
   * Get config
   */
  public getConfig(): BeeConfig {
    return this._config;
  }

  /**
   * Get priority
   */
  public getPriority(): BeePriority {
    return this._config.priority;
  }

  /**
   * Get instructions
   */
  public getInstructions(context?: ContextVariables): string {
    if (context) {
      return typeof this._config.instructions === 'function'
        ? this._config.instructions(context)
        : this._config.instructions;
    }
    return typeof this._config.instructions === 'string'
      ? this._config.instructions
      : '';
  }
}

// =========================================================================
// Bee Factory
// =========================================================================

/**
 * Create a Bee with common configurations
 */
export class BeeFactory {
  /**
   * Create a code editing Bee
   */
  public static createCodeEditor(id: BeeId, tools: ToolDefinition[]): Bee {
    return new Bee({
      id,
      name: 'Code Editor',
      description: 'Handles code editing and modification tasks',
      instructions: 'You are a code editing specialist. Your job is to modify code according to user requirements while maintaining code quality and following best practices.',
      tools,
      capabilities: [
        BeeCapability.CODE_EDITING,
        BeeCapability.FILE_OPERATIONS,
        BeeCapability.REFACTORING,
      ],
      handoffs: [],
      priority: BeePriority.HIGH,
      maxConcurrentTasks: 3,
    });
  }

  /**
   * Create a terminal Bee
   */
  public static createTerminal(id: BeeId, tools: ToolDefinition[]): Bee {
    return new Bee({
      id,
      name: 'Terminal',
      description: 'Handles terminal commands and execution',
      instructions: 'You are a terminal specialist. Your job is to execute commands safely and report results accurately.',
      tools,
      capabilities: [
        BeeCapability.TERMINAL,
        BeeCapability.DEPLOYMENT,
      ],
      handoffs: [],
      priority: BeePriority.MEDIUM,
      maxConcurrentTasks: 2,
    });
  }

  /**
   * Create a testing Bee
   */
  public static createTester(id: BeeId, tools: ToolDefinition[]): Bee {
    return new Bee({
      id,
      name: 'Tester',
      description: 'Handles testing and quality assurance',
      instructions: 'You are a testing specialist. Your job is to write and run tests, analyze results, and report issues.',
      tools,
      capabilities: [
        BeeCapability.TESTING,
        BeeCapability.DEBUGGING,
        BeeCapability.ANALYSIS,
      ],
      handoffs: [],
      priority: BeePriority.MEDIUM,
      maxConcurrentTasks: 2,
    });
  }

  /**
   * Create a documentation Bee
   */
  public static createDocumenter(id: BeeId, tools: ToolDefinition[]): Bee {
    return new Bee({
      id,
      name: 'Documenter',
      description: 'Handles documentation and comments',
      instructions: 'You are a documentation specialist. Your job is to create and maintain clear, comprehensive documentation.',
      tools,
      capabilities: [
        BeeCapability.DOCUMENTATION,
        BeeCapability.ANALYSIS,
      ],
      handoffs: [],
      priority: BeePriority.LOW,
      maxConcurrentTasks: 2,
    });
  }

  /**
   * Create a web search Bee
   */
  public static createWebSearcher(id: BeeId, tools: ToolDefinition[]): Bee {
    return new Bee({
      id,
      name: 'Web Searcher',
      description: 'Handles web searches and information retrieval',
      instructions: 'You are a web search specialist. Your job is to find relevant information and summarize findings.',
      tools,
      capabilities: [
        BeeCapability.WEB_SEARCH,
        BeeCapability.ANALYSIS,
      ],
      handoffs: [],
      priority: BeePriority.MEDIUM,
      maxConcurrentTasks: 3,
    });
  }

  /**
   * Create an analysis Bee
   */
  public static createAnalyst(id: BeeId, tools: ToolDefinition[]): Bee {
    return new Bee({
      id,
      name: 'Analyst',
      description: 'Handles code analysis and review',
      instructions: 'You are an analysis specialist. Your job is to analyze code, identify issues, and provide recommendations.',
      tools,
      capabilities: [
        BeeCapability.ANALYSIS,
        BeeCapability.DEBUGGING,
        BeeCapability.REFACTORING,
      ],
      handoffs: [],
      priority: BeePriority.HIGH,
      maxConcurrentTasks: 2,
    });
  }
}
