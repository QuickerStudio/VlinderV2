/**
 * @fileoverview V2 Agent System - Main Entry Point
 * 
 * This module exports all components of the V2 Agent architecture:
 * - Core types and base agent
 * - Agent Swarm for multi-agent orchestration
 * - Memory Engine for persistent memory
 * - Thinking Engine for chain-of-thought reasoning
 * - Shared Middleware for inter-module communication
 * - Router for message routing
 * - Runtime for task scheduling
 * 
 * @version 2.0.0
 * @author Vlinder Team
 */

// Core types and base agent
export * from './core/types';
export * from './core/base-agent';

// Agent Swarm
export * from './swarm/agent-swarm';

// Memory Engine
export * from './memory/memory-engine';

// Thinking Engine
export * from './thinking/thinking-engine';

// Shared Middleware
export * from './shared/shared-middleware';

// Router
export * from './router/router';

// Runtime
export * from './runtime/agent-runtime';

// Version info
export const V2_VERSION = '2.0.0';
export const V2_BUILD_DATE = new Date().toISOString();

/**
 * Create a complete V2 Agent system
 */
export async function createV2System(config?: {
  runtime?: Partial<import('./runtime/agent-runtime').RuntimeConfig>;
  memory?: Partial<import('./memory/memory-engine').MemoryConfig>;
  thinking?: Partial<import('./thinking/thinking-engine').ThinkingConfig>;
}): Promise<{
  runtime: import('./runtime/agent-runtime').AgentRuntime;
  shared: import('./shared/shared-middleware').SharedMiddleware;
  router: import('./router/router').Router;
}> {
  // Import modules
  const { AgentRuntime } = await import('./runtime/agent-runtime');
  const { SharedMiddleware } = await import('./shared/shared-middleware');
  const { Router } = await import('./router/router');
  
  // Create shared middleware
  const shared = new SharedMiddleware();
  await shared.initialize();
  
  // Create router
  const router = new Router();
  await router.initialize();
  
  // Create runtime
  const runtime = new AgentRuntime(config?.runtime || {}, shared, router);
  await runtime.initialize();
  
  return { runtime, shared, router };
}
