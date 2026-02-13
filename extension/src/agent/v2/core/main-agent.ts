/**
 * @fileoverview MainAgent - Supreme Global Leader of Autonomous Programming System
 * 
 * The MainAgent is the highest authority in the Vlinder V2 architecture.
 * It orchestrates all Bee agents and manages the overall system state.
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
  AgentState,
  AgentEvent,
  AgentResponse,
  AgentMetrics,
  MainAgentConfig,
  BeeConfig,
  BeeState,
  BeeId,
  ContextVariables,
  Message,
  ToolDefinition,
  ToolResult,
  Provider,
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  SessionConfig,
} from './types';
import { AgentSwarm } from '../AgentSwarm/swarm';

/**
 * MainAgent - The Supreme Global Leader
 * 
 * Responsibilities:
 * - Orchestrate all Bee agents
 * - Manage global context and state
 * - Handle task delegation and routing
 * - Maintain system-wide memory
 * - Coordinate agent handoffs
 */
export class MainAgent extends EventEmitter {
  // Core properties
  private _id: AgentId;
  private _name: string;
  private _config: MainAgentConfig;
  private _state: AgentState = AgentState.IDLE;
  
  // Provider
  private _provider: Provider | null = null;
  
  // Agent Swarm (Bee orchestration)
  private _swarm: AgentSwarm | null = null;
  
  // Bees registry
  private _bees: Map<BeeId, BeeConfig> = new Map();
  private _activeBee: BeeId | null = null;
  
  // Context and state
  private _contextVariables: ContextVariables;
  private _messages: Message[] = [];
  
  // Metrics
  private _metrics: AgentMetrics;
  private _startTime: number = 0;
  
  // Abort controller
  private _abortController: AbortController | null = null;
  
  // Debug mode
  private _debug: boolean = false;

  constructor(config: MainAgentConfig) {
    super();
    this._id = config.id;
    this._name = config.name;
    this._config = config;
    
    // Initialize context variables
    this._contextVariables = {
      sessionId: config.session.id,
      taskId: '',
      workingDirectory: process.cwd(),
      currentAgent: config.id,
      agentHistory: [],
    };
    
    // Initialize metrics
    this._metrics = {
      agentId: this._id,
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      totalTokensUsed: 0,
      memoryUsage: 0,
      uptime: 0,
      lastActivity: Date.now(),
    };
    
    // Register initial bees
    for (const bee of config.bees) {
      this._bees.set(bee.id, bee);
    }
  }

  // =========================================================================
  // Lifecycle Methods
  // =========================================================================

