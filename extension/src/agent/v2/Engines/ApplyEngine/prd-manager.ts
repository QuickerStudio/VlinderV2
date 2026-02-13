/**
 * @fileoverview PRD Manager - PRD文档管理器
 * 
 * 基于https://github.com/snarktank/ralph的PRD系统设计
 * 
 * @version 2.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  PRD,
  UserStory,
  UserStoryStatus,
  PRDSchema,
} from './ralph-types';

// ============================================================================
// PRD Manager
// ============================================================================

/**
 * PRD管理器
 * 
 * 管理PRD文档的创建、读取、更新
 */
export class PRDManager {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * 创建PRD
   */
  async createPRD(input: {
    project: string;
    branchName: string;
    description: string;
    userStories: Array<{
      title: string;
      description: string;
      acceptanceCriteria: string[];
      priority: number;
    }>;
  }): Promise<PRD> {
    const now = Date.now();
    
    const prd: PRD = {
      project: input.project,
      branchName: input.branchName,
      description: input.description,
      userStories: input.userStories.map((story, index) => ({
        id: `US-${String(index + 1).padStart(3, '0')}`,
        title: story.title,
        description: story.description,
        acceptanceCriteria: [...story.acceptanceCriteria, 'Typecheck passes'],
        priority: story.priority,
        status: UserStoryStatus.PENDING,
        passes: false,
        notes: '',
      })),
      createdAt: now,
      updatedAt: now,
    };

    // 验证
    PRDSchema.parse(prd);

    return prd;
  }

