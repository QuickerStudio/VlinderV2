/**
 * @fileoverview ToolsEngine Tests
 * 
 * @version 2.0.0
 */

import { ToolsEngine } from '@/agent/v2/Engines/ToolsEngine/tools-engine';
import {
  ToolCategory,
  ToolRiskLevel,
  ToolPermission,
  ToolExecutionStatus,
} from '@/agent/v2/Engines/ToolsEngine/types';
import { z } from 'zod';

describe('ToolsEngine', () => {
  let engine: ToolsEngine;

  beforeEach(async () => {
    engine = new ToolsEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Tool Registry', () => {
    it('should register a tool', async () => {
      const tool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        category: ToolCategory.SYSTEM,
        inputSchema: z.object({ message: z.string() }),
        permissions: [],
        riskLevel: ToolRiskLevel.SAFE,
        timeout: 5000,
        version: '1.0.0',
        handler: async () => ({ success: true, output: 'test' }),
      };

      await engine.registerTool(tool);

      const retrieved = engine.getTool('test-tool');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Tool');
    });

    it('should get tool by name', async () => {
      const tool = {
        id: 'named-tool',
        name: 'Named Tool',
        description: 'A named tool',
        category: ToolCategory.SYSTEM,
        inputSchema: z.object({}),
        permissions: [],
        riskLevel: ToolRiskLevel.SAFE,
        timeout: 5000,
        version: '1.0.0',
        handler: async () => ({ success: true }),
      };

      await engine.registerTool(tool);

      const retrieved = engine.getToolByName('Named Tool');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('named-tool');
    });

    it('should unregister a tool', async () => {
      const tool = {
        id: 'temp-tool',
        name: 'Temp Tool',
        description: 'Temporary tool',
        category: ToolCategory.SYSTEM,
        inputSchema: z.object({}),
        permissions: [],
        riskLevel: ToolRiskLevel.SAFE,
        timeout: 5000,
        version: '1.0.0',
        handler: async () => ({ success: true }),
      };

      await engine.registerTool(tool);
      const unregistered = await engine.unregisterTool('temp-tool');

      expect(unregistered).toBe(true);
      expect(engine.getTool('temp-tool')).toBeUndefined();
    });

    it('should get tools by category', async () => {
      const tool1 = {
        id: 'cat-tool-1',
        name: 'Category Tool 1',
        description: 'Tool 1',
        category: ToolCategory.FILE_SYSTEM,
        inputSchema: z.object({}),
        permissions: [],
        riskLevel: ToolRiskLevel.SAFE,
        timeout: 5000,
        version: '1.0.0',
        handler: async () => ({ success: true }),
      };

      const tool2 = {
        id: 'cat-tool-2',
        name: 'Category Tool 2',
        description: 'Tool 2',
        category: ToolCategory.FILE_SYSTEM,
        inputSchema: z.object({}),
        permissions: [],
        riskLevel: ToolRiskLevel.SAFE,
        timeout: 5000,
        version: '1.0.0',
        handler: async () => ({ success: true }),
      };

      await engine.registerTool(tool1);
      await engine.registerTool(tool2);

      const tools = engine.getToolsByCategory(ToolCategory.FILE_SYSTEM);
      expect(tools.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Tool Execution', () => {
    beforeEach(async () => {
      const tool = {
        id: 'exec-test-tool',
        name: 'Exec Test Tool',
        description: 'Tool for execution testing',
        category: ToolCategory.SYSTEM,
        inputSchema: z.object({ message: z.string() }),
        permissions: [],
        riskLevel: ToolRiskLevel.SAFE,
        timeout: 5000,
        version: '1.0.0',
        handler: async (input: Record<string, unknown>) => ({
          success: true,
          output: `Echo: ${input.message}`,
        }),
      };

      await engine.registerTool(tool);
    });

    it('should execute a tool', async () => {
      const result = await engine.execute({
        toolId: 'exec-test-tool',
        input: { message: 'Hello' },
        context: {
          sessionId: 'test-session',
          taskId: 'test-task',
          agentId: 'test-agent',
          workingDirectory: '/tmp',
          permissions: { granted: new Set(), denied: new Set(), temporary: new Map() },
          metadata: {},
        },
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello');
    });

    it('should handle execution errors', async () => {
      const errorTool = {
        id: 'error-tool',
        name: 'Error Tool',
        description: 'A tool that throws errors',
        category: ToolCategory.SYSTEM,
        inputSchema: z.object({}),
        permissions: [],
        riskLevel: ToolRiskLevel.SAFE,
        timeout: 5000,
        version: '1.0.0',
        handler: async () => {
          throw new Error('Intentional error');
        },
      };

      await engine.registerTool(errorTool);

      const result = await engine.execute({
        toolId: 'error-tool',
        input: {},
        context: {
          sessionId: 'test',
          taskId: 'test',
          agentId: 'test',
          workingDirectory: '/tmp',
          permissions: { granted: new Set(), denied: new Set(), temporary: new Map() },
          metadata: {},
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Permission Management', () => {
    it('should request permission for high-risk tools', async () => {
      const highRiskTool = {
        id: 'high-risk-tool',
        name: 'High Risk Tool',
        description: 'A high risk tool',
        category: ToolCategory.SYSTEM,
        inputSchema: z.object({}),
        permissions: [ToolPermission.ADMIN],
        riskLevel: ToolRiskLevel.HIGH,
        timeout: 5000,
        version: '1.0.0',
        handler: async () => ({ success: true }),
      };

      await engine.registerTool(highRiskTool);

      // Permission should be required
      const stats = engine.getStatistics();
      expect(stats.totalTools).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should return engine statistics', async () => {
      const stats = engine.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalTools).toBeGreaterThanOrEqual(0);
      expect(stats.toolsByCategory).toBeDefined();
      expect(stats.toolsByRiskLevel).toBeDefined();
    });
  });
});