  /**
   * Initialize the MainAgent
   */
  public async initialize(): Promise<void> {
    this._state = AgentState.INITIALIZING;
    this._startTime = Date.now();
    
    this.emit('stateChange', this._state);
    
    try {
      // Initialize Agent Swarm
      this._swarm = new AgentSwarm({
        mainAgentId: this._id,
        bees: Array.from(this._bees.values()),
      });
      
      await this._swarm.initialize();
      
      this._state = AgentState.IDLE;
      this.emit('initialized');
      
      this.log('MainAgent initialized successfully');
    } catch (error) {
      this._state = AgentState.ERROR;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start the MainAgent
   */
  public async start(): Promise<void> {
    if (this._state !== AgentState.IDLE) {
      throw new Error(`Cannot start MainAgent in state: ${this._state}`);
    }
    
    this._state = AgentState.RUNNING;
    this._abortController = new AbortController();
    
    this.emit('started');
    this.log('MainAgent started');
  }

  /**
   * Pause the MainAgent
   */
  public async pause(): Promise<void> {
    if (this._state !== AgentState.RUNNING) {
      throw new Error(`Cannot pause MainAgent in state: ${this._state}`);
    }
    
    this._state = AgentState.PAUSED;
    this.emit('paused');
    this.log('MainAgent paused');
  }

  /**
   * Resume the MainAgent
   */
  public async resume(): Promise<void> {
    if (this._state !== AgentState.PAUSED) {
      throw new Error(`Cannot resume MainAgent in state: ${this._state}`);
    }
    
    this._state = AgentState.RUNNING;
    this.emit('resumed');
    this.log('MainAgent resumed');
  }

  /**
   * Stop the MainAgent gracefully
   */
  public async stop(): Promise<void> {
    this._state = AgentState.TERMINATED;
    this._abortController?.abort();
    
    // Stop all bees
    if (this._swarm) {
      await this._swarm.stop();
    }
    
    this.emit('stopped');
    this.log('MainAgent stopped');
  }

  // =========================================================================
  // Core Execution Methods (Based on OpenAI Swarm)
  // =========================================================================

  /**
   * Run the agent with messages (Main entry point)
   */
  public async run(
    messages: Message[],
    contextVariables: Partial<ContextVariables> = {},
    options: {
      modelOverride?: string;
      maxTurns?: number;
      executeTools?: boolean;
      stream?: boolean;
    } = {}
  ): Promise<AgentResponse> {
    if (this._state !== AgentState.RUNNING) {
      throw new Error(`MainAgent not running: ${this._state}`);
    }
    
    const startTime = Date.now();
    this._state = AgentState.PROCESSING;
    
    // Merge context variables
    this._contextVariables = { ...this._contextVariables, ...contextVariables };
    
    // Initialize history
    const history: Message[] = [...messages];
    const initLen = messages.length;
    
    let activeBee: BeeConfig | null = null;
    const maxTurns = options.maxTurns ?? this._config.behavior.maxTurns;
    
    try {
      while (history.length - initLen < maxTurns) {
        // Get completion from provider
        const completion = await this.getCompletion(
          activeBee || this.getDefaultBee(),
          history,
          options.modelOverride
        );
        
        const message = completion.message;
        history.push(message);
        
        // Check if we need to execute tools
        if (!message.toolCalls || !options.executeTools) {
          this.log('Ending turn - no tool calls');
          break;
        }
        
        // Handle tool calls
        const partialResponse = await this.handleToolCalls(
          message.toolCalls,
          activeBee || this.getDefaultBee(),
          this._contextVariables
        );
        
        history.push(...partialResponse.messages);
        
        // Update context variables
        if (partialResponse.contextVariables) {
          this._contextVariables = {
            ...this._contextVariables,
            ...partialResponse.contextVariables,
          };
        }
        
        // Handle agent handoff
        if (partialResponse.agent) {
          activeBee = partialResponse.agent;
          this._activeBee = activeBee.id;
          this.log(`Handoff to Bee: ${activeBee.name}`);
        }
        
        this._metrics.totalTokensUsed += completion.usage.totalTokens;
      }
      
      this._metrics.tasksCompleted++;
      this._state = AgentState.RUNNING;
      
      return {
        messages: history.slice(initLen),
        agent: activeBee,
        contextVariables: this._contextVariables,
      };
    } catch (error) {
      this._metrics.tasksFailed++;
      this._state = AgentState.ERROR;
      this.emit('error', error);
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);
      this._metrics.lastActivity = Date.now();
    }
  }

  /**
   * Run with streaming
   */
  public async *runStream(
    messages: Message[],
    contextVariables: Partial<ContextVariables> = {},
    options: {
      modelOverride?: string;
      maxTurns?: number;
      executeTools?: boolean;
    } = {}
  ): AsyncGenerator<CompletionChunk | { delim: 'start' | 'end' } | { response: AgentResponse }> {
    if (this._state !== AgentState.RUNNING) {
      throw new Error(`MainAgent not running: ${this._state}`);
    }
    
    this._state = AgentState.PROCESSING;
    this._contextVariables = { ...this._contextVariables, ...contextVariables };
    
    const history: Message[] = [...messages];
    const initLen = messages.length;
    let activeBee: BeeConfig | null = null;
    const maxTurns = options.maxTurns ?? this._config.behavior.maxTurns;
    
    while (history.length - initLen < maxTurns) {
      yield { delim: 'start' };
      
      // Stream completion
      const stream = this.getCompletionStream(
        activeBee || this.getDefaultBee(),
        history,
        options.modelOverride
      );
      
      let accumulatedMessage: Partial<Message> = {
        content: '',
        toolCalls: [],
      };
      
      for await (const chunk of stream) {
        if (chunk.delta.content) {
          accumulatedMessage.content += chunk.delta.content;
        }
        if (chunk.delta.toolCalls) {
          accumulatedMessage.toolCalls = [
            ...(accumulatedMessage.toolCalls || []),
            ...chunk.delta.toolCalls,
          ];
        }
        yield chunk;
      }
      
      yield { delim: 'end' };
      
      // Add message to history
      const message: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: accumulatedMessage.content as string,
        sender: activeBee?.name || this._name,
        timestamp: Date.now(),
        toolCalls: accumulatedMessage.toolCalls as any,
      };
      history.push(message);
      
      if (!message.toolCalls || !options.executeTools) {
        break;
      }
      
      // Handle tool calls
      const partialResponse = await this.handleToolCalls(
        message.toolCalls,
        activeBee || this.getDefaultBee(),
        this._contextVariables
      );
      
      history.push(...partialResponse.messages);
      
      if (partialResponse.contextVariables) {
        this._contextVariables = {
          ...this._contextVariables,
          ...partialResponse.contextVariables,
        };
      }
      
      if (partialResponse.agent) {
        activeBee = partialResponse.agent;
        this._activeBee = activeBee.id;
      }
    }
    
    this._state = AgentState.RUNNING;
    
    yield {
      response: {
        messages: history.slice(initLen),
        agent: activeBee,
        contextVariables: this._contextVariables,
      },
    };
  }

