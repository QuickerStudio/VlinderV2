/**
 * @fileoverview ToolsEngine - 工具调用引擎
 * 
 * Implements tool execution with:
 * - Tool registry and lifecycle
 * - Permission management
 * - Multi-round execution
 * - Error handling and retry
 * - Tool composition
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ToolId,
  ToolExecutionId,
  PermissionId,
  ToolDefinition,
  ToolHandler,
  ToolResult,
  ToolError,
  ToolCategory,
  ToolRiskLevel,
  ToolPermission,
  ToolExecutionContext,
  ToolExecutionRequest,
  ToolExecutionRecord,
  ToolExecutionStatus,
  ToolExecutionOptions,
  ToolExecutionMetrics,
  PermissionSet,
  PermissionRequest,
  PermissionDecision,
  PermissionPolicy,
  RetryPolicy,
  ToolsEngineConfig,
  ToolsEngineStatistics,
  ToolEventType,
  ToolEvent,
  ToolProgress,
  ToolDefinitionSchema,
  ToolExecutionRequestSchema,
} from './types';

/**
 * Default Tools Engine Configuration
 */
const DEFAULT_CONFIG: ToolsEngineConfig = {
  registry: {
    autoRegisterBuiltins: true,
    validateSchemas: true,
    allowDeprecated: false,
    hotReload: false,
  },
  permissions: {
    policy: {
      autoApprove: {
        safeTools: true,
        lowRiskTools: true,
        readOperations: true,
        trustedAgents: [],
      },
      autoDeny: {
        criticalOperations: false,
        untrustedSources: true,
      },
      temporaryPermissions: {
        enabled: true,
        defaultDuration: 3600000, // 1 hour
        maxDuration: 86400000, // 24 hours
      },
    },
    cacheDecisions: true,
    cacheSize: 1000,
    auditEnabled: true,
  },
  execution: {
    maxConcurrent: 10,
    defaultTimeout: 30000,
    maxTimeout: 300000,
    queueSize: 1000,
    priorityLevels: 5,
  },
  performance: {
    metricsEnabled: true,
    metricsInterval: 60000,
    profilingEnabled: false,
    cacheResults: true,
    cacheSize: 500,
    cacheTTL: 300000, // 5 minutes
  },
  logging: {
    enabled: true,
    level: 'info',
    logInput: true,
    logOutput: false,
    logErrors: true,
    logPerformance: true,
  },
};

/**
 * ToolsEngine - Tool Execution and Management System
 */
export class ToolsEngine extends EventEmitter {
  private config: ToolsEngineConfig;
  
  // Tool registry
  private tools: Map<ToolId, ToolDefinition> = new Map();
  private toolsByName: Map<string, ToolId> = new Map();
  
  // Execution management
  private executions: Map<ToolExecutionId, ToolExecutionRecord> = new Map();
  private activeExecutions: Map<ToolExecutionId, AbortController> = new Map();
  private executionQueue: ToolExecutionRequest[] = [];
  
  // Permission management
  private permissionCache: Map<string, PermissionDecision> = new Map();
  private pendingPermissions: Map<PermissionId, PermissionRequest> = new Map();
  
  // Result cache
  private resultCache: Map<string, { result: ToolResult; timestamp: number }> = new Map();
  
  // Statistics
  private stats: ToolsEngineStatistics;
  
  // State
  private isInitialized: boolean = false;

  constructor(config: Partial<ToolsEngineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as ToolsEngineConfig;
    this.stats = this.initializeStats();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the tools engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Register built-in tools if enabled
    if (this.config.registry.autoRegisterBuiltins) {
      await this.registerBuiltinTools();
    }
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the tools engine
   */
  public async shutdown(): Promise<void> {
    // Cancel all active executions
    for (const [id, controller] of this.activeExecutions) {
      controller.abort();
    }
    
    this.tools.clear();
    this.toolsByName.clear();
    this.executions.clear();
    this.activeExecutions.clear();
    this.executionQueue = [];
    this.permissionCache.clear();
    this.resultCache.clear();
    
    this.isInitialized = false;
    this.emit('shutdown');
  }

  // =========================================================================
  // Tool Registry
  // =========================================================================

  /**
   * Register a tool
   */
  public async registerTool(tool: ToolDefinition): Promise<void> {
    // Validate tool definition
    if (this.config.registry.validateSchemas) {
      ToolDefinitionSchema.parse(tool);
    }
    
    // Check for deprecated tools
    if (tool.deprecated && !this.config.registry.allowDeprecated) {
      throw new Error(`Tool ${tool.id} is deprecated and deprecated tools are not allowed`);
    }
    
    // Register tool
    this.tools.set(tool.id, tool);
    this.toolsByName.set(tool.name, tool.id);
    
    // Update stats
    this.stats.totalTools++;
    
    this.emit(ToolEventType.REGISTERED, { toolId: tool.id, tool });
  }

  /**
   * Register multiple tools
   */
  public async registerTools(tools: ToolDefinition[]): Promise<void> {
    for (const tool of tools) {
      await this.registerTool(tool);
    }
  }

  /**
   * Unregister a tool
   */
  public async unregisterTool(toolId: ToolId): Promise<boolean> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return false;
    }
    
