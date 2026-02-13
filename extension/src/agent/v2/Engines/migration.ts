/**
 * @fileoverview V1 to V2 Migration Tool
 * 
 * 将V1工具和功能迁移到V2架构的工具
 * 
 * @version 2.0.0
 */

import { z } from 'zod';
import { ToolDefinition, ToolCategory, ToolRiskLevel, ToolPermission } from '../ToolsEngine/types';
import { BeeConfig, BeeCapability, BeePriority } from '../../core/types';

/**
 * V1工具配置映射
 */
interface V1ToolMapping {
  v1Name: string;
  v2ToolId: string;
  category: ToolCategory;
  riskLevel: ToolRiskLevel;
  permissions: ToolPermission[];
  capabilities: BeeCapability[];
}

/**
 * V1到V2工具映射表
 */
const V1_TOOL_MAPPINGS: V1ToolMapping[] = [
  // 文件操作工具
  {
    v1Name: 'read_file',
    v2ToolId: 'v2.read_file',
    category: ToolCategory.FILE_SYSTEM,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [ToolPermission.READ, ToolPermission.FILE_READ],
    capabilities: [BeeCapability.FILE_OPERATIONS],
  },
  {
    v1Name: 'list_files',
    v2ToolId: 'v2.list_files',
    category: ToolCategory.FILE_SYSTEM,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [ToolPermission.READ, ToolPermission.FILE_READ],
    capabilities: [BeeCapability.FILE_OPERATIONS],
  },
  {
    v1Name: 'search_files',
    v2ToolId: 'v2.search_files',
    category: ToolCategory.SEARCH,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [ToolPermission.READ, ToolPermission.FILE_READ],
    capabilities: [BeeCapability.FILE_OPERATIONS, BeeCapability.ANALYSIS],
  },
  {
    v1Name: 'file_editor',
    v2ToolId: 'v2.file_editor',
    category: ToolCategory.CODE_EDITING,
    riskLevel: ToolRiskLevel.MEDIUM,
    permissions: [ToolPermission.READ, ToolPermission.WRITE, ToolPermission.FILE_READ, ToolPermission.FILE_WRITE],
    capabilities: [BeeCapability.CODE_EDITING, BeeCapability.FILE_OPERATIONS],
  },
  {
    v1Name: 'fast_editor',
    v2ToolId: 'v2.fast_editor',
    category: ToolCategory.CODE_EDITING,
    riskLevel: ToolRiskLevel.MEDIUM,
    permissions: [ToolPermission.READ, ToolPermission.WRITE, ToolPermission.FILE_READ, ToolPermission.FILE_WRITE],
    capabilities: [BeeCapability.CODE_EDITING],
  },
  
  // 终端工具
  {
    v1Name: 'execute_command',
    v2ToolId: 'v2.execute_command',
    category: ToolCategory.TERMINAL,
    riskLevel: ToolRiskLevel.HIGH,
    permissions: [ToolPermission.EXECUTE, ToolPermission.TERMINAL_EXECUTE],
    capabilities: [BeeCapability.TERMINAL],
  },
  {
    v1Name: 'terminal',
    v2ToolId: 'v2.terminal',
    category: ToolCategory.TERMINAL,
    riskLevel: ToolRiskLevel.HIGH,
    permissions: [ToolPermission.EXECUTE, ToolPermission.TERMINAL_EXECUTE],
    capabilities: [BeeCapability.TERMINAL],
  },
  {
    v1Name: 'git_bash',
    v2ToolId: 'v2.git_bash',
    category: ToolCategory.TERMINAL,
    riskLevel: ToolRiskLevel.MEDIUM,
    permissions: [ToolPermission.EXECUTE, ToolPermission.TERMINAL_EXECUTE],
    capabilities: [BeeCapability.TERMINAL],
  },
  
  // 搜索工具
  {
    v1Name: 'grep_search',
    v2ToolId: 'v2.grep_search',
    category: ToolCategory.SEARCH,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [ToolPermission.READ],
    capabilities: [BeeCapability.ANALYSIS, BeeCapability.FILE_OPERATIONS],
  },
  {
    v1Name: 'search_symbol',
    v2ToolId: 'v2.search_symbol',
    category: ToolCategory.SEARCH,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [ToolPermission.READ],
    capabilities: [BeeCapability.ANALYSIS],
  },
  {
    v1Name: 'pattern_search',
    v2ToolId: 'v2.pattern_search',
    category: ToolCategory.SEARCH,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [ToolPermission.READ],
    capabilities: [BeeCapability.ANALYSIS],
  },
  
  // 网络工具
  {
    v1Name: 'fetch_webpage',
    v2ToolId: 'v2.fetch_webpage',
    category: ToolCategory.WEB,
    riskLevel: ToolRiskLevel.LOW,
    permissions: [ToolPermission.NETWORK, ToolPermission.WEB_ACCESS],
    capabilities: [BeeCapability.WEB_SEARCH],
  },
  {
    v1Name: 'url_screenshot',
    v2ToolId: 'v2.url_screenshot',
    category: ToolCategory.WEB,
    riskLevel: ToolRiskLevel.LOW,
    permissions: [ToolPermission.NETWORK, ToolPermission.WEB_ACCESS],
    capabilities: [BeeCapability.WEB_SEARCH],
  },
  
  // Agent工具
  {
    v1Name: 'spawn_agent',
    v2ToolId: 'v2.spawn_agent',
    category: ToolCategory.AGENT,
    riskLevel: ToolRiskLevel.HIGH,
    permissions: [ToolPermission.ADMIN, ToolPermission.AGENT_SPAWN],
    capabilities: [BeeCapability.CODE_EDITING, BeeCapability.ANALYSIS],
  },
  {
    v1Name: 'exit_agent',
    v2ToolId: 'v2.exit_agent',
    category: ToolCategory.AGENT,
    riskLevel: ToolRiskLevel.LOW,
    permissions: [],
    capabilities: [],
  },
  
  // 其他工具
  {
    v1Name: 'think',
    v2ToolId: 'v2.think',
    category: ToolCategory.ANALYSIS,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [],
    capabilities: [BeeCapability.ANALYSIS],
  },
  {
    v1Name: 'ask_followup_question',
    v2ToolId: 'v2.ask_followup_question',
    category: ToolCategory.COMMUNICATION,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [],
    capabilities: [],
  },
  {
    v1Name: 'attempt_completion',
    v2ToolId: 'v2.attempt_completion',
    category: ToolCategory.SYSTEM,
    riskLevel: ToolRiskLevel.SAFE,
    permissions: [],
    capabilities: [],
  },
];

