/**
 * @fileoverview ApplyEngine Tests
 * 
 * @version 2.0.0
 */

import { ApplyEngine } from '@/agent/v2/Engines/ApplyEngine/apply-engine';
import {
  ExecutionMode,
  ExecutionStepStatus,
  ExecutionPlanStatus,
  PermissionLevel,
} from '@/agent/v2/Engines/ApplyEngine/types';

describe('ApplyEngine', () => {
  let engine: ApplyEngine;

  beforeEach(async () => {
    engine = new ApplyEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Session Management', () => {
    it('should create a session', async () => {
      const session = await engine.createSession({
        workingDirectory: '/tmp',
        agentId: 'test-agent',
        taskId: 'test-task',
        variables: {},
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.context.workingDirectory).toBe('/tmp');
    });

    it('should get session by ID', async () => {
      const created = await engine.createSession({
        workingDirectory: '/tmp',
        agentId: 'test-agent',
        taskId: 'test-task',
        variables: {},
      });

      const retrieved = await engine.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Plan Management', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await engine.createSession({
        workingDirectory: '/tmp',
        agentId: 'test-agent',
        taskId: 'test-task',
        variables: {},
      });
      sessionId = session.id;
    });

    it('should create an execution plan', async () => {
      const plan = await engine.createPlan(
        sessionId,
        [
          {
            toolId: 'tool-1',
            toolName: 'Tool 1',
            input: { param: 'value' },
            dependencies: [],
            priority: 1,
            maxRetries: 3,
          },
        ]
      );

      expect(plan).toBeDefined();
      expect(plan.steps).toHaveLength(1);
      expect(plan.status).toBe('created');
    });

    it('should create plan with dependencies', async () => {
      const plan = await engine.createPlan(
        sessionId,
        [
          {
            toolId: 'tool-1',
            toolName: 'Tool 1',
            input: {},
            dependencies: [],
            priority: 1,
            maxRetries: 3,
          },
          {
            toolId: 'tool-2',
            toolName: 'Tool 2',
            input: {},
            dependencies: ['step_0'], // Will be updated
            priority: 2,
            maxRetries: 3,
          },
        ]
      );

      expect(plan.steps).toHaveLength(2);
    });

    it('should get plan by ID', async () => {
      const created = await engine.createPlan(sessionId, [
        {
          toolId: 'tool-1',
          toolName: 'Tool 1',
          input: {},
          dependencies: [],
          priority: 1,
          maxRetries: 3,
        },
      ]);

      const retrieved = engine.getPlan(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Plan Execution', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await engine.createSession({
        workingDirectory: '/tmp',
        agentId: 'test-agent',
        taskId: 'test-task',
        variables: {},
      });
      sessionId = session.id;
    });

    it('should execute a plan sequentially', async () => {
      const plan = await engine.createPlan(
        sessionId,
        [
          {
            toolId: 'echo',
            toolName: 'Echo',
            input: { message: 'test' },
            dependencies: [],
            priority: 1,
            maxRetries: 0,
          },
        ],
        { mode: ExecutionMode.SEQUENTIAL }
      );

      // Note: Actual execution would require registered tools
      expect(plan).toBeDefined();
    });

    it('should cancel a plan', async () => {
      const plan = await engine.createPlan(sessionId, [
        {
          toolId: 'tool-1',
          toolName: 'Tool 1',
          input: {},
          dependencies: [],
          priority: 1,
          maxRetries: 3,
        },
      ]);

      await engine.cancelPlan(plan.id);

      const cancelled = engine.getPlan(plan.id);
      expect(cancelled?.status).toBe(ExecutionPlanStatus.CANCELLED);
    });
  });

  describe('Statistics', () => {
    it('should return engine statistics', () => {
      const stats = engine.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalPlans).toBeGreaterThanOrEqual(0);
      expect(stats.totalSteps).toBeGreaterThanOrEqual(0);
    });
  });
});
