/**
 * @fileoverview V2 Engines - Complete Engine System
 * 
 * This module exports all engine components:
 * - MemoryEngine: Persistent memory with ChromaDB vector storage
 * - ThinkingEngine: Chain-of-thought reasoning
 * - ToolsEngine: Tool execution with permission management
 * - ContextEngine: Agentic context management
 * - ApplyEngine: Multi-round tool execution
 * 
 * @version 2.0.0
 */

// Memory Engine
export * from './MemoryEngine';
export { MemoryEngine } from './MemoryEngine';

// Thinking Engine
export * from './ThinkingEngine';
export { ThinkingEngine } from './ThinkingEngine';

// Tools Engine
export * from './ToolsEngine';
export { ToolsEngine } from './ToolsEngine';

// Context Engine
export * from './ContextEngine';
export { ContextEngine } from './ContextEngine';

// Apply Engine
export * from './ApplyEngine';
export { ApplyEngine } from './ApplyEngine';

// Version info
export const ENGINES_VERSION = '2.0.0';
export const ENGINES_BUILD_DATE = new Date().toISOString();

/**
 * Initialize all engines
 */
export async function initializeEngines(config?: {
  memory?: Partial<import('./MemoryEngine/types').MemoryEngineConfig>;
  thinking?: Partial<import('./ThinkingEngine/types').ThinkingEngineConfig>;
  tools?: Partial<import('./ToolsEngine/types').ToolsEngineConfig>;
  context?: Partial<import('./ContextEngine/types').ContextManagerConfig>;
  apply?: Partial<import('./ApplyEngine/types').ApplyEngineConfig>;
}): Promise<{
  memory: import('./MemoryEngine/memory-engine').MemoryEngine;
  thinking: import('./ThinkingEngine/thinking-engine').ThinkingEngine;
  tools: import('./ToolsEngine/tools-engine').ToolsEngine;
  context: import('./ContextEngine/context-engine').ContextEngine;
  apply: import('./ApplyEngine/apply-engine').ApplyEngine;
}> {
  const { MemoryEngine } = await import('./MemoryEngine');
  const { ThinkingEngine } = await import('./ThinkingEngine');
  const { ToolsEngine } = await import('./ToolsEngine');
  const { ContextEngine } = await import('./ContextEngine');
  const { ApplyEngine } = await import('./ApplyEngine');
  
  const memory = new MemoryEngine(config?.memory);
  const thinking = new ThinkingEngine(config?.thinking);
  const tools = new ToolsEngine(config?.tools);
  const context = new ContextEngine(config?.context);
  const apply = new ApplyEngine(config?.apply);
  
  await Promise.all([
    memory.initialize(),
    thinking.initialize(),
    tools.initialize(),
    apply.initialize(),
  ]);
  
  return { memory, thinking, tools, context, apply };
}