  // =========================================================================
  // Completion Methods
  // =========================================================================

  /**
   * Get completion from provider
   */
  private async getCompletion(
    bee: BeeConfig,
    history: Message[],
    modelOverride?: string
  ): Promise<CompletionResponse> {
    if (!this._provider) {
      throw new Error('Provider not set');
    }
    
    const instructions = typeof bee.instructions === 'function'
      ? bee.instructions(this._contextVariables)
      : bee.instructions;
    
    const systemMessage: Message = {
      id: 'system',
      role: 'system',
      content: instructions,
      timestamp: Date.now(),
    };
    
    const request: CompletionRequest = {
      messages: [systemMessage, ...history],
      tools: bee.tools,
      toolChoice: this._config.behavior.toolChoice,
      model: {
        ...this._config.model,
        modelId: modelOverride || bee.model?.modelId || this._config.model.modelId,
      },
      contextVariables: this._contextVariables,
    };
    
    return this._provider.complete(request);
  }

  /**
   * Get streaming completion
   */
  private async *getCompletionStream(
    bee: BeeConfig,
    history: Message[],
    modelOverride?: string
  ): AsyncGenerator<CompletionChunk> {
    if (!this._provider) {
      throw new Error('Provider not set');
    }
    
    const instructions = typeof bee.instructions === 'function'
      ? bee.instructions(this._contextVariables)
      : bee.instructions;
    
    const systemMessage: Message = {
      id: 'system',
      role: 'system',
      content: instructions,
      timestamp: Date.now(),
    };
    
    const request: CompletionRequest = {
      messages: [systemMessage, ...history],
      tools: bee.tools,
      toolChoice: this._config.behavior.toolChoice,
      model: {
        ...this._config.model,
        modelId: modelOverride || bee.model?.modelId || this._config.model.modelId,
      },
      contextVariables: this._contextVariables,
    };
    
    yield* this._provider.completeStream(request);
  }

