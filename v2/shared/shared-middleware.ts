/**
 * @fileoverview V2 Shared Middleware - Central Communication Hub
 * 
 * Implements the shared middleware layer that connects all engine modules:
 * - Event bus for inter-module communication
 * - Shared state management
 * - Message queue for async processing
 * - Dependency injection container
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  AgentId,
  AgentMessage,
  MessageHandler,
  SharedState,
  MessageQueue,
  AgentEvent,
} from '../core/types';

// ============================================================================
// Event Bus
// ============================================================================

/**
 * Event types for the shared event bus
 */
export type SharedEventType = 
  | 'agent:created'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:error'
  | 'task:submitted'
  | 'task:completed'
  | 'task:failed'
  | 'memory:stored'
  | 'memory:retrieved'
  | 'thinking:step'
  | 'thinking:chain'
  | 'tool:executed'
  | 'context:updated'
  | 'swarm:health'
  | 'router:routed';

/**
 * Event handler type
 */
export type EventHandler = (event: AgentEvent) => void | Promise<void>;

/**
 * Shared Event Bus - Central event distribution system
 */
export class SharedEventBus extends EventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventHistory: AgentEvent[] = [];
  private maxHistorySize: number = 1000;
  private isPaused: boolean = false;

  /**
   * Subscribe to an event type
   */
  public subscribe(eventType: SharedEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    this.handlers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Publish an event
   */
  public async publish(event: AgentEvent): Promise<void> {
    if (this.isPaused) {
      return;
    }
    
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Emit to local listeners
    this.emit(event.type, event);
    
    // Call registered handlers
    const handlers = this.handlers.get(event.type as SharedEventType);
    if (handlers) {
      await Promise.all(
        Array.from(handlers).map(handler => handler(event))
      );
    }
    
    // Also call wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      await Promise.all(
        Array.from(wildcardHandlers).map(handler => handler(event))
      );
    }
  }

  /**
   * Get event history
   */
  public getHistory(filter?: {
    type?: string;
    source?: AgentId;
    since?: number;
  }): AgentEvent[] {
    let events = this.eventHistory;
    
    if (filter) {
      if (filter.type) {
        events = events.filter(e => e.type === filter.type);
      }
      if (filter.source) {
        events = events.filter(e => e.source === filter.source);
      }
      if (filter.since) {
        events = events.filter(e => e.timestamp >= filter.since!);
      }
    }
    
    return events;
  }

  /**
   * Pause event processing
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume event processing
   */
  public resume(): void {
    this.isPaused = false;
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }
}

// ============================================================================
// Shared State
// ============================================================================

/**
 * State entry with TTL support
 */
interface StateEntry<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Shared State Implementation - Key-value store with TTL support
 */
export class SharedStateImpl implements SharedState {
  private state: Map<string, StateEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value by key
   */
  public async get<T>(key: string): Promise<T | undefined> {
    const entry = this.state.get(key) as StateEntry<T> | undefined;
    
    if (!entry) {
      return undefined;
    }
    
    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.state.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  /**
   * Set a value with optional TTL
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now();
    
    const entry: StateEntry<T> = {
      value,
      createdAt: now,
      updatedAt: now,
      expiresAt: ttl ? now + ttl : undefined,
    };
    
    this.state.set(key, entry as StateEntry<unknown>);
  }

  /**
   * Delete a key
   */
  public async delete(key: string): Promise<boolean> {
    return this.state.delete(key);
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    const entry = this.state.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.state.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all state
   */
  public async clear(): Promise<void> {
    this.state.clear();
  }

  /**
   * Get all keys
   */
  public keys(): string[] {
    return Array.from(this.state.keys());
  }

  /**
   * Get state size
   */
  public size(): number {
    return this.state.size;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.state) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.state.delete(key);
      }
    }
  }

  /**
   * Destroy the state instance
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.state.clear();
  }
}

// ============================================================================
// Message Queue
// ============================================================================

/**
 * Priority queue entry
 */
interface QueueEntry {
  message: AgentMessage;
  priority: number;
  addedAt: number;
}

/**
 * Shared Message Queue Implementation
 */