  /**
   * 从Markdown创建PRD
   */
  async createFromMarkdown(markdown: string): Promise<PRD> {
    const lines = markdown.split('\n');
    
    let project = '';
    let branchName = '';
    let description = '';
    const userStories: UserStory[] = [];
    
    let currentStory: Partial<UserStory> | null = null;
    let inAcceptanceCriteria = false;
    let storyIndex = 0;

    for (const line of lines) {
      // 标题
      if (line.startsWith('# ')) {
        project = line.slice(2).trim();
        continue;
      }

      // 描述
      if (line.startsWith('## ') && !line.includes('User Stories')) {
        description = line.slice(3).trim();
        continue;
      }

      // 用户故事
      if (line.startsWith('### US-')) {
        // 保存之前的故事
        if (currentStory && currentStory.title) {
          userStories.push(this.finalizeStory(currentStory, ++storyIndex));
        }
        
        currentStory = {
          id: line.match(/US-\d+/)?.[0] || `US-${String(++storyIndex).padStart(3, '0')}`,
          title: line.replace(/### US-\d+:\s*/, '').trim(),
          acceptanceCriteria: [],
          status: UserStoryStatus.PENDING,
          passes: false,
          notes: '',
        };
        inAcceptanceCriteria = false;
        continue;
      }

      // 故事描述
      if (currentStory && line.startsWith('**Description:**')) {
        currentStory.description = line.replace('**Description:**', '').trim();
        continue;
      }

      // 验收标准
      if (currentStory && line.includes('**Acceptance Criteria:**')) {
        inAcceptanceCriteria = true;
        continue;
      }

      if (currentStory && inAcceptanceCriteria && line.startsWith('- [ ]')) {
        currentStory.acceptanceCriteria?.push(line.replace('- [ ]', '').trim());
        continue;
      }

      // 分支名
      if (line.startsWith('Branch: ')) {
        branchName = line.slice(8).trim();
      }
    }

    // 保存最后一个故事
    if (currentStory && currentStory.title) {
      userStories.push(this.finalizeStory(currentStory, ++storyIndex));
    }

    const prd: PRD = {
      project,
      branchName: branchName || `ralph/${project.toLowerCase().replace(/\s+/g, '-')}`,
      description,
      userStories,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return prd;
  }

  /**
   * 完成故事
   */
  private finalizeStory(story: Partial<UserStory>, index: number): UserStory {
    return {
      id: story.id || `US-${String(index).padStart(3, '0')}`,
      title: story.title || '',
      description: story.description || '',
      acceptanceCriteria: [...(story.acceptanceCriteria || []), 'Typecheck passes'],
      priority: index,
      status: UserStoryStatus.PENDING,
      passes: false,
      notes: story.notes || '',
    };
  }

  /**
   * 加载PRD
   */
  async loadPRD(filePath?: string): Promise<PRD> {
    const prdPath = filePath || path.join(this.basePath, 'prd.json');
    const content = await fs.readFile(prdPath, 'utf-8');
    const prd = JSON.parse(content);
    
    // 确保所有故事都有正确的状态
    prd.userStories = prd.userStories.map((story: UserStory) => ({
      ...story,
      status: story.status || UserStoryStatus.PENDING,
      passes: story.passes ?? false,
    }));
    
    return prd;
  }

  /**
   * 保存PRD
   */
  async savePRD(prd: PRD, filePath?: string): Promise<void> {
    const prdPath = filePath || path.join(this.basePath, 'prd.json');
    prd.updatedAt = Date.now();
    await fs.writeFile(prdPath, JSON.stringify(prd, null, 2), 'utf-8');
  }

  /**
   * 更新故事状态
   */
  async updateStoryStatus(
    prd: PRD,
    storyId: string,
    updates: Partial<UserStory>
  ): Promise<PRD> {
    const storyIndex = prd.userStories.findIndex(s => s.id === storyId);
    if (storyIndex === -1) {
      throw new Error(`Story not found: ${storyId}`);
    }

    prd.userStories[storyIndex] = {
      ...prd.userStories[storyIndex],
      ...updates,
    };

    prd.updatedAt = Date.now();
    return prd;
  }

  /**
   * 标记故事完成
   */
  async markStoryComplete(prd: PRD, storyId: string): Promise<PRD> {
    return this.updateStoryStatus(prd, storyId, {
      status: UserStoryStatus.COMPLETED,
      passes: true,
      completedAt: Date.now(),
    });
  }

  /**
   * 标记故事失败
   */
  async markStoryFailed(prd: PRD, storyId: string, error: string): Promise<PRD> {
    return this.updateStoryStatus(prd, storyId, {
      status: UserStoryStatus.FAILED,
      notes: error,
    });
  }

  /**
   * 获取下一个待处理的故事
   */
  getNextStory(prd: PRD): UserStory | null {
    const pendingStories = prd.userStories
      .filter(s => !s.passes && s.status !== UserStoryStatus.IN_PROGRESS)
      .sort((a, b) => a.priority - b.priority);

    return pendingStories[0] || null;
  }

  /**
   * 获取进度统计
   */
  getProgressStats(prd: PRD): {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    failed: number;
    percentage: number;
  } {
    const total = prd.userStories.length;
    const completed = prd.userStories.filter(s => s.passes).length;
    const pending = prd.userStories.filter(s => s.status === UserStoryStatus.PENDING).length;
    const inProgress = prd.userStories.filter(s => s.status === UserStoryStatus.IN_PROGRESS).length;
    const failed = prd.userStories.filter(s => s.status === UserStoryStatus.FAILED).length;

    return {
      total,
      completed,
      pending,
      inProgress,
      failed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * 导出为Markdown
   */
  toMarkdown(prd: PRD): string {
    let markdown = `# ${prd.project}\n\n`;
    markdown += `## ${prd.description}\n\n`;
    markdown += `Branch: ${prd.branchName}\n\n`;
    markdown += `## User Stories\n\n`;

    for (const story of prd.userStories) {
      markdown += `### ${story.id}: ${story.title}\n`;
      markdown += `**Description:** ${story.description}\n\n`;
      markdown += `**Acceptance Criteria:**\n`;
      
      for (const criteria of story.acceptanceCriteria) {
        const checked = story.passes ? 'x' : ' ';
        markdown += `- [${checked}] ${criteria}\n`;
      }
      
      markdown += `\n**Status:** ${story.status}\n`;
      markdown += `**Priority:** ${story.priority}\n`;
      
      if (story.notes) {
        markdown += `**Notes:** ${story.notes}\n`;
      }
      
      markdown += '\n---\n\n';
    }

    return markdown;
  }

  /**
   * 验证PRD
   */
  validate(prd: PRD): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必需字段
    if (!prd.project) {
      errors.push('Project name is required');
    }
    if (!prd.branchName) {
      errors.push('Branch name is required');
    }
    if (prd.userStories.length === 0) {
      errors.push('At least one user story is required');
    }

    // 检查故事
    for (const story of prd.userStories) {
      if (!story.title) {
        errors.push(`Story ${story.id}: Title is required`);
      }
      if (!story.description) {
        errors.push(`Story ${story.id}: Description is required`);
      }
      if (story.acceptanceCriteria.length === 0) {
        errors.push(`Story ${story.id}: At least one acceptance criterion is required`);
      }
    }

    // 检查优先级顺序
    const priorities = prd.userStories.map(s => s.priority);
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      errors.push('Story priorities must be unique');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default PRDManager;
