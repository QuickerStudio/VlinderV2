/**
 * @fileoverview V2 Agent System - Main Entry Point
 * 
 * This module exports all components of the V2 Agent architecture:
 * - MainAgent: Supreme global leader of the autonomous programming system
 * - AgentSwarm: Orchestrates multiple Bee agents
 * - Bee: Worker agents that execute specific tasks
 * - Engines: Complete engine system (Memory, Thinking, Tools, Context, Apply)
 * 
 * Design based on:
 * - OpenAI Swarm (https://github.com/openai/swarm)
 * - Goose (https://github.com/block/goose)
 * - Claude Agent SDK (https://github.com/anthropics/claude-agent-sdk-typescript)
 * 
 * @version 2.0.0
 * @author Vlinder Team
 */

// Core types
export * from './types';

// MainAgent - Supreme Global Leader
export { MainAgent } from './main-agent';

// AgentSwarm - Bee Orchestration
export { AgentSwarm, SwarmConfig } from './AgentSwarm/swarm';

// Bee - Worker Agent
export { Bee, BeeFactory } from './AgentSwarm/bee';

// Engines - Complete Engine System
export * from './Engines';

// Version info
export const V2_VERSION = '2.0.0';
export const V2_BUILD_DATE = new Date().toISOString();

/**
 * Create a complete V2 Agent system
 * 
 * @example
 * ```typescript
 * import { createV2System } from './agent/v2';
 * 
 * const system = await createV2System({
 *   mainAgent: {
 *     id: 'main',
 *     name: 'Vlinder MainAgent',
 *     version: '2.0.0',
 *     model: {
 *       provider: ModelProvider.ANTHROPIC,
 *       modelId: 'claude-3-5-sonnet-20241022',
 *       temperature: 0.7,
 *       maxTokens: 4096,
 *     },
 *     instructions: 'You are a helpful programming assistant.',
 *     capabilities: [],
 *     tools: [],
 *     behavior: {
 *       maxTurns: 100,
 *       maxRetries: 3,
 *       timeout: 60000,
 *       parallelToolCalls: true,
 *       toolChoice: 'auto',
 *       autoApprove: false,
 *       verboseMode: false,
 *     },
 *     session: {
 *       id: 'session_1',
 *       persistenceEnabled: true,
 *     },
 *     bees: [],
 *   },
 * });
 * 
 * await system.mainAgent.start();
 * const response = await system.mainAgent.run([
 *   { id: '1', role: 'user', content: 'Hello!', timestamp: Date.now() }
 * ]);
 * ```
 */
export async function createV2System(config: {
  mainAgent: import('./types').MainAgentConfig;
  engines?: {
    memory?: Partial<import('./Engines/MemoryEngine/types').MemoryEngineConfig>;
    thinking?: Partial<import('./Engines/ThinkingEngine/types').ThinkingEngineConfig>;
    tools?: Partial<import('./Engines/ToolsEngine/types').ToolsEngineConfig>;
    context?: Partial<import('./Engines/ContextEngine/types').ContextManagerConfig>;
    apply?: Partial<import('./Engines/ApplyEngine/types').ApplyEngineConfig>;
  };
}): Promise<{
  mainAgent: import('./main-agent').MainAgent;
  swarm: import('./AgentSwarm/swarm').AgentSwarm;
  engines: {
    memory: import('./Engines/MemoryEngine/memory-engine').MemoryEngine;
    thinking: import('./Engines/ThinkingEngine/thinking-engine').ThinkingEngine;
    tools: import('./Engines/ToolsEngine/tools-engine').ToolsEngine;
    context: import('./Engines/ContextEngine/context-engine').ContextEngine;
    apply: import('./Engines/ApplyEngine/apply-engine').ApplyEngine;
  };
}> {
  // Import modules
  const { MainAgent } = await import('./main-agent');
  const { AgentSwarm } = await import('./AgentSwarm/swarm');
  const { initializeEngines } = await import('./Engines');
  
  // Create MainAgent
  const mainAgent = new MainAgent(config.mainAgent);
  await mainAgent.initialize();
  
  // Initialize engines
  const engines = await initializeEngines(config.engines);
  
  return {
    mainAgent,
    swarm: new AgentSwarm({
      mainAgentId: config.mainAgent.id,
      bees: config.mainAgent.bees,
    }),
    engines,
  };
}

/**
 * Quick start helper for creating a basic V2 system
 */
export async function quickStart(options: {
  name?: string;
  provider?: import('./types').ModelProvider;
  modelId?: string;
} = {}): Promise<import('./main-agent').MainAgent> {
  const { MainAgent } = await import('./main-agent');
  const { ModelProvider } = await import('./types');
  
  const config: import('./types').MainAgentConfig = {
    id: 'main_' + Date.now(),
    name: options.name || 'Vlinder Agent',
    version: '2.0.0',
    model: {
      provider: options.provider || ModelProvider.ANTHROPIC,
      modelId: options.modelId || 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096,
    },
    instructions: 'You are a helpful programming assistant.',
    capabilities: [],
    tools: [],
    behavior: {
      maxTurns: 100,
      maxRetries: 3,
      timeout: 60000,
      parallelToolCalls: true,
      toolChoice: 'auto',
      autoApprove: false,
      verboseMode: false,
    },
    session: {
      id: 'session_' + Date.now(),
      persistenceEnabled: false,
    },
    bees: [],
  };
  
  const mainAgent = new MainAgent(config);
  await mainAgent.initialize();
  await mainAgent.start();
  
  return mainAgent;
}
