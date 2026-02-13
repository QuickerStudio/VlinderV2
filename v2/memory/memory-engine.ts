/**
 * @fileoverview V2 Memory Engine - Advanced Memory Management System
 * 
 * Implements a sophisticated memory system with:
 * - Short-term and long-term memory
 * - Vector embeddings for semantic search
 * - Memory compression and summarization
 * - Persistence support
 * - Importance-based retention
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  MemoryConfig,
  MemoryEntry,
  MemoryMetadata,
  MemoryQuery,
  MemoryFilter,
} from '../core/types';

/**
 * Default memory configuration
 */
const DEFAULT_CONFIG: MemoryConfig = {
  shortTermCapacity: 100,
  longTermCapacity: 10000,
  embeddingDimension: 1536,
  similarityThreshold: 0.7,
  compressionEnabled: true,
  persistenceEnabled: false,
};

/**
 * Memory storage backend interface
 */
interface MemoryStorage {
  get(id: string): Promise<MemoryEntry | undefined>;
  getAll(): Promise<MemoryEntry[]>;
  set(entry: MemoryEntry): Promise<void>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

/**
 * In-memory storage implementation
 */
class InMemoryStorage implements MemoryStorage {
  private entries: Map<string, MemoryEntry> = new Map();

  async get(id: string): Promise<MemoryEntry | undefined> {
    return this.entries.get(id);
  }

  async getAll(): Promise<MemoryEntry[]> {
    return Array.from(this.entries.values());
  }

  async set(entry: MemoryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  async size(): Promise<number> {
    return this.entries.size;
  }
}

/**
 * Memory Engine - Manages agent memory with semantic search
 */
export class MemoryEngine extends EventEmitter {
  private config: MemoryConfig;
  private shortTermMemory: MemoryStorage;
  private longTermMemory: MemoryStorage;
  private embeddingCache: Map<string, number[]> = new Map();
  private accessLog: Map<string, number[]> = new Map();
  private isInitialized: boolean = false;

