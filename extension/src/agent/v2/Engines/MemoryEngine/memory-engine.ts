/**
 * @fileoverview MemoryEngine - 持久化记忆系统引擎
 * 
 * 基于时间线的重要信息存入向量数据库ChromaDB的检索式记忆系统引擎
 * 
 * Features:
 * - Timeline-based memory storage
 * - ChromaDB vector database integration
 * - Importance-based retention
 * - Semantic search with embeddings
 * - Memory consolidation and pruning
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import {
  MemoryId,
  TimelineId,
  EmbeddingVector,
  MemoryEntry,
  MemoryMetadata,
  MemoryImport,
  MemorySource,
  MemoryContentType,
  MemoryQuery,
  MemoryQueryResult,
  MemoryFilter,
  MemoryEngineConfig,
  MemoryStatistics,
  MemoryConsolidationResult,
  MemoryEventType,
  MemoryEvent,
  TimelineInfo,
  TimelineEpoch,
  TimelineEvent,
  TimelineEventType,
  ChromaDBConfig,
  MemoryEntrySchema,
  MemoryQuerySchema,
} from './types';

/**
 * Default Memory Engine Configuration
 */
const DEFAULT_CONFIG: MemoryEngineConfig = {
  storage: {
    maxShortTermMemories: 1000,
    maxLongTermMemories: 100000,
    maxTotalMemories: 1000000,
    persistenceEnabled: true,
    autoSaveInterval: 60000,
    compressionEnabled: true,
    compressionThreshold: 0.7,
  },
  chromadb: {
    host: 'localhost',
    port: 8000,
    collectionName: 'vlinder_memories',
    distanceFunction: 'cosine',
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimension: 1536,
    batchSize: 100,
    cacheEnabled: true,
    cacheSize: 10000,
  },
  retention: {
    defaultDecayRate: 0.01,
    importanceBoostOnAccess: 0.1,
    consolidationEnabled: true,
    consolidationInterval: 300000,
    consolidationThreshold: 0.3,
    pruningEnabled: true,
    pruningInterval: 600000,
    pruningThreshold: 0.1,
    archiveEnabled: true,
    archiveAge: 86400000 * 7, // 7 days
  },
  timeline: {
    enabled: true,
    autoEpochDetection: true,
    maxEpochs: 1000,
    eventCaptureEnabled: true,
  },
  performance: {
    queryCacheEnabled: true,
    queryCacheSize: 1000,
    queryCacheTTL: 60000,
    indexEnabled: true,
    indexUpdateInterval: 30000,
    maxConcurrentQueries: 10,
    maxConcurrentEmbeddings: 50,
  },
};

/**
 * MemoryEngine - Core Memory Management System
 * 
 * Manages persistent memory with timeline-based storage and ChromaDB vector search
 */
export class MemoryEngine extends EventEmitter {
  private config: MemoryEngineConfig;
  
  // Memory storage
  private shortTermMemory: Map<MemoryId, MemoryEntry> = new Map();
  private longTermMemory: Map<MemoryId, MemoryEntry> = new Map();
  
  // Timeline management
  private currentTimeline: TimelineInfo;
  private epochs: Map<TimelineId, TimelineEpoch> = new Map();
  private events: TimelineEvent[] = [];
  private currentEpoch: TimelineEpoch | null = null;
  
  // Indexes for fast lookup
  private tagIndex: Map<string, Set<MemoryId>> = new Map();
  private typeIndex: Map<MemoryContentType, Set<MemoryId>> = new Map();
  private sourceIndex: Map<MemorySource, Set<MemoryId>> = new Map();
  private timelineIndex: Map<TimelineId, Set<MemoryId>> = new Map();
  
  // Embedding cache
  private embeddingCache: Map<string, EmbeddingVector> = new Map();
  
  // Query cache
  private queryCache: Map<string, { result: MemoryQueryResult; timestamp: number }> = new Map();
  
  // Statistics
  private stats: MemoryStatistics;
  
  // Background processes
  private consolidationTimer?: NodeJS.Timeout;
  private pruningTimer?: NodeJS.Timeout;
  private saveTimer?: NodeJS.Timeout;
  
  // State
  private isInitialized: boolean = false;
  private sequenceCounter: number = 0;

