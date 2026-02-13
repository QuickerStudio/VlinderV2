/**
 * @fileoverview Ralph Integration Types - Ralph集成类型定义
 * 
 * 基于https://github.com/snarktank/ralph的核心设计
 * 
 * @version 2.0.0
 */

import { z } from 'zod';

// ============================================================================
// PRD (Product Requirements Document) Types
// ============================================================================

/**
 * 用户故事状态
 */
export enum UserStoryStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * 用户故事
 */
export interface UserStory {
  id: string;                    // US-001, US-002, etc.
  title: string;
  description: string;           // As a [user], I want [feature] so that [benefit]
  acceptanceCriteria: string[];  // 验收标准
  priority: number;              // 优先级 (1最高)
  status: UserStoryStatus;
  passes: boolean;               // 是否通过
  notes: string;                 // 备注
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: string;
}

/**
 * PRD (Product Requirements Document)
 */
export interface PRD {
  project: string;
  branchName: string;
  description: string;
  userStories: UserStory[];
  createdAt: number;
  updatedAt: number;
}

/**
 * PRD Schema for validation
 */
export const PRDSchema = z.object({
  project: z.string(),
  branchName: z.string(),
  description: z.string(),
  userStories: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    acceptanceCriteria: z.array(z.string()),
    priority: z.number(),
    status: z.nativeEnum(UserStoryStatus).optional().default(UserStoryStatus.PENDING),
    passes: z.boolean().default(false),
    notes: z.string().optional().default(''),
  })),
});

// ============================================================================
// Progress Log Types
// ============================================================================

/**
 * 进度日志条目
 */
export interface ProgressLogEntry {
  timestamp: number;
  storyId: string;
  threadUrl?: string;
  implemented: string;
  filesChanged: string[];
  learnings: string[];
  patterns?: string[];
}

/**
 * 进度日志
 */
export interface ProgressLog {
  project: string;
  branchName: string;
  startedAt: number;
  entries: ProgressLogEntry[];
  codebasePatterns: string[];
}

// ============================================================================
// Ralph Loop Types
// ============================================================================

/**
 * Ralph循环配置
 */
export interface RalphLoopConfig {
  maxIterations: number;         // 最大迭代次数
  tool: 'amp' | 'claude' | 'vlinder';  // AI工具
  qualityChecks: string[];       // 质量检查命令
  autoCommit: boolean;           // 自动提交
  autoArchive: boolean;          // 自动归档
  stopOnComplete: boolean;       // 完成时停止
  progressFile: string;          // 进度文件路径
  prdFile: string;               // PRD文件路径
}

/**
 * Ralph循环状态
 */
export interface RalphLoopState {
  iteration: number;
  currentStory: UserStory | null;
  completedStories: number;
  totalStories: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
  startedAt: number;
  lastIterationAt: number;
  error?: string;
}

/**
 * Ralph循环事件
 */
export enum RalphEventType {
  LOOP_STARTED = 'ralph:loop_started',
  LOOP_COMPLETED = 'ralph:loop_completed',
  LOOP_FAILED = 'ralph:loop_failed',
  ITERATION_STARTED = 'ralph:iteration_started',
  ITERATION_COMPLETED = 'ralph:iteration_completed',
  STORY_STARTED = 'ralph:story_started',
  STORY_COMPLETED = 'ralph:story_completed',
  STORY_FAILED = 'ralph:story_failed',
  QUALITY_CHECK_STARTED = 'ralph:quality_check_started',
  QUALITY_CHECK_COMPLETED = 'ralph:quality_check_completed',
  COMMIT_CREATED = 'ralph:commit_created',
  PROGRESS_UPDATED = 'ralph:progress_updated',
}

/**
 * Ralph循环事件数据
 */
export interface RalphEventData {
  loopState?: RalphLoopState;
  iteration?: number;
  story?: UserStory;
  result?: {
    success: boolean;
    output?: string;
    error?: string;
  };
  qualityCheck?: {
    name: string;
    passed: boolean;
    output?: string;
  };
  commit?: {
    hash: string;
    message: string;
  };
  progress?: ProgressLogEntry;
}

// ============================================================================
// Archive Types
// ============================================================================

/**
 * 归档信息
 */
export interface ArchiveInfo {
  date: string;
  branchName: string;
  folderName: string;
  prdPath: string;
  progressPath: string;
}

// ============================================================================
// Quality Check Types
// ============================================================================

/**
 * 质量检查类型
 */
export interface QualityCheck {
  name: string;
  command: string;
  required: boolean;
  timeout: number;
}

/**
 * 质量检查结果
 */
export interface QualityCheckResult {
  name: string;
  passed: boolean;
  output: string;
  duration: number;
  error?: string;
}

// ============================================================================
// Story Execution Types
// ============================================================================

/**
 * 故事执行上下文
 */
export interface StoryExecutionContext {
  story: UserStory;
  prd: PRD;
  progress: ProgressLog;
  iteration: number;
  workingDirectory: string;
  branchName: string;
}

/**
 * 故事执行结果
 */
export interface StoryExecutionResult {
  storyId: string;
  success: boolean;
  implemented: string;
  filesChanged: string[];
  learnings: string[];
  qualityChecks: QualityCheckResult[];
  commitHash?: string;
  error?: string;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * 默认Ralph循环配置
 */
export const DEFAULT_RALPH_CONFIG: RalphLoopConfig = {
  maxIterations: 10,
  tool: 'vlinder',
  qualityChecks: ['typecheck', 'lint', 'test'],
  autoCommit: true,
  autoArchive: true,
  stopOnComplete: true,
  progressFile: 'progress.txt',
  prdFile: 'prd.json',
};

/**
 * 默认质量检查
 */
export const DEFAULT_QUALITY_CHECKS: QualityCheck[] = [
  { name: 'typecheck', command: 'npm run typecheck', required: true, timeout: 60000 },
  { name: 'lint', command: 'npm run lint', required: true, timeout: 60000 },
  { name: 'test', command: 'npm test', required: false, timeout: 120000 },
];
