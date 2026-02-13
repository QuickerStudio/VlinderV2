/**
 * @fileoverview ContextEngine Tests
 * 
 * @version 2.0.0
 */

import { ContextEngine } from '@/agent/v2/Engines/ContextEngine/context-engine';
import {
  SearchType,
  SymbolKind,
  ContextPriorityLevel,
} from '@/agent/v2/Engines/ContextEngine/types';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

describe('ContextEngine', () => {
  let engine: ContextEngine;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = path.join(os.tmpdir(), `vlinder-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create a simple test file
    fs.writeFileSync(path.join(testDir, 'test.ts'), 'const x = 1;');
    
    engine = new ContextEngine({
      rootPath: testDir,
      maxContextSize: 100000,
      compactionThreshold: 0.8,
    });
    
    // Initialize with the test directory
    await engine.initialize(testDir);
  });

  afterEach(async () => {
    await engine.shutdown();
    
    // Clean up test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Context Management', () => {
    it('should add context item', async () => {
      const item = await engine.addContext({
        type: 'file',
        content: 'Test file content',
        path: '/test/file.ts',
        priority: ContextPriorityLevel.HIGH,
      });

      expect(item).toBeDefined();
      expect(item.type).toBe('file');
      expect(item.path).toBe('/test/file.ts');
    });

    it('should get context by ID', async () => {
      const created = await engine.addContext({
        type: 'snippet',
        content: 'const x = 1;',
        priority: ContextPriorityLevel.NORMAL,
      });

      const retrieved = engine.getContext(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should remove context', async () => {
      const item = await engine.addContext({
        type: 'note',
        content: 'Test note',
        priority: ContextPriorityLevel.LOW,
      });

      const removed = engine.removeContext(item.id);

      expect(removed).toBe(true);
      expect(engine.getContext(item.id)).toBeUndefined();
    });

    it('should clear all context', async () => {
      await engine.addContext({ type: 'file', content: 'File 1', priority: ContextPriorityLevel.NORMAL });
      await engine.addContext({ type: 'file', content: 'File 2', priority: ContextPriorityLevel.NORMAL });

      engine.clearContext();

      const allContext = engine.getAllContext();
      expect(allContext.length).toBe(0);
    });
  });

  describe('Context Search', () => {
    beforeEach(async () => {
      await engine.addContext({
        type: 'file',
        content: 'function helloWorld() { return "Hello"; }',
        path: '/src/hello.ts',
        priority: ContextPriorityLevel.HIGH,
      });
      await engine.addContext({
        type: 'file',
        content: 'function goodbye() { return "Goodbye"; }',
        path: '/src/goodbye.ts',
        priority: ContextPriorityLevel.NORMAL,
      });
    });

    it('should search context by content', async () => {
      const results = engine.search('hello');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('hello');
    });

    it('should search context by path', async () => {
      const results = engine.searchByPath('/src/');

      expect(results.length).toBe(2);
    });

    it('should get context by type', async () => {
      const files = engine.getContextByType('file');

      expect(files.length).toBe(2);
    });
  });

  describe('Context Prioritization', () => {
    it('should prioritize context items', async () => {
      await engine.addContext({
        type: 'file',
        content: 'Low priority',
        priority: ContextPriorityLevel.LOW,
      });
      await engine.addContext({
        type: 'file',
        content: 'High priority',
        priority: ContextPriorityLevel.HIGH,
      });

      const prioritized = engine.getPrioritizedContext();

      expect(prioritized[0].priority).toBeGreaterThanOrEqual(prioritized[1].priority);
    });

    it('should get top context items', async () => {
      await engine.addContext({ type: 'file', content: 'File 1', priority: ContextPriorityLevel.HIGH });
      await engine.addContext({ type: 'file', content: 'File 2', priority: ContextPriorityLevel.NORMAL });
      await engine.addContext({ type: 'file', content: 'File 3', priority: ContextPriorityLevel.LOW });

      const top = engine.getTopContext(2);

      expect(top.length).toBe(2);
    });
  });

  describe('Context Statistics', () => {
    it('should return context statistics', async () => {
      await engine.addContext({ type: 'file', content: 'Test', priority: ContextPriorityLevel.NORMAL });

      const stats = engine.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalItems).toBeGreaterThanOrEqual(1);
      expect(stats.itemsByType).toBeDefined();
    });
  });
});
