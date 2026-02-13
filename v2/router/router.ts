/**
 * @fileoverview V2 Router - Message Routing System
 * 
 * Implements a sophisticated routing system with:
 * - Pattern-based routing
 * - Middleware pipeline
 * - Load balancing
 * - Error handling
 * - Request/response correlation
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  RouterConfig,
  RouteDefinition,
  RouteHandler,
  RouteContext,
  MiddlewareConfig,
  MiddlewareHandler,
  ErrorHandler,
  AgentMessage,
  AgentId,
  MessageType,
} from '../core/types';

/**
 * Route match result
 */
interface RouteMatch {
  route: RouteDefinition;
  params: Record<string, string>;
}

/**
 * Router statistics
 */
interface RouterStats {
  totalRouted: number;
  successfulRouted: number;
  failedRouted: number;
  averageLatency: number;
  routesByPattern: Map<string, number>;
}

/**
 * V2 Router - Routes messages to appropriate handlers
 */
export class Router extends EventEmitter {
  private routes: RouteDefinition[] = [];
  private middleware: MiddlewareHandler[] = [];
  private errorHandler?: ErrorHandler;
  private stats: RouterStats;
  private isInitialized: boolean = false;

  constructor(config?: Partial<RouterConfig>) {
    super();
    
    // Initialize statistics
    this.stats = {
      totalRouted: 0,
      successfulRouted: 0,
      failedRouted: 0,
      averageLatency: 0,
      routesByPattern: new Map(),
    };
    
    // Load routes from config
    if (config?.routes) {
      for (const route of config.routes) {
        this.addRoute(route);
      }
    }
    
    // Load middleware from config
    if (config?.middleware) {
      for (const mw of config.middleware) {
        this.addMiddleware(mw.handler, mw.priority);
      }
    }
    
    this.errorHandler = config?.errorHandler;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the router
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Sort routes by priority
    this.routes.sort((a, b) => b.priority - a.priority);
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the router
   */
  public async shutdown(): Promise<void> {
    this.routes = [];
    this.middleware = [];
    this.isInitialized = false;
    this.emit('shutdown');
  }

  // =========================================================================
  // Route Management
  // =========================================================================

  /**
   * Add a route
   */
  public addRoute(route: RouteDefinition): void {
    this.routes.push(route);
    
    // Sort by priority (higher priority first)
    this.routes.sort((a, b) => b.priority - a.priority);
    
    this.emit('routeAdded', route);
  }

  /**
   * Remove a route
   */
  public removeRoute(pattern: string | RegExp): boolean {
    const index = this.routes.findIndex(r => 
      r.pattern.toString() === pattern.toString()
    );
    
    if (index !== -1) {
      const removed = this.routes.splice(index, 1)[0];
      this.emit('routeRemoved', removed);
      return true;
    }
    
    return false;
  }

  /**
   * Get all routes
   */
  public getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  // =========================================================================
  // Middleware Management
  // =========================================================================

  /**
   * Add middleware
   */
  public addMiddleware(handler: MiddlewareHandler, priority: number = 0): void {
    // Store middleware with priority
    const mw = Object.assign(handler, { priority });
    this.middleware.push(mw);
    
    // Sort by priority
    this.middleware.sort((a, b) => ((a as any).priority || 0) - ((b as any).priority || 0));
    
    this.emit('middlewareAdded', { handler, priority });
  }

  /**
   * Remove middleware
   */
  public removeMiddleware(handler: MiddlewareHandler): boolean {
    const index = this.middleware.indexOf(handler);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  // =========================================================================
  // Routing
  // =========================================================================

  /**
   * Route a message
   */
  public async route(message: AgentMessage): Promise<unknown> {
    const startTime = Date.now();
    this.stats.totalRouted++;
    
    try {
      // Find matching route
      const match = this.findRoute(message);
      
      if (!match) {
        throw new Error(`No route found for message type: ${message.type}`);
      }
      
      // Create route context
      const context: RouteContext = {
        params: match.params,
        agent: message.from,
        session: message.correlationId || '',
        metadata: {},
      };
      
      // Build middleware pipeline
      const pipeline = this.buildPipeline(match.route.handler, match.route.middleware);
      
      // Execute pipeline
      const result = await pipeline(message, context);
      
      // Update statistics
      const latency = Date.now() - startTime;
      this.updateStats(match.route, latency, true);
      
      this.emit('routed', { message, route: match.route, latency });
      
      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.stats.failedRouted++;
      
      this.emit('error', { message, error });
      
      if (this.errorHandler) {
        return this.errorHandler(error as Error, message);
      }
      
      throw error;
    }
  }

  /**
   * Find a matching route
   */
  private findRoute(message: AgentMessage): RouteMatch | undefined {
    for (const route of this.routes) {
      const params = this.matchPattern(route.pattern, message);
      if (params !== null) {
        return { route, params };
      }
    }
    return undefined;
  }

  /**
   * Match a pattern against a message
   */
  private matchPattern(
    pattern: string | RegExp,
    message: AgentMessage
  ): Record<string, string> | null {
    if (typeof pattern === 'string') {
      // Simple string matching with parameter extraction
      if (pattern === message.type) {
        return {};
      }
      
      // Pattern with parameters (e.g., "task:{taskId}")
      if (pattern.includes(':')) {
        const patternParts = pattern.split('/');
        const typeParts = message.type.split('/');
        
        if (patternParts.length !== typeParts.length) {
          return null;
        }
        
        const params: Record<string, string> = {};
        
        for (let i = 0; i < patternParts.length; i++) {
          if (patternParts[i].startsWith(':')) {
            params[patternParts[i].slice(1)] = typeParts[i];
          } else if (patternParts[i] !== typeParts[i]) {
            return null;
          }
        }
        
        return params;
      }
      
      return null;
    } else {
      // RegExp matching
      const match = pattern.exec(message.type);
      if (match) {
        const params: Record<string, string> = {};
        // Extract named groups
        if (match.groups) {
          Object.assign(params, match.groups);
        }
        return params;
      }
      return null;
    }
  }

  /**
   * Build the middleware pipeline
   */
  private buildPipeline(
    handler: RouteHandler,
    routeMiddleware?: string[]
  ): (message: AgentMessage, context: RouteContext) => Promise<unknown> {
    // Get applicable middleware
    const applicableMiddleware = routeMiddleware
      ? this.middleware.filter(mw => 
          routeMiddleware.includes((mw as any).name || '')
        )
      : this.middleware;
    
    // Build pipeline
    let pipeline = handler;
    
    for (let i = applicableMiddleware.length - 1; i >= 0; i--) {
      const mw = applicableMiddleware[i];
      const next = pipeline;
      pipeline = async (message: AgentMessage, context: RouteContext) => {
        return mw(message, () => next(message, context));
      };
    }
    
    return pipeline;
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  /**
   * Update routing statistics
   */
  private updateStats(route: RouteDefinition, latency: number, success: boolean): void {
    if (success) {
      this.stats.successfulRouted++;
    }
    
    // Update average latency
    const total = this.stats.averageLatency * (this.stats.totalRouted - 1);
    this.stats.averageLatency = (total + latency) / this.stats.totalRouted;
    
    // Update route usage
    const patternKey = route.pattern.toString();
    this.stats.routesByPattern.set(
      patternKey,
      (this.stats.routesByPattern.get(patternKey) || 0) + 1
    );
  }

  /**
   * Get router statistics
   */
  public getStats(): RouterStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalRouted: 0,
      successfulRouted: 0,
      failedRouted: 0,
      averageLatency: 0,
      routesByPattern: new Map(),
    };
  }
}

// ============================================================================
// Built-in Middleware
// ============================================================================

/**
 * Logging middleware
 */
export const loggingMiddleware: MiddlewareHandler = async (message, next) => {
  console.log(`[Router] Routing message: ${message.type} from ${message.from}`);
  const start = Date.now();
  
  try {
    const result = await next();
    console.log(`[Router] Completed in ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`[Router] Error: ${error}`);
    throw error;
  }
};

/**
 * Timing middleware
 */
export const timingMiddleware: MiddlewareHandler = async (message, next) => {
  const start = Date.now();
  const result = await next();
  return {
    ...result as object,
    _timing: {
      duration: Date.now() - start,
      timestamp: start,
    },
  };
};

/**
 * Validation middleware
 */
export const validationMiddleware: MiddlewareHandler = async (message, next) => {
  // Validate message structure
  if (!message.id || !message.type || !message.from) {
    throw new Error('Invalid message: missing required fields');
  }
  
  // Check expiration
  if (message.expiresAt && message.expiresAt < Date.now()) {
    throw new Error('Message has expired');
  }
  
  return next();
};

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(
  maxRequests: number,
  windowMs: number
): MiddlewareHandler {
  const requests = new Map<string, number[]>();
  
  return async (message, next) => {
    const key = message.from;
    const now = Date.now();
    
    // Get or create request log
    let log = requests.get(key) || [];
    
    // Filter out old requests
    log = log.filter(time => time > now - windowMs);
    
    // Check limit
    if (log.length >= maxRequests) {
      throw new Error('Rate limit exceeded');
    }
    
    // Add current request
    log.push(now);
    requests.set(key, log);
    
    return next();
  };
}

/**
 * Retry middleware
 */
export function createRetryMiddleware(
  maxRetries: number,
  delayMs: number = 100
): MiddlewareHandler {
  return async (message, next) => {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await next();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }
    
    throw lastError;
  };
}

/**
 * Circuit breaker middleware
 */
export function createCircuitBreakerMiddleware(
  failureThreshold: number,
  resetTimeoutMs: number
): MiddlewareHandler {
  let failures = 0;
  let isOpen = false;
  let lastFailureTime = 0;
  
  return async (message, next) => {
    // Check if circuit should be reset
    if (isOpen && Date.now() - lastFailureTime > resetTimeoutMs) {
      isOpen = false;
      failures = 0;
    }
    
    // Check if circuit is open
    if (isOpen) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await next();
      failures = 0;
      return result;
    } catch (error) {
      failures++;
      lastFailureTime = Date.now();
      
      if (failures >= failureThreshold) {
        isOpen = true;
      }
      
      throw error;
    }
  };
}

// ============================================================================
// Route Builders
// ============================================================================

/**
 * Create a simple route
 */
export function createRoute(
  pattern: string | RegExp,
  handler: RouteHandler,
  options: Partial<RouteDefinition> = {}
): RouteDefinition {
  return {
    pattern,
    handler,
    priority: options.priority || 0,
    middleware: options.middleware,
  };
}

/**
 * Create a route group
 */
export function createRouteGroup(
  prefix: string,
  routes: RouteDefinition[],
  middleware?: string[]
): RouteDefinition[] {
  return routes.map(route => ({
    ...route,
    pattern: typeof route.pattern === 'string'
      ? `${prefix}/${route.pattern}`
      : route.pattern,
    middleware: [...(middleware || []), ...(route.middleware || [])],
  }));
}