  constructor(config: Partial<MemoryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.shortTermMemory = new InMemoryStorage();
    this.longTermMemory = new InMemoryStorage();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Initialize the memory engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Load persisted memories if enabled
    if (this.config.persistenceEnabled && this.config.persistencePath) {
      await this.loadPersistedMemories();
    }
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the memory engine
   */
  public async shutdown(): Promise<void> {
    // Persist memories if enabled
    if (this.config.persistenceEnabled) {
      await this.persistMemories();
    }
    
    this.isInitialized = false;
    this.emit('shutdown');
  }

  // =========================================================================
  // Memory Operations
  // =========================================================================

  /**
   * Store a new memory entry
   */
  public async store(entry: Partial<MemoryEntry>): Promise<MemoryEntry> {
    const now = Date.now();
    
    const fullEntry: MemoryEntry = {
      id: entry.id || this.generateId(),
      content: entry.content || '',
      embedding: entry.embedding,
      metadata: {
        source: 'agent',
        type: 'experience',
        tags: [],
        confidence: 1.0,
        ...entry.metadata,
      },
      createdAt: entry.createdAt || now,
      lastAccessedAt: now,
      accessCount: 0,
      importance: entry.importance ?? this.calculateImportance(entry),
    };
    
    // Generate embedding if not provided
    if (!fullEntry.embedding && this.config.embeddingDimension > 0) {
      fullEntry.embedding = await this.generateEmbedding(fullEntry.content);
    }
    
    // Store in short-term memory
    await this.shortTermMemory.set(fullEntry);
    
    // Check capacity and potentially move to long-term
    await this.checkCapacity();
    
    this.emit('stored', fullEntry);
    
    return fullEntry;
  }

  /**
   * Retrieve memories based on query
   */
  public async retrieve(query: MemoryQuery): Promise<MemoryEntry[]> {
    const { query: queryText, topK, minSimilarity, filter, includeEmbeddings } = query;
    
    // Get all entries from both memories
    const shortTermEntries = await this.shortTermMemory.getAll();
    const longTermEntries = await this.longTermMemory.getAll();
    const allEntries = [...shortTermEntries, ...longTermEntries];
    
    // Apply filters
    let filtered = this.applyFilters(allEntries, filter);
    
    // Generate query embedding
    const queryEmbedding = query.queryEmbedding || 
      await this.generateEmbedding(queryText);
    
    // Calculate similarities
    const scored = filtered.map(entry => ({
      entry,
      similarity: this.cosineSimilarity(queryEmbedding, entry.embedding || []),
    }));
    
    // Filter by minimum similarity
    const aboveThreshold = scored.filter(
      s => s.similarity >= (minSimilarity ?? this.config.similarityThreshold)
    );
    
    // Sort by similarity
    aboveThreshold.sort((a, b) => b.similarity - a.similarity);
    
    // Take top K
    const results = aboveThreshold.slice(0, topK);
    
    // Update access statistics
    for (const { entry } of results) {
      await this.updateAccessStats(entry.id);
    }
    
    // Optionally remove embeddings from results
    if (!includeEmbeddings) {
      results.forEach(r => delete r.entry.embedding);
    }
    
    this.emit('retrieved', { query, count: results.length });
    
    return results.map(r => r.entry);
  }

  /**
   * Get a specific memory by ID
   */
  public async get(id: string): Promise<MemoryEntry | undefined> {
    let entry = await this.shortTermMemory.get(id);
    if (!entry) {
      entry = await this.longTermMemory.get(id);
    }
    
    if (entry) {
      await this.updateAccessStats(id);
    }
    
    return entry;
  }

  /**
   * Forget (delete) a memory
   */
  public async forget(id: string): Promise<boolean> {
    let deleted = await this.shortTermMemory.delete(id);
    if (!deleted) {
      deleted = await this.longTermMemory.delete(id);
    }
    
    if (deleted) {
      this.embeddingCache.delete(id);
      this.accessLog.delete(id);
      this.emit('forgotten', id);
    }
    
    return deleted;
  }

  /**
   * Clear all memories
   */
  public async clear(): Promise<void> {
    await this.shortTermMemory.clear();
    await this.longTermMemory.clear();
    this.embeddingCache.clear();
    this.accessLog.clear();
    this.emit('cleared');
  }

  // =========================================================================
  // Memory Management
  // =========================================================================

  /**
   * Check memory capacity and move old entries to long-term
   */
  private async checkCapacity(): Promise<void> {
    const shortTermSize = await this.shortTermMemory.size();
    
    if (shortTermSize > this.config.shortTermCapacity) {
      await this.consolidateMemories();
    }
    
    const longTermSize = await this.longTermMemory.size();
    if (longTermSize > this.config.longTermCapacity) {
      await this.pruneMemories();
    }
  }

  /**
   * Consolidate short-term memories into long-term
   */
  private async consolidateMemories(): Promise<void> {
    const entries = await this.shortTermMemory.getAll();
    
    // Sort by importance and access patterns
    const scored = entries.map(entry => ({
      entry,
      score: this.calculateRetentionScore(entry),
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    // Keep top entries in short-term, move rest to long-term
    const keepCount = Math.floor(this.config.shortTermCapacity * 0.8);
    
    for (let i = keepCount; i < scored.length; i++) {
      const { entry } = scored[i];
      await this.longTermMemory.set(entry);
      await this.shortTermMemory.delete(entry.id);
    }
    
    this.emit('consolidated', { moved: scored.length - keepCount });
  }

  /**
   * Prune least important long-term memories
   */
  private async pruneMemories(): Promise<void> {
    const entries = await this.longTermMemory.getAll();
    
    // Sort by retention score
    const scored = entries.map(entry => ({
      entry,
      score: this.calculateRetentionScore(entry),
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    // Keep top entries
    const keepCount = Math.floor(this.config.longTermCapacity * 0.9);
    
    for (let i = keepCount; i < scored.length; i++) {
      await this.longTermMemory.delete(scored[i].entry.id);
    }
    
    this.emit('pruned', { removed: scored.length - keepCount });
  }

  /**
   * Calculate retention score for an entry
   */
  private calculateRetentionScore(entry: MemoryEntry): number {
    const now = Date.now();
    const age = now - entry.createdAt;
    const timeSinceAccess = now - entry.lastAccessedAt;
    
    // Factors
    const importanceFactor = entry.importance;
    const accessFactor = Math.log(1 + entry.accessCount) / 10;
    const recencyFactor = 1 / (1 + timeSinceAccess / (1000 * 60 * 60)); // Decay over hours
    const ageFactor = 1 / (1 + age / (1000 * 60 * 60 * 24)); // Decay over days
    
    // Weighted combination
    return (
      importanceFactor * 0.4 +
      accessFactor * 0.3 +
      recencyFactor * 0.2 +
      ageFactor * 0.1
    );
  }

  /**
   * Calculate importance for a new entry
   */
  private calculateImportance(entry: Partial<MemoryEntry>): number {
    let importance = 0.5; // Base importance
    
    // Adjust based on metadata
    if (entry.metadata?.confidence) {
      importance *= entry.metadata.confidence;
    }
    
    // Adjust based on content length (longer = potentially more important)
    if (entry.content) {
      const lengthFactor = Math.min(entry.content.length / 1000, 1);
      importance += lengthFactor * 0.2;
    }
    
    // Adjust based on type
    if (entry.metadata?.type) {
      const typeWeights: Record<MemoryMetadata['type'], number> = {
        fact: 0.8,
        instruction: 0.9,
        preference: 0.7,
        context: 0.6,
        experience: 0.5,
      };
      importance *= typeWeights[entry.metadata.type] || 0.5;
    }
    
    return Math.min(1, Math.max(0, importance));
  }

  // =========================================================================
  // Embedding Operations
  // =========================================================================

  /**
   * Generate embedding for text
   * Note: This is a placeholder - real implementation would use an embedding model
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }
    
    // Placeholder: Generate a simple hash-based embedding
    // In production, this would call an embedding API
    const embedding = this.generateSimpleEmbedding(text);
    this.embeddingCache.set(text, embedding);
    
    return embedding;
  }

  /**
   * Generate a simple embedding (placeholder implementation)
   */
  private generateSimpleEmbedding(text: string): number[] {
    const dimension = this.config.embeddingDimension;
    const embedding = new Array(dimension).fill(0);
    
    // Simple character-based embedding
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = i % dimension;
      embedding[index] += Math.sin(charCode * (i + 1)) * 0.1;
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // =========================================================================
  // Filtering
  // =========================================================================

  /**
   * Apply filters to memory entries
   */
  private applyFilters(
    entries: MemoryEntry[],
    filter?: MemoryFilter
  ): MemoryEntry[] {
    if (!filter) {
      return entries;
    }
    
    return entries.filter(entry => {
      // Filter by source
      if (filter.source && !filter.source.includes(entry.metadata.source)) {
        return false;
      }
      
      // Filter by type
      if (filter.type && !filter.type.includes(entry.metadata.type)) {
        return false;
      }
      
      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tags.some(tag => 
          entry.metadata.tags.includes(tag)
        );
        if (!hasTag) {
          return false;
        }
      }
      
      // Filter by time range
      if (filter.timeRange) {
        if (entry.createdAt < filter.timeRange.start ||
            entry.createdAt > filter.timeRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }

  // =========================================================================
  // Access Statistics
  // =========================================================================

  /**
   * Update access statistics for an entry
   */
  private async updateAccessStats(id: string): Promise<void> {
    const entry = await this.shortTermMemory.get(id) || 
                  await this.longTermMemory.get(id);
    
    if (entry) {
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      
      // Update in storage
      if (await this.shortTermMemory.get(id)) {
        await this.shortTermMemory.set(entry);
      } else {
        await this.longTermMemory.set(entry);
      }
    }
    
    // Log access time
    const log = this.accessLog.get(id) || [];
    log.push(Date.now());
    this.accessLog.set(id, log.slice(-100)); // Keep last 100 accesses
  }

  // =========================================================================
  // Persistence
  // =========================================================================

  /**
   * Load persisted memories from storage
   */
  private async loadPersistedMemories(): Promise<void> {
    // Placeholder for loading from file/database
    this.emit('loaded');
  }

  /**
   * Persist memories to storage
   */
  private async persistMemories(): Promise<void> {
    // Placeholder for saving to file/database
    this.emit('persisted');
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get memory statistics
   */
  public async getStats(): Promise<{
    shortTermCount: number;
    longTermCount: number;
    totalSize: number;
    averageImportance: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    const shortTerm = await this.shortTermMemory.getAll();
    const longTerm = await this.longTermMemory.getAll();
    const all = [...shortTerm, ...longTerm];
    
    const timestamps = all.map(e => e.createdAt);
    
    return {
      shortTermCount: shortTerm.length,
      longTermCount: longTerm.length,
      totalSize: all.length,
      averageImportance: all.reduce((sum, e) => sum + e.importance, 0) / all.length || 0,
      oldestEntry: timestamps.length ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length ? Math.max(...timestamps) : null,
    };
  }
}