    this.tools.delete(toolId);
    this.toolsByName.delete(tool.name);
    
    this.stats.totalTools--;
    
    this.emit(ToolEventType.UNREGISTERED, { toolId });
    
    return true;
  }

  /**
   * Get a tool by ID
   */
  public getTool(toolId: ToolId): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get a tool by name
   */
  public getToolByName(name: string): ToolDefinition | undefined {
    const toolId = this.toolsByName.get(name);
    return toolId ? this.tools.get(toolId) : undefined;
  }

  /**
   * Get all tools
   */
  public getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: ToolCategory): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.category === category);
  }

  /**
   * Get tools by risk level
   */
  public getToolsByRiskLevel(riskLevel: ToolRiskLevel): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.riskLevel === riskLevel);
  }

  // =========================================================================
  // Tool Execution
  // =========================================================================

  /**
   * Execute a tool
   */
  public async execute(request: ToolExecutionRequest): Promise<ToolResult> {
    // Validate request
    const validatedRequest = ToolExecutionRequestSchema.parse(request);
    
    // Get tool
    const tool = this.tools.get(validatedRequest.toolId) || 
                 this.getToolByName(validatedRequest.toolId);
    
    if (!tool) {
      throw new Error(`Tool not found: ${validatedRequest.toolId}`);
    }
    
    // Validate input
    const validatedInput = tool.inputSchema.parse(validatedRequest.input);
    
    // Create execution record
    const executionId = this.generateExecutionId();
    const execution: ToolExecutionRecord = {
      id: executionId,
      toolId: tool.id,
      input: validatedInput,
      status: ToolExecutionStatus.PENDING,
      startTime: Date.now(),
      permissionRequests: [],
      permissionDecisions: [],
      metrics: {},
      context: validatedRequest.context as ToolExecutionContext,
    };
    
    this.executions.set(executionId, execution);
    
    // Check permissions
    const hasPermission = await this.checkPermissions(tool, validatedInput, execution);
    if (!hasPermission) {
      execution.status = ToolExecutionStatus.WAITING_APPROVAL;
      // Wait for permission decision
      const decision = await this.waitForPermissionDecision(execution);
      if (!decision.granted) {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Permission denied by user',
            recoverable: false,
          },
        };
      }
    }
    
    // Execute tool
    const abortController = new AbortController();
    this.activeExecutions.set(executionId, abortController);
    execution.status = ToolExecutionStatus.RUNNING;
    
    this.emit(ToolEventType.EXECUTION_STARTED, { executionId, toolId: tool.id });
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey(tool.id, validatedInput);
      if (this.config.performance.cacheResults) {
        const cached = this.resultCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.config.performance.cacheTTL) {
          return cached.result;
        }
      }
      
      // Execute with timeout
      const timeout = validatedRequest.options?.timeout || tool.timeout;
      const result = await this.executeWithTimeout(
        tool,
        validatedInput,
        execution.context,
        timeout,
        abortController.signal
      );
      
      // Update execution record
      execution.status = ToolExecutionStatus.COMPLETED;
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.output = result.output;
      
      // Update stats
      this.stats.successfulExecutions++;
      
      // Cache result
      if (this.config.performance.cacheResults && result.success) {
        this.resultCache.set(cacheKey, { result, timestamp: Date.now() });
      }
      
      this.emit(ToolEventType.EXECUTION_COMPLETED, { executionId, result });
      
      return result;
      
    } catch (error) {
      execution.status = ToolExecutionStatus.FAILED;
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
      };
      
      this.stats.failedExecutions++;
      
      this.emit(ToolEventType.EXECUTION_FAILED, { executionId, error });
      
      // Retry if configured
      if (tool.retryPolicy && this.shouldRetry(error, tool.retryPolicy)) {
        return this.retryExecution(tool, validatedInput, execution.context, tool.retryPolicy);
      }
      
      return {
        success: false,
        error: execution.error,
      };
      
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    tool: ToolDefinition,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    timeout: number,
    signal: AbortSignal
  ): Promise<ToolResult> {
    return new Promise<ToolResult>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeout}ms`));
      }, timeout);
      
      // Set up abort handler
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Tool execution was aborted'));
      });
      
      // Execute tool
      tool.handler(input, context)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Retry execution
   */
  private async retryExecution(
    tool: ToolDefinition,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
    retryPolicy: RetryPolicy,
    attempt: number = 1
  ): Promise<ToolResult> {
    if (attempt > retryPolicy.maxRetries) {
      return {
        success: false,
        error: {
          code: 'MAX_RETRIES_EXCEEDED',
          message: `Max retries (${retryPolicy.maxRetries}) exceeded`,
          recoverable: false,
        },
      };
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
      retryPolicy.maxDelay
    );
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      return await tool.handler(input, context);
    } catch (error) {
      if (this.shouldRetry(error, retryPolicy)) {
        return this.retryExecution(tool, input, context, retryPolicy, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Check if error should trigger retry
   */
  private shouldRetry(error: unknown, retryPolicy: RetryPolicy): boolean {
    if (!(error instanceof Error)) return false;
    
    return retryPolicy.retryableErrors.some(
      retryableError => error.message.includes(retryableError)
    );
  }

  // =========================================================================
  // Permission Management
  // =========================================================================

  /**
   * Check permissions for tool execution
   */
  private async checkPermissions(
    tool: ToolDefinition,
    input: Record<string, unknown>,
    execution: ToolExecutionRecord
  ): Promise<boolean> {
    const policy = this.config.permissions.policy;
    
    // Check auto-approve rules
    if (tool.riskLevel === ToolRiskLevel.SAFE && policy.autoApprove.safeTools) {
      return true;
    }
    
    if (tool.riskLevel === ToolRiskLevel.LOW && policy.autoApprove.lowRiskTools) {
      return true;
    }
    
    if (tool.permissions.includes(ToolPermission.READ) && 
        !tool.permissions.includes(ToolPermission.WRITE) &&
        policy.autoApprove.readOperations) {
      return true;
    }
    
    // Check cached decisions
    const cacheKey = this.getPermissionCacheKey(tool.id, input);
    const cachedDecision = this.permissionCache.get(cacheKey);
    if (cachedDecision) {
      return cachedDecision.granted;
    }
    
    // Need to request permission
    return false;
  }

  /**
   * Request permission
   */
  public async requestPermission(
    tool: ToolDefinition,
    input: Record<string, unknown>,
    execution: ToolExecutionRecord
  ): Promise<PermissionRequest> {
    const request: PermissionRequest = {
      id: this.generatePermissionId(),
      toolId: tool.id,
      permissions: tool.permissions,
      reason: `Tool "${tool.name}" requires permission to execute`,
      riskLevel: tool.riskLevel,
      context: input,
      timestamp: Date.now(),
    };
    
    execution.permissionRequests.push(request);
    this.pendingPermissions.set(request.id, request);
    
    this.emit(ToolEventType.PERMISSION_REQUESTED, { requestId: request.id, request });
    
    return request;
  }

  /**
   * Wait for permission decision
   */
  private async waitForPermissionDecision(
    execution: ToolExecutionRecord
  ): Promise<PermissionDecision> {
    // In a real implementation, this would wait for user input
    // For now, we auto-approve based on policy
    const request = execution.permissionRequests[execution.permissionRequests.length - 1];
    
    const decision: PermissionDecision = {
      requestId: request.id,
      granted: true,
      temporary: false,
      reason: 'Auto-approved based on policy',
    };
    
    execution.permissionDecisions.push(decision);
    
    this.emit(ToolEventType.PERMISSION_GRANTED, { requestId: request.id, decision });
    
    return decision;
  }

  /**
   * Grant permission
   */
  public grantPermission(
    requestId: PermissionId,
    temporary: boolean = false,
    duration?: number
  ): void {
    const request = this.pendingPermissions.get(requestId);
    if (!request) {
      throw new Error(`Permission request not found: ${requestId}`);
    }
    
    const decision: PermissionDecision = {
      requestId,
      granted: true,
      temporary,
      expiry: temporary ? Date.now() + (duration || this.config.permissions.policy.temporaryPermissions.defaultDuration) : undefined,
    };
    
    // Cache decision
    const cacheKey = this.getPermissionCacheKey(request.toolId, request.context);
    this.permissionCache.set(cacheKey, decision);
    
    this.pendingPermissions.delete(requestId);
    
    this.emit(ToolEventType.PERMISSION_GRANTED, { requestId, decision });
  }

  /**
   * Deny permission
   */
  public denyPermission(requestId: PermissionId, reason?: string): void {
    const request = this.pendingPermissions.get(requestId);
    if (!request) {
      throw new Error(`Permission request not found: ${requestId}`);
    }
    
    const decision: PermissionDecision = {
      requestId,
      granted: false,
      reason,
    };
    
    this.pendingPermissions.delete(requestId);
    
    this.emit(ToolEventType.PERMISSION_DENIED, { requestId, decision });
  }

  // =========================================================================
  // Built-in Tools
  // =========================================================================

  /**
   * Register built-in tools
   */
  private async registerBuiltinTools(): Promise<void> {
    // Echo tool (for testing)
    await this.registerTool({
      id: 'builtin.echo',
      name: 'echo',
      description: 'Echo back the input',
      category: ToolCategory.SYSTEM,
      inputSchema: this.createEchoSchema(),
      permissions: [],
      riskLevel: ToolRiskLevel.SAFE,
      timeout: 5000,
      version: '1.0.0',
      handler: async (input) => ({
        success: true,
        output: input.message,
      }),
    });
    
    // More built-in tools would be registered here
  }

  /**
   * Create echo schema
   */
  private createEchoSchema(): z.ZodType<unknown> {
    return z.object({
      message: z.string(),
    });
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Generate execution ID
   */
  private generateExecutionId(): ToolExecutionId {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate permission ID
   */
  private generatePermissionId(): PermissionId {
    return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cache key for result
   */
  private getCacheKey(toolId: ToolId, input: Record<string, unknown>): string {
    return `${toolId}:${JSON.stringify(input)}`;
  }

  /**
   * Get permission cache key
   */
  private getPermissionCacheKey(toolId: ToolId, input: Record<string, unknown>): string {
    return `${toolId}:${JSON.stringify(input)}`;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): ToolsEngineStatistics {
    return {
      totalTools: 0,
      toolsByCategory: {} as Record<ToolCategory, number>,
      toolsByRiskLevel: {} as Record<ToolRiskLevel, number>,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      permissionRequests: 0,
      permissionGrants: 0,
      permissionDenials: 0,
      autoApprovals: 0,
      cacheHitRate: 0,
      queueLength: 0,
      activeExecutions: 0,
    };
  }

  // =========================================================================
  // Public API - Statistics
  // =========================================================================

  /**
   * Get statistics
   */
  public getStatistics(): ToolsEngineStatistics {
    const tools = Array.from(this.tools.values());
    const executions = Array.from(this.executions.values());
    
    const toolsByCategory: Record<ToolCategory, number> = {} as any;
    const toolsByRiskLevel: Record<ToolRiskLevel, number> = {} as any;
    
    for (const tool of tools) {
      toolsByCategory[tool.category] = (toolsByCategory[tool.category] || 0) + 1;
      toolsByRiskLevel[tool.riskLevel] = (toolsByRiskLevel[tool.riskLevel] || 0) + 1;
    }
    
    const completedExecutions = executions.filter(e => e.status === ToolExecutionStatus.COMPLETED);
    const totalDuration = completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
    
    return {
      totalTools: tools.length,
      toolsByCategory,
      toolsByRiskLevel,
      totalExecutions: executions.length,
      successfulExecutions: completedExecutions.length,
      failedExecutions: executions.filter(e => e.status === ToolExecutionStatus.FAILED).length,
      averageExecutionTime: completedExecutions.length > 0 
        ? totalDuration / completedExecutions.length 
        : 0,
      permissionRequests: this.pendingPermissions.size,
      permissionGrants: 0,
      permissionDenials: 0,
      autoApprovals: 0,
      cacheHitRate: 0,
      queueLength: this.executionQueue.length,
      activeExecutions: this.activeExecutions.size,
    };
  }

  /**
   * Get execution record
   */
  public getExecution(executionId: ToolExecutionId): ToolExecutionRecord | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Cancel execution
   */
  public async cancelExecution(executionId: ToolExecutionId): Promise<boolean> {
    const controller = this.activeExecutions.get(executionId);
    if (!controller) {
      return false;
    }
    
    controller.abort();
    this.activeExecutions.delete(executionId);
    
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = ToolExecutionStatus.CANCELLED;
      execution.endTime = Date.now();
    }
    
    return true;
  }

  /**
   * Clear all caches
   */
  public async clearCaches(): Promise<void> {
    this.resultCache.clear();
    this.permissionCache.clear();
  }
}
