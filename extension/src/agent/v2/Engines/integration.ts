/**
 * @fileoverview Agent Integration - MainAgent与Engines集成模块
 * 
 * 将所有引擎整合到MainAgent中，提供统一的Agent系统
 * 
 * @version 2.0.0
 */

import { MainAgent } from '../../core/main-agent';
import { MemoryEngine } from '../MemoryEngine';
import { ThinkingEngine } from '../ThinkingEngine';
import { ToolsEngine } from '../ToolsEngine';
import { ContextEngine } from '../ContextEngine';
import { ApplyEngine } from '../ApplyEngine';
import {
  MainAgentConfig,
  ContextVariables,
  Message,
  ToolResult,
} from '../../core/types';
import {
  MemoryEngineConfig,
  MemoryType,
  MemorySource,
  TimelineEventType,
} from '../MemoryEngine/types';
import {
  ThinkingEngineConfig,
  ReasoningPattern,
  ThinkingStepType,
} from '../ThinkingEngine/types';
import {
  ToolsEngineConfig,
  ToolDefinition,
  ToolCategory,
  ToolRiskLevel,
} from '../ToolsEngine/types';
import {
  ContextManagerConfig,
  SearchType,
} from '../ContextEngine/types';
import {
  ApplyEngineConfig,
  ExecutionMode,
} from '../ApplyEngine/types';

/**
 * 集成Agent配置
 */
export interface IntegratedAgentConfig {
  mainAgent: MainAgentConfig;
  engines?: {
    memory?: Partial<MemoryEngineConfig>;
    thinking?: Partial<ThinkingEngineConfig>;
    tools?: Partial<ToolsEngineConfig>;
    context?: Partial<ContextManagerConfig>;
    apply?: Partial<ApplyEngineConfig>;
  };
}

/**
 * 集成Agent系统
 */
export class IntegratedAgent {
  private mainAgent: MainAgent;
  private memoryEngine: MemoryEngine;
  private thinkingEngine: ThinkingEngine;
  private toolsEngine: ToolsEngine;
  private contextEngine: ContextEngine;
  private applyEngine: ApplyEngine;
  
  private isInitialized: boolean = false;

  constructor(config: IntegratedAgentConfig) {
    // Initialize engines
    this.memoryEngine = new MemoryEngine(config.engines?.memory);
    this.thinkingEngine = new ThinkingEngine(config.engines?.thinking);
    this.toolsEngine = new ToolsEngine(config.engines?.tools);
    this.contextEngine = new ContextEngine(config.engines?.context);
    this.applyEngine = new ApplyEngine(config.engines?.apply);
    
    // Initialize MainAgent
    this.mainAgent = new MainAgent(config.mainAgent);
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the integrated agent system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize all engines
    await Promise.all([
      this.memoryEngine.initialize(),
      this.thinkingEngine.initialize(),
      this.toolsEngine.initialize(),
      this.applyEngine.initialize(),
    ]);

    // Initialize context engine with working directory
    const context = this.mainAgent.getContext();
    await this.contextEngine.initialize(context.workingDirectory || process.cwd());

    // Set up engine integrations
    this.setupEngineIntegrations();

    // Initialize MainAgent
    await this.mainAgent.initialize();

    // Store initialization in memory
    await this.memoryEngine.store(
      'Integrated Agent System initialized',
      {
        source: MemorySource.SYSTEM,
        sessionId: context.sessionId,
      },
      { tags: ['system', 'initialization'] }
    );

    // Capture timeline event
    await this.memoryEngine.captureEvent(
      TimelineEventType.SESSION_START,
      'Integrated Agent System started'
    );

    this.isInitialized = true;
  }

  /**
   * Start the integrated agent
   */
  public async start(): Promise<void> {
    await this.mainAgent.start();
    
    await this.memoryEngine.captureEvent(
      TimelineEventType.TASK_START,
      'Agent started and ready for tasks'
    );
  }

  /**
   * Stop the integrated agent
   */
  public async stop(): Promise<void> {
    await this.memoryEngine.captureEvent(
      TimelineEventType.SESSION_END,
      'Agent shutting down'
    );

    await this.mainAgent.stop();
    
    await Promise.all([
      this.memoryEngine.shutdown(),
      this.thinkingEngine.shutdown(),
      this.toolsEngine.shutdown(),
      this.contextEngine.shutdown(),
      this.applyEngine.shutdown(),
    ]);

    this.isInitialized = false;
  }

  // =========================================================================
  // Engine Integration Setup
  // =========================================================================