  constructor(config: Partial<MemoryEngineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as MemoryEngineConfig;
    
    // Initialize timeline
    this.currentTimeline = {
      timelineId: this.generateTimelineId(),
      timestamp: Date.now(),
      sequence: 0,
    };
    
    // Initialize statistics
    this.stats = this.initializeStats();
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
    
    try {
      // Initialize ChromaDB connection (placeholder - actual implementation would use ChromaDB client)
      await this.initializeChromaDB();
      
      // Start background processes
      this.startBackgroundProcesses();
      
      // Create initial epoch
      if (this.config.timeline.enabled) {
        await this.startNewEpoch('initial', 'Initial epoch');
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the memory engine
   */
  public async shutdown(): Promise<void> {
    // Stop background processes
    if (this.consolidationTimer) clearInterval(this.consolidationTimer);
    if (this.pruningTimer) clearInterval(this.pruningTimer);
    if (this.saveTimer) clearInterval(this.saveTimer);
    
    // Save state
    if (this.config.storage.persistenceEnabled) {
      await this.persist();
    }
    
    this.isInitialized = false;
    this.emit('shutdown');
  }

  // =========================================================================
  // Memory Storage
  // =========================================================================

  /**
   * Store a new memory
   */
  public async store(
    content: string,
    metadata: Partial<MemoryMetadata>,
    options: {
      contentType?: MemoryContentType;
      importance?: number;
      tags?: string[];
      generateEmbedding?: boolean;
    } = {}
  ): Promise<MemoryEntry> {
    const now = Date.now();
    const memoryId = this.generateMemoryId();
    
    // Calculate importance if not provided
    const importance = options.importance ?? this.calculateImportance(content, metadata);
    
    // Create memory entry
    const entry: MemoryEntry = {
      id: memoryId,
      content,
      contentType: options.contentType || MemoryContentType.CONVERSATION,
      metadata: {
        source: metadata.source || MemorySource.AGENT,
        sessionId: metadata.sessionId,
        taskId: metadata.taskId,
        agentId: metadata.agentId,
        toolName: metadata.toolName,
        filePath: metadata.filePath,
        language: metadata.language,
        confidence: metadata.confidence ?? 1.0,
        verified: metadata.verified ?? false,
        custom: metadata.custom,
      },
      timeline: { ...this.currentTimeline, sequence: ++this.sequenceCounter },
      importance,
      decayRate: this.config.retention.defaultDecayRate,
      accessCount: 0,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      tags: options.tags || [],
    };
    
    // Generate embedding if requested
    if (options.generateEmbedding !== false) {
      entry.embedding = await this.generateEmbedding(content);
      entry.embeddingModel = this.config.embedding.model;
    }
    
    // Store in short-term memory
    this.shortTermMemory.set(memoryId, entry);
    
    // Update indexes
    this.updateIndexes(entry);
    
    // Check capacity and consolidate if needed
    if (this.shortTermMemory.size > this.config.storage.maxShortTermMemories) {
      await this.consolidate();
    }
    
    // Emit event
    this.emit(MemoryEventType.STORED, { memoryId, entry });
    
    return entry;
  }

  /**
   * Store multiple memories in batch
   */
  public async storeBatch(
    items: Array<{
      content: string;
      metadata?: Partial<MemoryMetadata>;
      options?: {
        contentType?: MemoryContentType;
        importance?: number;
        tags?: string[];
      };
    }>
  ): Promise<MemoryEntry[]> {
    const entries: MemoryEntry[] = [];
    
    // Generate embeddings in batch for efficiency
    const contents = items.map(item => item.content);
    const embeddings = await this.generateEmbeddingsBatch(contents);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = await this.store(item.content, item.metadata || {}, {
        ...item.options,
        generateEmbedding: false, // We already generated
      });
      
      // Set the pre-generated embedding
      entry.embedding = embeddings[i];
      entries.push(entry);
    }
    
    return entries;
  }

  /**
   * Retrieve a memory by ID
   */
  public async get(memoryId: MemoryId): Promise<MemoryEntry | undefined> {
    let entry = this.shortTermMemory.get(memoryId);
    if (!entry) {
      entry = this.longTermMemory.get(memoryId);
    }
    
    if (entry) {
      // Update access statistics
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      entry.importance = Math.min(1.0, entry.importance + this.config.retention.importanceBoostOnAccess);
      
      this.emit(MemoryEventType.RETRIEVED, { memoryId });
    }
    
    return entry;
  }

  /**
   * Update a memory
   */
  public async update(
    memoryId: MemoryId,
    updates: Partial<MemoryEntry>
  ): Promise<MemoryEntry | undefined> {
    let entry = await this.get(memoryId);
    if (!entry) {
      return undefined;
    }
    
    // Apply updates
    entry = {
      ...entry,
      ...updates,
      updatedAt: Date.now(),
    };
    
    // Re-generate embedding if content changed
    if (updates.content && updates.content !== entry.content) {
      entry.embedding = await this.generateEmbedding(updates.content);
    }
    
    // Update storage
    if (this.shortTermMemory.has(memoryId)) {
      this.shortTermMemory.set(memoryId, entry);
    } else {
      this.longTermMemory.set(memoryId, entry);
    }
    
    // Update indexes
    this.updateIndexes(entry);
    
    this.emit(MemoryEventType.UPDATED, { memoryId, updates });
    
    return entry;
  }

  /**
   * Delete a memory
   */
  public async delete(memoryId: MemoryId): Promise<boolean> {
    const entry = await this.get(memoryId);
    if (!entry) {
      return false;
    }
    
    // Remove from storage
    this.shortTermMemory.delete(memoryId);
    this.longTermMemory.delete(memoryId);
    
    // Remove from indexes
    this.removeFromIndexes(entry);
    
    this.emit(MemoryEventType.DELETED, { memoryId });
    
    return true;
  }

  // =========================================================================
  // Memory Query
  // =========================================================================

  /**
   * Query memories with semantic search
   */
  public async query(query: MemoryQuery): Promise<MemoryQueryResult> {
    const startTime = Date.now();
    
    // Validate query
    const validatedQuery = MemoryQuerySchema.parse(query);
    
    // Check cache
    const cacheKey = this.getQueryCacheKey(validatedQuery);
    if (this.config.performance.queryCacheEnabled) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.performance.queryCacheTTL) {
        return cached.result;
      }
    }
    
    // Generate query embedding
    const queryEmbedding = query.queryEmbedding || 
      await this.generateEmbedding(validatedQuery.query);
    
    // Get all memories
    const allMemories = [
      ...Array.from(this.shortTermMemory.values()),
      ...Array.from(this.longTermMemory.values()),
    ];
    
    // Apply filters
    let filtered = this.applyFilters(allMemories, validatedQuery.filter);
    
    // Calculate similarities
    const scored = filtered.map(entry => ({
      entry,
      similarity: entry.embedding 
        ? this.cosineSimilarity(queryEmbedding, entry.embedding)
        : 0,
    }));
    
    // Filter by minimum similarity
    const minSimilarity = validatedQuery.minSimilarity ?? 0.0;
    const aboveThreshold = scored.filter(s => s.similarity >= minSimilarity);
    
    // Sort
    const sortBy = validatedQuery.sortBy || 'relevance';
    aboveThreshold.sort((a, b) => {
      switch (sortBy) {
        case 'importance':
          return b.entry.importance - a.entry.importance;
        case 'recency':
          return b.entry.createdAt - a.entry.createdAt;
        default: // relevance
          return b.similarity - a.similarity;
      }
    });
    
    // Take top K
    const topK = aboveThreshold.slice(0, validatedQuery.topK);
    
    // Update access statistics
    for (const { entry } of topK) {
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
    }
    
    const result: MemoryQueryResult = {
      memories: topK.map(s => s.entry),
      total: aboveThreshold.length,
      queryTime: Date.now() - startTime,
      similarities: topK.map(s => s.similarity),
    };
    
    // Cache result
    if (this.config.performance.queryCacheEnabled) {
      this.queryCache.set(cacheKey, { result, timestamp: Date.now() });
    }
    
    return result;
  }