export class SharedMessageQueue implements MessageQueue {
  private queue: QueueEntry[] = [];
  private handlers: Set<MessageHandler> = new Set();
  private isProcessing: boolean = false;
  private maxQueueSize: number = 10000;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start processing interval
    this.processingInterval = setInterval(() => this.processQueue(), 10);
  }

  /**
   * Publish a message to the queue
   */
  public async publish(message: AgentMessage): Promise<void> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Message queue is full');
    }
    
    const entry: QueueEntry = {
      message,
      priority: message.priority,
      addedAt: Date.now(),
    };
    
    // Insert in priority order
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (entry.priority < this.queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, entry);
  }

  /**
   * Subscribe to messages
   */
  public async subscribe(handler: MessageHandler): Promise<void> {
    this.handlers.add(handler);
  }

  /**
   * Unsubscribe from messages
   */
  public async unsubscribe(handler: MessageHandler): Promise<void> {
    this.handlers.delete(handler);
  }

  /**
   * Get queue size
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  public clear(): void {
    this.queue = [];
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || this.handlers.size === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const entry = this.queue.shift();
      if (!entry) return;
      
      // Deliver to all handlers
      await Promise.all(
        Array.from(this.handlers).map(handler => 
          Promise.resolve(handler(entry.message))
        )
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Destroy the queue
   */
  public destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.queue = [];
    this.handlers.clear();
  }
}

// ============================================================================
// Dependency Injection Container
// ============================================================================

/**
 * Factory function type
 */
export type Factory<T> = () => T | Promise<T>;

/**
 * Dependency container entry
 */
interface ContainerEntry<T> {
  value?: T;
  factory?: Factory<T>;
  singleton: boolean;
}

/**
 * Dependency Injection Container
 */
export class DIContainer {
  private entries: Map<string, ContainerEntry<unknown>> = new Map();
  private resolving: Set<string> = new Set();

  /**
   * Register a singleton value
   */
  public register<T>(token: string, value: T): void {
    this.entries.set(token, {
      value,
      singleton: true,
    });
  }

  /**
   * Register a factory for lazy instantiation
   */
  public registerFactory<T>(
    token: string,
    factory: Factory<T>,
    singleton: boolean = true
  ): void {
    this.entries.set(token, {
      factory,
      singleton,
    });
  }

  /**
   * Resolve a dependency
   */
  public async resolve<T>(token: string): Promise<T> {
    // Check for circular dependencies
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${token}`);
    }
    
    const entry = this.entries.get(token);
    if (!entry) {
      throw new Error(`Dependency not found: ${token}`);
    }
    
    // Return cached singleton value
    if (entry.singleton && entry.value !== undefined) {
      return entry.value as T;
    }
    
    // Create new instance
    if (entry.factory) {
      this.resolving.add(token);
      try {
        const value = await entry.factory();
        
        if (entry.singleton) {
          entry.value = value;
        }
        
        return value as T;
      } finally {
        this.resolving.delete(token);
      }
    }
    
    throw new Error(`Cannot resolve dependency: ${token}`);
  }

  /**
   * Check if a dependency is registered
   */
  public has(token: string): boolean {
    return this.entries.has(token);
  }

  /**
   * Remove a dependency
   */
  public remove(token: string): boolean {
    return this.entries.delete(token);
  }

  /**
   * Clear all dependencies
   */
  public clear(): void {
    this.entries.clear();
  }
}

// ============================================================================
// Shared Middleware - Main Export
// ============================================================================

/**
 * Shared Middleware - Central hub connecting all engines
 */
export class SharedMiddleware {
  public readonly eventBus: SharedEventBus;
  public readonly state: SharedStateImpl;
  public readonly messageQueue: SharedMessageQueue;
  public readonly container: DIContainer;
  
  private isInitialized: boolean = false;

  constructor() {
    this.eventBus = new SharedEventBus();
    this.state = new SharedStateImpl();
    this.messageQueue = new SharedMessageQueue();
    this.container = new DIContainer();
  }

  /**
   * Initialize the shared middleware
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Register core services
    this.container.register('eventBus', this.eventBus);
    this.container.register('state', this.state);
    this.container.register('messageQueue', this.messageQueue);
    
    this.isInitialized = true;
    
    await this.eventBus.publish({
      id: 'init',
      type: 'system:initialized',
      source: 'shared',
      payload: { timestamp: Date.now() },
      timestamp: Date.now(),
    });
  }

  /**
   * Shutdown the shared middleware
   */
  public async shutdown(): Promise<void> {
    this.state.destroy();
    this.messageQueue.destroy();
    this.eventBus.removeAllListeners();
    this.container.clear();
    
    this.isInitialized = false;
  }

  /**
   * Get health status
   */
  public getHealth(): {
    initialized: boolean;
    stateSize: number;
    queueSize: number;
    eventHandlers: number;
  } {
    return {
      initialized: this.isInitialized,
      stateSize: this.state.size(),
      queueSize: this.messageQueue.size(),
      eventHandlers: this.eventBus.listenerCount('*'),
    };
  }
}