/**
 * V1ToV2Migrator - V1到V2迁移工具
 */
export class V1ToV2Migrator {
  /**
   * 获取V1工具映射
   */
  public getV1ToolMappings(): V1ToolMapping[] {
    return V1_TOOL_MAPPINGS;
  }

  /**
   * 将V1工具名转换为V2工具定义
   */
  public mapV1ToolToV2(
    v1ToolName: string,
    v1Schema: z.ZodType<unknown>,
    handler: (input: Record<string, unknown>, context: unknown) => Promise<unknown>
  ): ToolDefinition | null {
    const mapping = V1_TOOL_MAPPINGS.find(m => m.v1Name === v1ToolName);
    
    if (!mapping) {
      console.warn(`No mapping found for V1 tool: ${v1ToolName}`);
      return null;
    }

    return {
      id: mapping.v2ToolId,
      name: v1ToolName,
      description: `Migrated from V1: ${v1ToolName}`,
      category: mapping.category,
      inputSchema: v1Schema,
      permissions: mapping.permissions,
      riskLevel: mapping.riskLevel,
      timeout: 30000,
      version: '2.0.0',
      handler: async (input, context) => {
        const result = await handler(input, context);
        return {
          success: true,
          output: result,
        };
      },
    };
  }

  /**
   * 批量迁移V1工具
   */
  public migrateV1Tools(
    v1Tools: Array<{
      name: string;
      schema: z.ZodType<unknown>;
      handler: (input: Record<string, unknown>, context: unknown) => Promise<unknown>;
    }>
  ): ToolDefinition[] {
    const v2Tools: ToolDefinition[] = [];

    for (const v1Tool of v1Tools) {
      const v2Tool = this.mapV1ToolToV2(v1Tool.name, v1Tool.schema, v1Tool.handler);
      if (v2Tool) {
        v2Tools.push(v2Tool);
      }
    }

    return v2Tools;
  }