  /**
   * Search memories by text
   */
  public async search(
    text: string,
    options: Partial<MemoryQuery> = {}
  ): Promise<MemoryQueryResult> {
    return this.query({
      query: text,
      topK: 10,
      ...options,
    });
  }

  /**
   * Get memories by time range
   */
  public async getByTimeRange(
    start: number,
    end: number,
    options: { limit?: number } = {}
  ): Promise<MemoryEntry[]> {
    const allMemories = [
      ...Array.from(this.shortTermMemory.values()),
      ...Array.from(this.longTermMemory.values()),
    ];
    
    const filtered = allMemories.filter(
      m => m.createdAt >= start && m.createdAt <= end
    );
    
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    
    return filtered.slice(0, options.limit || 100);
  }

  /**
   * Get memories by tags
   */
  public async getByTags(
    tags: string[],
    options: { matchAll?: boolean; limit?: number } = {}
  ): Promise<MemoryEntry[]> {
    const memoryIds = new Set<MemoryId>();
    
    if (options.matchAll) {
      // Must have all tags
      const sets = tags.map(tag => this.tagIndex.get(tag) || new Set());
      if (sets.length > 0) {
        const intersection = sets.reduce((a, b) => 
          new Set([...a].filter(x => b.has(x)))
        );
        intersection.forEach(id => memoryIds.add(id));
      }
    } else {
      // Must have any of the tags
      for (const tag of tags) {
        const ids = this.tagIndex.get(tag);
        if (ids) {
          ids.forEach(id => memoryIds.add(id));
        }
      }
    }
    
    const memories: MemoryEntry[] = [];
    for (const id of memoryIds) {
      const entry = await this.get(id);
      if (entry) {
        memories.push(entry);
      }
    }
    
    memories.sort((a, b) => b.importance - a.importance);
    
    return memories.slice(0, options.limit || 100);
  }

