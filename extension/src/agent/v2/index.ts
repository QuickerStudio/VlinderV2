/**
 * @fileoverview V2 Agent System - Main Entry Point
 * 
 * This module exports all components of the V2 Agent architecture:
 * - MainAgent: Supreme global leader of the autonomous programming system
 * - AgentSwarm: Orchestrates multiple Bee agents
 * - Bee: Worker agents that execute specific tasks
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
export * from './core/types';

// MainAgent - Supreme Global Leader
export { MainAgent } from './core/main-agent';

// AgentSwarm - Bee Orchestration
export { AgentSwarm, SwarmConfig } from './AgentSwarm/swarm';

// Bee - Worker Agent
export { Bee, BeeFactory } from './AgentSwarm/bee';

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
  mainAgent: import('./core/types').MainAgentConfig;
}): Promise<{
  mainAgent: import('./core/main-agent').MainAgent;
  swarm: import('./AgentSwarm/swarm').AgentSwarm;
}> {
  // Import modules
  const { MainAgent } = await import('./core/main-agent');
  const { AgentSwarm } = await import('./AgentSwarm/swarm');
  
  // Create MainAgent
  const mainAgent = new MainAgent(config.mainAgent);
  await mainAgent.initialize();
  
  // Get swarm from MainAgent
  // Note: The swarm is created internally by MainAgent
  
  return {
    mainAgent,
    swarm: new AgentSwarm({
      mainAgentId: config.mainAgent.id,
      bees: config.mainAgent.bees,
    }),
  };
}

/**
 * Quick start helper for creating a basic V2 system
 */
export async function quickStart(options: {
  name?: string;
  provider?: import('./core/types').ModelProvider;
  modelId?: string;
} = {}): Promise<import('./core/main-agent').MainAgent> {
  const { MainAgent } = await import('./core/main-agent');
  const { ModelProvider } = await import('./core/types');
  
  const config: import('./core/types').MainAgentConfig = {
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