  /**
   * Set up integrations between engines
   */
  private setupEngineIntegrations(): void {
    // Memory Engine events -> MainAgent
    this.memoryEngine.on('memory:stored', (data) => {
      this.mainAgent.emit('memory:stored', data);
    });

    // Thinking Engine events -> Memory Engine
    this.thinkingEngine.on('thinking:chain_completed', async (data) => {
      await this.memoryEngine.store(
        `Thinking chain completed: ${JSON.stringify(data)}`,
        { source: MemorySource.AGENT },
        { tags: ['thinking', 'reasoning'] }
      );
    });

    // Tools Engine events -> Memory Engine
    this.toolsEngine.on('tool:execution_completed', async (data) => {
      await this.memoryEngine.store(
        `Tool execution: ${JSON.stringify(data)}`,
        { source: MemorySource.TOOL },
        { tags: ['tool', 'execution'] }
      );
    });

    // Apply Engine events -> Memory Engine
    this.applyEngine.on('apply:plan_completed', async (data) => {
      await this.memoryEngine.captureEvent(
        TimelineEventType.TASK_COMPLETE,
        `Execution plan completed: ${JSON.stringify(data)}`
      );
    });
  }

  // =========================================================================
  // Enhanced Execution
  // =========================================================================

  /**
   * Run with enhanced capabilities
   */
  public async runEnhanced(
    messages: Message[],
    options: {
      useMemory?: boolean;
      useContext?: boolean;
      useThinking?: boolean;
      reasoningPattern?: ReasoningPattern;
    } = {}
  ): Promise<{
    response: import('../../core/types').AgentResponse;
    thinking?: import('../ThinkingEngine/types').ThinkingChain;
    memories?: import('../MemoryEngine/types').MemoryEntry[];
  }> {
    const {
      useMemory = true,
      useContext = true,
      useThinking = true,
      reasoningPattern = ReasoningPattern.DEDDUCTIVE,
    } = options;

    // Retrieve relevant context from memory
    let relevantMemories: import('../MemoryEngine/types').MemoryEntry[] = [];
    if (useMemory && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (typeof lastMessage.content === 'string') {
        const memoryResult = await this.memoryEngine.search(lastMessage.content, {
          topK: 5,
        });
        relevantMemories = memoryResult.memories;
      }
    }

    // Search code context if enabled
    let codeContext: import('../ContextEngine/types').SearchResult[] = [];
    if (useContext && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (typeof lastMessage.content === 'string') {
        codeContext = await this.contextEngine.search({
          query: lastMessage.content,
          type: SearchType.HYBRID,
          topK: 5,
        });
      }
    }

    // Create thinking chain if enabled
    let thinkingChain: import('../ThinkingEngine/types').ThinkingChain | undefined;
    if (useThinking) {
      thinkingChain = await this.thinkingEngine.createChain(
        `task_${Date.now()}`,
        {
          input: messages,
          relevantKnowledge: relevantMemories.map(m => m.content),
        },
        reasoningPattern
      );

      // Add observation step
      await this.thinkingEngine.addStep(thinkingChain.id, {
        type: ThinkingStepType.OBSERVATION,
        content: `Observing ${messages.length} messages`,
        confidence: 1.0,
      });

      // Add context from memory and code
      if (relevantMemories.length > 0) {
        await this.thinkingEngine.addStep(thinkingChain.id, {
          type: ThinkingStepType.ANALYSIS,
          content: `Found ${relevantMemories.length} relevant memories`,
          confidence: 0.9,
        });
      }

      if (codeContext.length > 0) {
        await this.thinkingEngine.addStep(thinkingChain.id, {
          type: ThinkingStepType.ANALYSIS,
          content: `Found ${codeContext.length} relevant code contexts`,
          confidence: 0.9,
        });
      }
    }

    // Execute with MainAgent
    const response = await this.mainAgent.run(messages, {
      recentMemories: relevantMemories,
      relevantContext: codeContext.map(c => c.content || '').filter(Boolean),
    });

    // Store interaction in memory
    if (useMemory) {
      for (const message of messages) {
        await this.memoryEngine.store(
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          {
            source: message.role === 'user' ? MemorySource.USER : MemorySource.AGENT,
            sessionId: this.mainAgent.getContext().sessionId,
          },
          { tags: ['conversation', message.role] }
        );
      }

      // Store response
      for (const msg of response.messages) {
        if (msg.role === 'assistant') {
          await this.memoryEngine.store(
            typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            {
              source: MemorySource.AGENT,
              sessionId: this.mainAgent.getContext().sessionId,
            },
            { tags: ['response'] }
          );
        }
      }
    }

    // Complete thinking chain
    if (thinkingChain) {
      await this.thinkingEngine.addStep(thinkingChain.id, {
        type: ThinkingStepType.DECISION,
        content: 'Task completed successfully',
        confidence: 0.9,
      });

      thinkingChain = await this.thinkingEngine.getChain(thinkingChain.id);
    }

    return {
      response,
      thinking: thinkingChain,
      memories: relevantMemories,
    };
  }