  // =========================================================================
  // Timeline Management
  // =========================================================================

  /**
   * Start a new timeline epoch
   */
  public async startNewEpoch(
    name: string,
    description?: string
  ): Promise<TimelineEpoch> {
    // End current epoch if exists
    if (this.currentEpoch) {
      await this.endCurrentEpoch();
    }
    
    const epoch: TimelineEpoch = {
      id: this.generateTimelineId(),
      name,
      description,
      startTime: Date.now(),
      memoryCount: 0,
      importantMemoryCount: 0,
    };
    
    this.epochs.set(epoch.id, epoch);
    this.currentEpoch = epoch;
    
    // Update timeline info
    this.currentTimeline = {
      timelineId: epoch.id,
      timestamp: epoch.startTime,
      sequence: 0,
    };
    
    this.emit(MemoryEventType.EPOCH_STARTED, { epoch });
    
    return epoch;
  }

  /**
   * End current epoch
   */
  public async endCurrentEpoch(): Promise<void> {
    if (!this.currentEpoch) {
      return;
    }
    
    this.currentEpoch.endTime = Date.now();
    
    // Calculate statistics
    const memories = this.timelineIndex.get(this.currentEpoch.id) || new Set();
    this.currentEpoch.memoryCount = memories.size;
    
    let importantCount = 0;
    for (const memoryId of memories) {
      const entry = await this.get(memoryId);
      if (entry && entry.importance >= MemoryImportance.HIGH) {
        importantCount++;
      }
    }
    this.currentEpoch.importantMemoryCount = importantCount;
    
    this.emit(MemoryEventType.EPOCH_ENDED, { epoch: this.currentEpoch });
    this.currentEpoch = null;
  }

  /**
   * Capture a timeline event
   */
  public async captureEvent(
    type: TimelineEventType,
    description: string,
    relatedMemoryIds: MemoryId[] = [],
    metadata?: Record<string, unknown>
  ): Promise<TimelineEvent> {
    const event: TimelineEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timelineId: this.currentTimeline.timelineId,
      type,
      timestamp: Date.now(),
      description,
      relatedMemoryIds,
      metadata,
    };
    
    this.events.push(event);
    
    // Auto-detect epoch transitions
    if (this.config.timeline.autoEpochDetection) {
      if (type === TimelineEventType.SESSION_START || 
          type === TimelineEventType.TASK_START) {
        await this.startNewEpoch(type, description);
      } else if (type === TimelineEventType.SESSION_END ||
                 type === TimelineEventType.TASK_COMPLETE) {
        await this.endCurrentEpoch();
      }
    }
    
    this.emit(MemoryEventType.EVENT_CAPTURED, { event });
    
