/**
 * @fileoverview ContextEngine Module Export
 * 
 * ContextEngine 包含:
 * - AgenticContextEngine: 主代理，上下文全局领导人
 * - AgenticSearchEngine: 子代理，异步并发搜索
 * - AgenticResearchEngine: 子代理，异步并发研究
 * 
 * @version 2.0.0
 */

// 原有类型和引擎
export * from './types';
export { ContextEngine } from './context-engine';

// Agentic Context Engine (主代理)
export * from './AgenticContextEngine/types';
export { AgenticContextEngine } from './AgenticContextEngine/context-agent';

// Agentic Search Engine (子代理)
export * from './AgenticSearchEngine/types';
export { AgenticSearchEngine } from './AgenticSearchEngine/search-engine';

// Agentic Research Engine (子代理)
export * from './AgenticResearchEngine/types';
export { AgenticResearchEngine } from './AgenticResearchEngine/research-engine';
