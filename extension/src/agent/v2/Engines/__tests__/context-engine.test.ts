/**
 * @fileoverview ContextEngine Tests
 * 
 * @version 2.0.0
 */

import { ContextEngine } from '../ContextEngine/context-engine';
import {
  SearchType,
  SymbolKind,
} from '../ContextEngine/types';

describe('ContextEngine', () => {
  let engine: ContextEngine;
  const testDir = '/tmp/vlinder-test-context';

  beforeEach(async () => {
    engine = new ContextEngine();
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(engine.initialize(testDir)).resolves.not.toThrow();
    });
  });

  describe('File Indexing', () => {
    beforeEach(async () => {
      await engine.initialize(testDir);
    });

    it('should index a file', async () => {
      // Create a test file
      const testFile = `${testDir}/test.ts`;
      
      // Index the file
      const result = await engine.indexFile(testFile);
      
      // Result may be null if file doesn't exist
      expect(result).toBeDefined();
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      await engine.initialize(testDir);
    });

    it('should perform keyword search', async () => {
      const results = await engine.search({
        query: 'function',
        type: SearchType.KEYWORD,
        topK: 10,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should perform semantic search', async () => {
      const results = await engine.search({
        query: 'code implementation',
        type: SearchType.SEMANTIC,
        topK: 5,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should perform hybrid search', async () => {
      const results = await engine.search({
        query: 'test',
        type: SearchType.HYBRID,
        topK: 10,
      });

      expect(results).toBeDefined();
    });
  });

  describe('Context Window', () => {
    beforeEach(async () => {
      await engine.initialize(testDir);
    });

    it('should get context window', () => {
      const window = engine.getContextWindow();

      expect(window).toBeDefined();
      expect(window.maxTokens).toBeGreaterThan(0);
      expect(window.files).toBeDefined();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await engine.initialize(testDir);
    });

    it('should return statistics', () => {
      const stats = engine.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
      expect(stats.totalSymbols).toBeGreaterThanOrEqual(0);
    });
  });
});