    return event;
  }

  /**
   * Get timeline events
   */
  public async getTimelineEvents(
    options: { timelineId?: TimelineId; type?: TimelineEventType; limit?: number } = {}
  ): Promise<TimelineEvent[]> {
    let events = [...this.events];
    
    if (options.timelineId) {
      events = events.filter(e => e.timelineId === options.timelineId);
    }
    
    if (options.type) {
      events = events.filter(e => e.type === options.type);
    }
    
    events.sort((a, b) => b.timestamp - a.timestamp);
    
    return events.slice(0, options.limit || 100);
  }

  // =========================================================================
  // Memory Consolidation
  // =========================================================================

  /**
   * Consolidate memories (move from short-term to long-term)
   */
  public async consolidate(): Promise<MemoryConsolidationResult> {
    const result: MemoryConsolidationResult = {
      consolidated: 0,
      archived: 0,
      pruned: 0,
    };
    
    const now = Date.now();
    const threshold = this.config.retention.consolidationThreshold;
    
    // Find memories to consolidate
    const toConsolidate: MemoryEntry[] = [];
    const toPrune: MemoryEntry[] = [];
    
    for (const entry of this.shortTermMemory.values()) {
      const retentionScore = this.calculateRetentionScore(entry);
      
      if (retentionScore < this.config.retention.pruningThreshold) {
        toPrune.push(entry);
      } else if (retentionScore > threshold || 
                 this.shortTermMemory.size > this.config.storage.maxShortTermMemories * 0.8) {
        toConsolidate.push(entry);
      }
    }
    
    // Sort by retention score (lowest first for pruning)
    toPrune.sort((a, b) => 
      this.calculateRetentionScore(a) - this.calculateRetentionScore(b)
    );
    
    // Sort by retention score (highest first for consolidation)
    toConsolidate.sort((a, b) => 
      this.calculateRetentionScore(b) - this.calculateRetentionScore(a)
    );
    
    // Prune low-value memories
    for (const entry of toPrune.slice(0, Math.floor(toPrune.length * 0.3))) {
      await this.delete(entry.id);
      result.pruned++;
    }
    
    // Consolidate to long-term memory
    for (const entry of toConsolidate) {
      this.longTermMemory.set(entry.id, entry);
      this.shortTermMemory.delete(entry.id);
      result.consolidated++;
    }
    
    // Archive old memories
    if (this.config.retention.archiveEnabled) {
      const archiveAge = this.config.retention.archiveAge;
      for (const entry of this.longTermMemory.values()) {
        if (now - entry.createdAt > archiveAge && entry.importance < MemoryImportance.HIGH) {
          // In a real implementation, this would move to cold storage
          result.archived++;
        }
      }
    }
    
    this.emit(MemoryEventType.CONSOLIDATED, result);
    
    return result;
  }

  // =========================================================================
  // Embedding Generation
  // =========================================================================

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<EmbeddingVector> {
    // Check cache
    if (this.config.embedding.cacheEnabled) {
      const cached = this.embeddingCache.get(text);
      if (cached) {
        return cached;
      }
    }
    
    // In a real implementation, this would call the embedding API
    // For now, we generate a simple placeholder embedding
    const embedding = this.generatePlaceholderEmbedding(text);
    
    // Cache the embedding
    if (this.config.embedding.cacheEnabled) {
      this.embeddingCache.set(text, embedding);
      
      // Limit cache size
      if (this.embeddingCache.size > this.config.embedding.cacheSize) {
        const firstKey = this.embeddingCache.keys().next().value;
        if (firstKey) {
          this.embeddingCache.delete(firstKey);
        }
      }
    }
    
    return embedding;
  }

  /**
   * Generate embeddings in batch
   */
  private async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingVector[]> {
    // In a real implementation, this would batch call the embedding API
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  /**
   * Generate placeholder embedding (for development)
   */
  private generatePlaceholderEmbedding(text: string): EmbeddingVector {
    const dimension = this.config.embedding.dimension;
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

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
    if (a.length !== b.length) return 0;
    
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
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate importance score for a memory
   */
  private calculateImportance(
    content: string,
    metadata: Partial<MemoryMetadata>
  ): number {
    let importance = MemoryImportance.MEDIUM;
    
    // Boost for certain content types
    if (metadata.toolName) {
      importance += 0.1;
    }
    
    // Boost for verified information
    if (metadata.verified) {
      importance += 0.15;
    }
    
    // Boost for high confidence
    if (metadata.confidence && metadata.confidence > 0.8) {
      importance += 0.1;
    }
    
    // Boost for longer content (potentially more important)
    if (content.length > 500) {
      importance += 0.05;
    }
    
    return Math.min(1.0, importance);
  }

  /**
   * Calculate retention score for a memory
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
    
    // Apply decay
    const decayedImportance = entry.importance * Math.exp(-entry.decayRate * age / (1000 * 60 * 60));
    
    // Weighted combination
    return (
      decayedImportance * 0.4 +
      accessFactor * 0.3 +
      recencyFactor * 0.2 +
      ageFactor * 0.1
    );
  }

  /**
   * Apply filters to memories
   */
  private applyFilters(
    memories: MemoryEntry[],
    filter?: MemoryFilter
  ): MemoryEntry[] {
    if (!filter) return memories;
    
    return memories.filter(entry => {
      // Content type filter
      if (filter.contentTypes && filter.contentTypes.length > 0) {
        if (!filter.contentTypes.includes(entry.contentType)) {
          return false;
        }
      }
      
      // Source filter
      if (filter.sources && filter.sources.length > 0) {
        if (!filter.sources.includes(entry.metadata.source)) {
          return false;
        }
      }
      
      // Time range filter
      if (filter.timeRange) {
        if (entry.createdAt < filter.timeRange.start ||
            entry.createdAt > filter.timeRange.end) {
          return false;
        }
      }
      
      // Tag filter
      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tagMatch === 'all'
          ? filter.tags.every(tag => entry.tags.includes(tag))
          : filter.tags.some(tag => entry.tags.includes(tag));
        if (!hasTag) {
          return false;
        }
      }
      
      // Importance filter
      if (filter.importanceRange) {
        if (entry.importance < filter.importanceRange.min ||
            entry.importance > filter.importanceRange.max) {
          return false;
        }
      }
      
      // Timeline filter
      if (filter.timelineIds && filter.timelineIds.length > 0) {
        if (!filter.timelineIds.includes(entry.timeline.timelineId)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Update indexes for a memory entry
   */
  private updateIndexes(entry: MemoryEntry): void {
    // Tag index
    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entry.id);
    }
    
    // Type index
    if (!this.typeIndex.has(entry.contentType)) {
      this.typeIndex.set(entry.contentType, new Set());
    }
    this.typeIndex.get(entry.contentType)!.add(entry.id);
    
    // Source index
    if (!this.sourceIndex.has(entry.metadata.source)) {
      this.sourceIndex.set(entry.metadata.source, new Set());
    }
    this.sourceIndex.get(entry.metadata.source)!.add(entry.id);
    
    // Timeline index
    if (!this.timelineIndex.has(entry.timeline.timelineId)) {
      this.timelineIndex.set(entry.timeline.timelineId, new Set());
    }
    this.timelineIndex.get(entry.timeline.timelineId)!.add(entry.id);
  }

  /**
   * Remove entry from indexes
   */
  private removeFromIndexes(entry: MemoryEntry): void {
    // Tag index
    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(entry.id);
    }
    
    // Type index
    this.typeIndex.get(entry.contentType)?.delete(entry.id);
    
    // Source index
    this.sourceIndex.get(entry.metadata.source)?.delete(entry.id);
    
    // Timeline index
    this.timelineIndex.get(entry.timeline.timelineId)?.delete(entry.id);
  }

  /**
   * Initialize ChromaDB connection
   */
  private async initializeChromaDB(): Promise<void> {
    // Placeholder - actual implementation would initialize ChromaDB client
    // In production, this would:
    // 1. Connect to ChromaDB server
    // 2. Create or get collection
    // 3. Set up embedding function
  }

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    // Consolidation timer
    if (this.config.retention.consolidationEnabled) {
      this.consolidationTimer = setInterval(
        () => this.consolidate(),
        this.config.retention.consolidationInterval
      );
    }
    
    // Pruning timer
    if (this.config.retention.pruningEnabled) {
      this.pruningTimer = setInterval(
        () => this.prune(),
        this.config.retention.pruningInterval
      );
    }
    
    // Auto-save timer
    if (this.config.storage.persistenceEnabled) {
      this.saveTimer = setInterval(
        () => this.persist(),
        this.config.storage.autoSaveInterval
      );
    }
  }

  /**
   * Prune low-value memories
   */
  private async prune(): Promise<void> {
    const result = await this.consolidate();
    this.emit(MemoryEventType.PRUNED, result);
  }

  /**
   * Persist memory state
   */
  private async persist(): Promise<void> {
    // Placeholder - actual implementation would save to disk/database
  }

  /**
   * Get query cache key
   */
  private getQueryCacheKey(query: MemoryQuery): string {
    return JSON.stringify({
      query: query.query,
      topK: query.topK,
      minSimilarity: query.minSimilarity,
      filter: query.filter,
    });
  }

  /**
   * Generate unique memory ID
   */
  private generateMemoryId(): MemoryId {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique timeline ID
   */
  private generateTimelineId(): TimelineId {
    return `tl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): MemoryStatistics {
    return {
      totalMemories: 0,
      shortTermMemories: 0,
      longTermMemories: 0,
      averageImportance: 0,
      averageAccessCount: 0,
      memoriesByType: {} as Record<MemoryContentType, number>,
      memoriesBySource: {} as Record<MemorySource, number>,
      oldestMemory: 0,
      newestMemory: 0,
      totalEmbeddings: 0,
      embeddingDimension: this.config.embedding.dimension,
      timelineStats: {
        totalEpochs: 0,
        totalEvents: 0,
      },
      storageStats: {
        usedBytes: 0,
        indexSize: 0,
        cacheHitRate: 0,
      },
    };
  }

  // =========================================================================
  // Public API - Statistics
  // =========================================================================

  /**
   * Get memory statistics
   */
  public getStatistics(): MemoryStatistics {
    const allMemories = [
      ...Array.from(this.shortTermMemory.values()),
      ...Array.from(this.longTermMemory.values()),
    ];
    
    const memoriesByType: Record<MemoryContentType, number> = {} as any;
    const memoriesBySource: Record<MemorySource, number> = {} as any;
    
    let totalImportance = 0;
    let totalAccessCount = 0;
    let oldestMemory = Date.now();
    let newestMemory = 0;
    let totalEmbeddings = 0;
    
    for (const entry of allMemories) {
      // Count by type
      memoriesByType[entry.contentType] = (memoriesByType[entry.contentType] || 0) + 1;
      
      // Count by source
      memoriesBySource[entry.metadata.source] = (memoriesBySource[entry.metadata.source] || 0) + 1;
      
      // Sum for averages
      totalImportance += entry.importance;
      totalAccessCount += entry.accessCount;
      
      // Track time range
      if (entry.createdAt < oldestMemory) oldestMemory = entry.createdAt;
      if (entry.createdAt > newestMemory) newestMemory = entry.createdAt;
      
      // Count embeddings
      if (entry.embedding) totalEmbeddings++;
    }
    
    return {
      totalMemories: allMemories.length,
      shortTermMemories: this.shortTermMemory.size,
      longTermMemories: this.longTermMemory.size,
      averageImportance: allMemories.length > 0 ? totalImportance / allMemories.length : 0,
      averageAccessCount: allMemories.length > 0 ? totalAccessCount / allMemories.length : 0,
      memoriesByType,
      memoriesBySource,
      oldestMemory: allMemories.length > 0 ? oldestMemory : 0,
      newestMemory,
      totalEmbeddings,
      embeddingDimension: this.config.embedding.dimension,
      timelineStats: {
        totalEpochs: this.epochs.size,
        totalEvents: this.events.length,
        currentEpoch: this.currentEpoch || undefined,
      },
      storageStats: {
        usedBytes: 0, // Would calculate actual size in production
        indexSize: this.tagIndex.size + this.typeIndex.size + this.sourceIndex.size,
        cacheHitRate: 0, // Would track actual cache hits in production
      },
    };
  }

  /**
   * Clear all memories
   */
  public async clear(): Promise<void> {
    this.shortTermMemory.clear();
    this.longTermMemory.clear();
    this.tagIndex.clear();
    this.typeIndex.clear();
    this.sourceIndex.clear();
    this.timelineIndex.clear();
    this.embeddingCache.clear();
    this.queryCache.clear();
    this.events = [];
    this.epochs.clear();
    this.sequenceCounter = 0;
    
    this.stats = this.initializeStats();
  }
}
