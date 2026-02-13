/**
 * @fileoverview ThinkingEngine Tests
 * 
 * @version 2.0.0
 */

import { ThinkingEngine } from '@/agent/v2/Engines/ThinkingEngine/thinking-engine';
import {
  ReasoningPattern,
  ThinkingStepType,
  ThinkingStepStatus,
  ThinkingChainStatus,
} from '@/agent/v2/Engines/ThinkingEngine/types';

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
      const chain = await engine.createChain({
        topic: 'Test reasoning',
        pattern: ReasoningPattern.DEDDUCTIVE,
      });

      expect(chain).toBeDefined();
      expect(chain.topic).toBe('Test reasoning');
      expect(chain.pattern).toBe(ReasoningPattern.DEDDUCTIVE);
      expect(chain.status).toBe(ThinkingChainStatus.IDLE);
    });

    it('should get chain by ID', async () => {
      const created = await engine.createChain({
        topic: 'Test',
        pattern: ReasoningPattern.INDUCTIVE,
      });

      const retrieved = engine.getChain(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should list all chains', async () => {
      await engine.createChain({ topic: 'Chain 1', pattern: ReasoningPattern.DEDDUCTIVE });
      await engine.createChain({ topic: 'Chain 2', pattern: ReasoningPattern.INDUCTIVE });

      const chains = engine.getAllChains();

      expect(chains.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Step Management', () => {
    let chainId: string;

    beforeEach(async () => {
      const chain = await engine.createChain({
        topic: 'Step test',
        pattern: ReasoningPattern.DEDDUCTIVE,
      });
      chainId = chain.id;
    });

    it('should add a step to chain', async () => {
      const step = await engine.addStep(chainId, {
        type: ThinkingStepType.OBSERVATION,
        content: 'Test observation',
      });

      expect(step).toBeDefined();
      expect(step.type).toBe(ThinkingStepType.OBSERVATION);
      expect(step.content).toBe('Test observation');
      expect(step.status).toBe(ThinkingStepStatus.PENDING);
    });

    it('should get steps by chain', async () => {
      await engine.addStep(chainId, { type: ThinkingStepType.OBSERVATION, content: 'Obs 1' });
      await engine.addStep(chainId, { type: ThinkingStepType.HYPOTHESIS, content: 'Hyp 1' });

      const steps = engine.getSteps(chainId);

      expect(steps.length).toBe(2);
    });

    it('should update step status', async () => {
      const step = await engine.addStep(chainId, {
        type: ThinkingStepType.OBSERVATION,
        content: 'Test',
      });

      await engine.updateStepStatus(step.id, ThinkingStepStatus.COMPLETED);

      const updated = engine.getStep(step.id);
      expect(updated?.status).toBe(ThinkingStepStatus.COMPLETED);
    });
  });

  describe('Reasoning Patterns', () => {
    it('should support deductive reasoning', async () => {
      const chain = await engine.createChain({
        topic: 'Deductive test',
        pattern: ReasoningPattern.DEDDUCTIVE,
      });

      expect(chain.pattern).toBe(ReasoningPattern.DEDDUCTIVE);
    });

    it('should support inductive reasoning', async () => {
      const chain = await engine.createChain({
        topic: 'Inductive test',
        pattern: ReasoningPattern.INDUCTIVE,
      });

      expect(chain.pattern).toBe(ReasoningPattern.INDUCTIVE);
    });

    it('should support abductive reasoning', async () => {
      const chain = await engine.createChain({
        topic: 'Abductive test',
        pattern: ReasoningPattern.ABDUCTIVE,
      });

      expect(chain.pattern).toBe(ReasoningPattern.ABDUCTIVE);
    });
  });

  describe('Chain Execution', () => {
    let chainId: string;

    beforeEach(async () => {
      const chain = await engine.createChain({
        topic: 'Execution test',
        pattern: ReasoningPattern.DEDDUCTIVE,
      });
      chainId = chain.id;
    });

    it('should start chain execution', async () => {
      await engine.startChain(chainId);

      const chain = engine.getChain(chainId);
      expect(chain?.status).toBe(ThinkingChainStatus.RUNNING);
    });

    it('should complete chain', async () => {
      await engine.startChain(chainId);
      await engine.completeChain(chainId);

      const chain = engine.getChain(chainId);
      expect(chain?.status).toBe(ThinkingChainStatus.COMPLETED);
    });

    it('should fail chain', async () => {
      await engine.startChain(chainId);
      await engine.failChain(chainId, 'Test failure');

      const chain = engine.getChain(chainId);
      expect(chain?.status).toBe(ThinkingChainStatus.FAILED);
    });
  });

  describe('Statistics', () => {
    it('should return engine statistics', async () => {
      await engine.createChain({ topic: 'Stats test', pattern: ReasoningPattern.DEDDUCTIVE });

      const stats = engine.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalChains).toBeGreaterThanOrEqual(1);
      expect(stats.chainsByPattern).toBeDefined();
    });
  });
});