  /**
   * Handle tool calls (Based on OpenAI Swarm)
   */
  private async handleToolCalls(
    toolCalls: Message['toolCalls'],
    bee: BeeConfig,
    contextVariables: ContextVariables
  ): Promise<{ messages: Message[]; agent: BeeConfig | null; contextVariables: Partial<ContextVariables> }> {
    const messages: Message[] = [];
    let newAgent: BeeConfig | null = null;
    const newContextVariables: Partial<ContextVariables> = {};
    
    const functionMap = new Map<string, ToolDefinition>();
    for (const tool of bee.tools) {
      functionMap.set(tool.name, tool);
    }
    
    for (const toolCall of toolCalls || []) {
      const name = toolCall.function.name;
      const tool = functionMap.get(name);
      
      if (!tool) {
        this.log(`Tool ${name} not found`);
        messages.push({
          id: `tool_${Date.now()}`,
          role: 'tool',
          content: `Error: Tool ${name} not found.`,
          toolCallId: toolCall.id,
          toolName: name,
          timestamp: Date.now(),
        });
        continue;
      }
      
      const args = JSON.parse(toolCall.function.arguments);
      this.log(`Executing tool: ${name}`);
      
      try {
        const result: ToolResult = await tool.handler(args, contextVariables);
        
        messages.push({
          id: `tool_${Date.now()}`,
          role: 'tool',
          content: result.value,
          toolCallId: toolCall.id,
          toolName: name,
          timestamp: Date.now(),
        });
        
        // Handle context variable updates
        if (result.contextVariables) {
          Object.assign(newContextVariables, result.contextVariables);
        }
        
        // Handle agent handoff
        if (result.agent) {
          newAgent = result.agent;
        }
      } catch (error) {
        messages.push({
          id: `tool_${Date.now()}`,
          role: 'tool',
          content: `Error: ${error}`,
          toolCallId: toolCall.id,
          toolName: name,
          timestamp: Date.now(),
        });
      }
    }
    
    return { messages, agent: newAgent, contextVariables: newContextVariables };
  }

  // =========================================================================
  // Bee Management
  // =========================================================================

  /**
   * Register a new Bee
   */
  public registerBee(bee: BeeConfig): void {
    this._bees.set(bee.id, bee);
    this._swarm?.registerBee(bee);
    this.emit('beeRegistered', bee);
    this.log(`Bee registered: ${bee.name}`);
  }

  /**
   * Unregister a Bee
   */
  public unregisterBee(beeId: BeeId): void {
    this._bees.delete(beeId);
    this._swarm?.unregisterBee(beeId);
    this.emit('beeUnregistered', beeId);
    this.log(`Bee unregistered: ${beeId}`);
  }

  /**
   * Get a Bee by ID
   */
  public getBee(beeId: BeeId): BeeConfig | undefined {
    return this._bees.get(beeId);
  }

  /**
   * Get all Bees
   */
  public getBees(): BeeConfig[] {
    return Array.from(this._bees.values());
  }

  /**
   * Get default Bee (first registered)
   */
  private getDefaultBee(): BeeConfig {
    const defaultBee = this._bees.values().next().value;
    if (!defaultBee) {
      throw new Error('No bees registered');
    }
    return defaultBee;
  }

  // =========================================================================
  // Provider Management
  // =========================================================================

  /**
   * Set the provider
   */
  public setProvider(provider: Provider): void {
    this._provider = provider;
    this.log(`Provider set: ${provider.name}`);
  }

  /**
   * Get the provider
   */
  public getProvider(): Provider | null {
    return this._provider;
  }

  // =========================================================================
  // Context Management
  // =========================================================================

  /**
   * Get context variables
   */
  public getContext(): ContextVariables {
    return { ...this._contextVariables };
  }

  /**
   * Update context variables
   */
  public updateContext(updates: Partial<ContextVariables>): void {
    this._contextVariables = { ...this._contextVariables, ...updates };
    this.emit('contextUpdated', this._contextVariables);
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get metrics
   */
  public getMetrics(): AgentMetrics {
    return {
      ...this._metrics,
      uptime: Date.now() - this._startTime,
      memoryUsage: process.memoryUsage().heapUsed,
    };
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
  public getState(): AgentState {
    return this._state;
  }

  /**
   * Get agent ID
   */
  public getId(): AgentId {
    return this._id;
  }

  /**
   * Get agent name
   */
  public getName(): string {
    return this._name;
  }

  /**
   * Get config
   */
  public getConfig(): MainAgentConfig {
    return this._config;
  }

  // =========================================================================
  // Debug
  // =========================================================================

  /**
   * Set debug mode
   */
  public setDebug(enabled: boolean): void {
    this._debug = enabled;
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this._debug) {
      console.log(`[MainAgent:${this._name}] ${message}`);
    }
  }
}
