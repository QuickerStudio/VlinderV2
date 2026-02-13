/**
 * @fileoverview ThinkingEngine Tests
 * 
 * @version 2.0.0
 */

import { ThinkingEngine } from '../ThinkingEngine/thinking-engine';
import {
  ReasoningPattern,
  ThinkingStepType,
  ThinkingChainStatus,
} from '../ThinkingEngine/types';

describe('ThinkingEngine', () => {
  let engine: ThinkingEngine;

  beforeEach(async () => {
    engine = new ThinkingEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Chain Management', () => {
    it('should create a thinking chain', async () => {
      const chain = await engine.createChain(
        'test-task',
        { input: 'test input' }
      );

      expect(chain).toBeDefined();
      expect(chain.taskId).toBe('test-task');
      expect(chain.status).toBe('initialized');
    });

    it('should get chain by ID', async () => {
      const created = await engine.createChain('test-task', { input: 'test' });
      const retrieved = await engine.getChain(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Step Management', () => {
    let chainId: string;

    beforeEach(async () => {
      const chain = await engine.createChain('test-task', { input: 'test' });
      chainId = chain.id;
    });

    it('should add observation step', async () => {
      const step = await engine.addStep(chainId, {
        type: ThinkingStepType.OBSERVATION,
        content: 'Observing test input',
        confidence: 1.0,
      });

      expect(step).toBeDefined();
      expect(step.type).toBe(ThinkingStepType.OBSERVATION);
      expect(step.content).toBe('Observing test input');
    });

    it('should add analysis step', async () => {
      const step = await engine.addStep(chainId, {
        type: ThinkingStepType.ANALYSIS,
        content: 'Analyzing the input',
        confidence: 0.8,
      });

      expect(step).toBeDefined();
      expect(step.type).toBe(ThinkingStepType.ANALYSIS);
    });

    it('should track step dependencies', async () => {
      const step1 = await engine.addStep(chainId, {
        type: ThinkingStepType.OBSERVATION,
        content: 'First step',
      });

      const step2 = await engine.addStep(chainId, {
        type: ThinkingStepType.ANALYSIS,
        content: 'Second step',
        dependencies: [step1.id],
      });

      expect(step2.dependencies).toContain(step1.id);
    });
  });

  describe('Reasoning Patterns', () => {
    it('should execute deductive reasoning', async () => {
      const chain = await engine.createChain('deductive-test', {
        input: 'All humans are mortal. Socrates is human.',
      });
      
      chain.pattern = ReasoningPattern.DEDDUCTIVE;
      
      const executed = await engine.executeChain(chain.id, {
        input: 'All humans are mortal. Socrates is human.',
      });

      expect(executed.steps.length).toBeGreaterThan(0);
    });

    it('should execute inductive reasoning', async () => {
      const chain = await engine.createChain('inductive-test', {
        input: 'Pattern observation data',
      });
      
      chain.pattern = ReasoningPattern.INDUCTIVE;
      
      const executed = await engine.executeChain(chain.id, {
        input: 'Pattern observation data',
      });

      expect(executed.steps.length).toBeGreaterThan(0);
    });
  });

  describe('Reflection', () => {
    it('should perform reflection on chain', async () => {
      const chain = await engine.createChain('reflection-test', {
        input: 'Test input',
      });

      await engine.addStep(chain.id, {
        type: ThinkingStepType.OBSERVATION,
        content: 'Observation',
      });

      await engine.addStep(chain.id, {
        type: ThinkingStepType.ANALYSIS,
        content: 'Analysis',
      });

      const reflection = await engine.performReflection(chain);

      expect(reflection).toBeDefined();
      expect(reflection.chainId).toBe(chain.id);
      expect(reflection.strengths).toBeDefined();
      expect(reflection.weaknesses).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should return thinking statistics', async () => {
      const chain = await engine.createChain('stats-test', { input: 'test' });
      await engine.addStep(chain.id, {
        type: ThinkingStepType.OBSERVATION,
        content: 'Test',
      });

      const stats = engine.getStatistics();

      expect(stats.totalChains).toBeGreaterThan(0);
      expect(stats.totalSteps).toBeGreaterThan(0);
    });
  });
});