  /**
   * 根据V1工具能力创建Bee配置
   */
  public createBeeFromV1Tools(
    beeId: string,
    beeName: string,
    v1ToolNames: string[],
    instructions: string
  ): BeeConfig {
    // 收集所有能力
    const capabilities = new Set<BeeCapability>();
    const tools: ToolDefinition[] = [];

    for (const toolName of v1ToolNames) {
      const mapping = V1_TOOL_MAPPINGS.find(m => m.v1Name === toolName);
      if (mapping) {
        mapping.capabilities.forEach(cap => capabilities.add(cap));
      }
    }

    return {
      id: beeId,
      name: beeName,
      instructions,
      tools,
      capabilities: Array.from(capabilities),
      handoffs: [],
      priority: BeePriority.MEDIUM,
      maxConcurrentTasks: 3,
    };
  }

  /**
   * 生成迁移报告
   */
  public generateMigrationReport(v1ToolNames: string[]): {
    total: number;
    mapped: number;
    unmapped: string[];
    byCategory: Record<ToolCategory, number>;
    byRiskLevel: Record<ToolRiskLevel, number>;
  } {
    const mapped: string[] = [];
    const unmapped: string[] = [];
    const byCategory: Record<ToolCategory, number> = {} as any;
    const byRiskLevel: Record<ToolRiskLevel, number> = {} as any;

    for (const toolName of v1ToolNames) {
      const mapping = V1_TOOL_MAPPINGS.find(m => m.v1Name === toolName);
      
      if (mapping) {
        mapped.push(toolName);
        byCategory[mapping.category] = (byCategory[mapping.category] || 0) + 1;
        byRiskLevel[mapping.riskLevel] = (byRiskLevel[mapping.riskLevel] || 0) + 1;
      } else {
        unmapped.push(toolName);
      }
    }

    return {
      total: v1ToolNames.length,
      mapped: mapped.length,
      unmapped,
      byCategory,
      byRiskLevel,
    };
  }
}

/**
 * 创建默认Bee配置集
 */
export function createDefaultBees(): BeeConfig[] {
  return [
    {
      id: 'bee_code_editor',
      name: 'Code Editor',
      instructions: 'You are a code editing specialist. Your job is to modify code according to user requirements while maintaining code quality and following best practices.',
      tools: [],
      capabilities: [BeeCapability.CODE_EDITING, BeeCapability.FILE_OPERATIONS, BeeCapability.REFACTORING],
      handoffs: [
        {
          targetBee: 'bee_tester',
          condition: 'context.needsTesting',
          transferContext: true,
        },
      ],
      priority: BeePriority.HIGH,
      maxConcurrentTasks: 3,
    },
    {
      id: 'bee_terminal',
      name: 'Terminal',
      instructions: 'You are a terminal specialist. Your job is to execute commands safely and report results accurately.',
      tools: [],
      capabilities: [BeeCapability.TERMINAL, BeeCapability.DEPLOYMENT],
      handoffs: [],
      priority: BeePriority.MEDIUM,
      maxConcurrentTasks: 2,
    },
    {
      id: 'bee_tester',
      name: 'Tester',
      instructions: 'You are a testing specialist. Your job is to write and run tests, analyze results, and report issues.',
      tools: [],
      capabilities: [BeeCapability.TESTING, BeeCapability.DEBUGGING, BeeCapability.ANALYSIS],
      handoffs: [
        {
          targetBee: 'bee_code_editor',
          condition: 'context.hasBugs',
          transferContext: true,
        },
      ],
      priority: BeePriority.MEDIUM,
      maxConcurrentTasks: 2,
    },
    {
      id: 'bee_analyst',
      name: 'Analyst',
      instructions: 'You are an analysis specialist. Your job is to analyze code, identify issues, and provide recommendations.',
      tools: [],
      capabilities: [BeeCapability.ANALYSIS, BeeCapability.DEBUGGING, BeeCapability.REFACTORING],
      handoffs: [],
      priority: BeePriority.HIGH,
      maxConcurrentTasks: 2,
    },
    {
      id: 'bee_documenter',
      name: 'Documenter',
      instructions: 'You are a documentation specialist. Your job is to create and maintain clear, comprehensive documentation.',
      tools: [],
      capabilities: [BeeCapability.DOCUMENTATION, BeeCapability.ANALYSIS],
      handoffs: [],
      priority: BeePriority.LOW,
      maxConcurrentTasks: 2,
    },
  ];
}

// 导出单例
export const v1ToV2Migrator = new V1ToV2Migrator();