  // =========================================================================
  // Tool Registration
  // =========================================================================

  /**
   * Register a tool
   */
  public async registerTool(tool: ToolDefinition): Promise<void> {
    await this.toolsEngine.registerTool(tool);
  }

  /**
   * Register multiple tools
   */
  public async registerTools(tools: ToolDefinition[]): Promise<void> {
    await this.toolsEngine.registerTools(tools);
  }

  // =========================================================================
  // Memory Operations
  // =========================================================================

  /**
   * Store a memory
   */
  public async storeMemory(
    content: string,
    metadata?: Partial<import('../MemoryEngine/types').MemoryMetadata>,
    tags?: string[]
  ): Promise<import('../MemoryEngine/types').MemoryEntry> {
    return this.memoryEngine.store(content, {
      ...metadata,
      sessionId: this.mainAgent.getContext().sessionId,
    }, { tags });
  }

  /**
   * Search memories
   */
  public async searchMemories(
    query: string,
    topK: number = 10
  ): Promise<import('../MemoryEngine/types').MemoryQueryResult> {
    return this.memoryEngine.search(query, { topK });
  }

  // =========================================================================
  // Context Operations
  // =========================================================================

  /**
   * Index a file
   */
  public async indexFile(filePath: string): Promise<import('../ContextEngine/types').FileContext | null> {
    return this.contextEngine.indexFile(filePath);
  }

  /**
   * Search code
   */
  public async searchCode(
    query: string,
    type: SearchType = SearchType.HYBRID
  ): Promise<import('../ContextEngine/types').SearchResult[]> {
    return this.contextEngine.search({
      query,
      type,
      topK: 10,
    });
  }

  // =========================================================================
  // Execution Operations
  // =========================================================================

  /**
   * Create and execute a plan
   */
  public async executePlan(
    steps: Array<{
      toolId: string;
      toolName: string;
      input: Record<string, unknown>;
      dependencies?: string[];
    }>,
    mode: ExecutionMode = ExecutionMode.ADAPTIVE
  ): Promise<import('../ApplyEngine/types').ExecutionPlan> {
    const session = await this.applyEngine.createSession({
      workingDirectory: this.mainAgent.getContext().workingDirectory,
      agentId: this.mainAgent.getId(),
      taskId: `task_${Date.now()}`,
      variables: {},
    });

    const plan = await this.applyEngine.createPlan(
      session.id,
      steps.map((step, index) => ({
        ...step,
        dependencies: step.dependencies || [],
        priority: index,
        maxRetries: 3,
      })),
      { mode }
    );

    return this.applyEngine.executePlan(plan.id);
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  /**
   * Get comprehensive statistics
   */
  public getStatistics(): {
    mainAgent: import('../../core/types').AgentMetrics;
    memory: import('../MemoryEngine/types').MemoryStats;
    thinking: import('../ThinkingEngine/types').ThinkingStatistics;
    tools: import('../ToolsEngine/types').ToolsEngineStatistics;
    context: import('../ContextEngine/types').ContextEngineStatistics;
    apply: import('../ApplyEngine/types').ApplyEngineStatistics;
  } {
    return {
      mainAgent: this.mainAgent.getMetrics(),
      memory: this.memoryEngine.getStatistics(),
      thinking: this.thinkingEngine.getStatistics(),
      tools: this.toolsEngine.getStatistics(),
      context: this.contextEngine.getStatistics(),
      apply: this.applyEngine.getStatistics(),
    };
  }

  // =========================================================================
  // Accessors
  // =========================================================================

  /**
   * Get MainAgent
   */
  public getMainAgent(): MainAgent {
    return this.mainAgent;
  }

  /**
   * Get MemoryEngine
   */
  public getMemoryEngine(): MemoryEngine {
    return this.memoryEngine;
  }

  /**
   * Get ThinkingEngine
   */
  public getThinkingEngine(): ThinkingEngine {
    return this.thinkingEngine;
  }

  /**
   * Get ToolsEngine
   */
  public getToolsEngine(): ToolsEngine {
    return this.toolsEngine;
  }

  /**
   * Get ContextEngine
   */
  public getContextEngine(): ContextEngine {
    return this.contextEngine;
  }

  /**
   * Get ApplyEngine
   */
  public getApplyEngine(): ApplyEngine {
    return this.applyEngine;
  }
}

/**
 * Create an integrated agent system
 */
export async function createIntegratedAgent(
  config: IntegratedAgentConfig
): Promise<IntegratedAgent> {
  const agent = new IntegratedAgent(config);
  await agent.initialize();
  await agent.start();
  return agent;
}
