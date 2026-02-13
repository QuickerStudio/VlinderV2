/**
 * @fileoverview MemoryEngine Tests
 * 
 * @version 2.0.0
 */

import { MemoryEngine } from '@/agent/v2/Engines/MemoryEngine/memory-engine';
import {
  MemoryType,
  MemorySource,
  MemoryState,
  MemoryImportance,
  TimelineEventType,
} from '@/agent/v2/Engines/MemoryEngine/types';

describe('MemoryEngine', () => {
  let engine: MemoryEngine;

  beforeEach(async () => {
    engine = new MemoryEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Memory Storage', () => {
    it('should store a memory', async () => {
      const content = 'Test memory content';
      const metadata = {
        source: MemorySource.USER,
        sessionId: 'test-session',
      };

      const entry = await engine.store(content, metadata);

      expect(entry).toBeDefined();
      expect(entry.content).toBe(content);
      expect(entry.metadata.source).toBe(MemorySource.USER);
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
    });

    it('should store memory with tags', async () => {
      const content = 'Tagged memory';
      const tags = ['test', 'important'];

      const entry = await engine.store(content, {}, { tags });

      expect(entry.tags).toEqual(tags);
    });

    it('should store batch memories', async () => {
      const items = [
        { content: 'Memory 1', metadata: { source: MemorySource.USER } },
        { content: 'Memory 2', metadata: { source: MemorySource.AGENT } },
        { content: 'Memory 3', metadata: { source: MemorySource.SYSTEM } },
      ];

      const entries = await engine.storeBatch(items);

      expect(entries).toHaveLength(3);
      expect(entries[0].content).toBe('Memory 1');
      expect(entries[1].content).toBe('Memory 2');
      expect(entries[2].content).toBe('Memory 3');
    });
  });

  describe('Memory Retrieval', () => {
    beforeEach(async () => {
      // Store test memories
      await engine.store('Important fact about TypeScript', {
        source: MemorySource.USER,
        tags: ['typescript', 'programming'],
      });
      await engine.store('Python is a programming language', {
        source: MemorySource.AGENT,
        tags: ['python', 'programming'],
      });
      await engine.store('Meeting notes from yesterday', {
        source: MemorySource.USER,
        tags: ['meeting', 'notes'],
      });
    });

    it('should retrieve memory by ID', async () => {
      const stored = await engine.store('Test retrieval', {
        source: MemorySource.USER,
      });
      
      const retrieved = await engine.get(stored.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Test retrieval');
    });

    it('should search memories by text', async () => {
      const result = await engine.search('programming');

      expect(result.memories.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should get memories by tags', async () => {
      const memories = await engine.getByTags(['programming']);

      expect(memories.length).toBeGreaterThan(0);
    });

    it('should get memories by time range', async () => {
      const now = Date.now();
      const memories = await engine.getByTimeRange(now - 60000, now + 60000);

      expect(memories.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Query', () => {
    beforeEach(async () => {
      await engine.store('TypeScript type system', {
        source: MemorySource.USER,
      }, { tags: ['typescript'] });
      await engine.store('Python decorators', {
        source: MemorySource.AGENT,
      }, { tags: ['python'] });
    });

    it('should query with filters', async () => {
      const result = await engine.query({
        query: 'programming',
        topK: 10,
        filters: {
          sources: [MemorySource.USER],
        },
      });

      expect(result.memories.length).toBeGreaterThan(0);
      result.memories.forEach(m => {
        expect(m.metadata.source).toBe(MemorySource.USER);
      });
    });

    it('should respect topK parameter', async () => {
      const result = await engine.query({
        query: 'test',
        topK: 2,
      });

      expect(result.memories.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Timeline Management', () => {
    it('should start new epoch', async () => {
      const epoch = await engine.startNewEpoch('test-epoch', 'Test epoch description');

      expect(epoch).toBeDefined();
      expect(epoch.name).toBe('test-epoch');
      expect(epoch.startTime).toBeDefined();
    });

    it('should capture timeline events', async () => {
      const event = await engine.captureEvent(
        TimelineEventType.TASK_START,
        'Started test task'
      );

      expect(event).toBeDefined();
      expect(event.type).toBe(TimelineEventType.TASK_START);
      expect(event.description).toBe('Started test task');
    });

    it('should get timeline events', async () => {
      await engine.captureEvent(TimelineEventType.TASK_START, 'Task 1');
      await engine.captureEvent(TimelineEventType.TASK_COMPLETE, 'Task 2');

      const events = await engine.getTimelineEvents();

      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Memory Statistics', () => {
    it('should return statistics', async () => {
      await engine.store('Test memory 1', { source: MemorySource.USER });
      await engine.store('Test memory 2', { source: MemorySource.AGENT });

      const stats = engine.getStatistics();

      expect(stats.totalMemories).toBeGreaterThanOrEqual(2);
      expect(stats.memoriesBySource).toBeDefined();
    });
  });

  describe('Memory Operations', () => {
    it('should update memory', async () => {
      const entry = await engine.store('Original content', {
        source: MemorySource.USER,
      });

      const updated = await engine.update(entry.id, {
        content: 'Updated content',
      });

      expect(updated?.content).toBe('Updated content');
    });

    it('should delete memory', async () => {
      const entry = await engine.store('To be deleted', {
        source: MemorySource.USER,
      });

      const deleted = await engine.delete(entry.id);

      expect(deleted).toBe(true);

      const retrieved = await engine.get(entry.id);
      expect(retrieved).toBeUndefined();
    });

    it('should clear all memories', async () => {
      await engine.store('Memory 1', { source: MemorySource.USER });
      await engine.store('Memory 2', { source: MemorySource.USER });

      await engine.clear();

      const stats = engine.getStatistics();
      expect(stats.totalMemories).toBe(0);
    });
  });
});
