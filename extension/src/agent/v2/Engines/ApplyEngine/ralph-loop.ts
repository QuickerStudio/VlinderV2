/**
 * @fileoverview Ralph Loop - Autonomous Agent Loop Implementation
 * 
 * 基于https://github.com/snarktank/ralph的AgentLoop设计
 * 
 * 核心特性：
 * - 循环执行直到所有PRD任务完成
 * - 每次迭代只处理一个故事
 * - 每次迭代是全新实例（清洁上下文）
 * - 进度持久化到progress.txt
 * - 自动质量检查和提交
 * 
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  PRD,
  UserStory,
  UserStoryStatus,
  ProgressLog,
  ProgressLogEntry,
  RalphLoopConfig,
  RalphLoopState,
  RalphEventType,
  RalphEventData,
  QualityCheck,
  QualityCheckResult,
  StoryExecutionContext,
  StoryExecutionResult,
  ArchiveInfo,
  DEFAULT_RALPH_CONFIG,
  DEFAULT_QUALITY_CHECKS,
} from './ralph-types';

// ============================================================================
// Ralph Loop
// ============================================================================

/**
 * RalphLoop - 自主代理循环
 * 
 * 实现Ralph模式的核心循环：
 * 1. 读取PRD
 * 2. 选择最高优先级的未完成故事
 * 3. 执行故事
 * 4. 运行质量检查
 * 5. 如果通过，提交并更新PRD
 * 6. 记录进度
 * 7. 重复直到所有故事完成或达到最大迭代次数
 */
export class RalphLoop extends EventEmitter {
  private config: RalphLoopConfig;
  private qualityChecks: QualityCheck[];
  private state: RalphLoopState;
  private prd: PRD | null = null;
  private progress: ProgressLog | null = null;
  private basePath: string;
  private lastBranchFile: string;
  private archiveDir: string;
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;

  constructor(basePath: string, config: Partial<RalphLoopConfig> = {}) {
    super();
    this.basePath = basePath;
    this.config = { ...DEFAULT_RALPH_CONFIG, ...config };
    this.qualityChecks = DEFAULT_QUALITY_CHECKS;
    this.lastBranchFile = path.join(basePath, '.last-branch');
    this.archiveDir = path.join(basePath, 'archive');
    
    this.state = {
      iteration: 0,
      currentStory: null,
      completedStories: 0,
      totalStories: 0,
      status: 'running',
      startedAt: Date.now(),
      lastIterationAt: Date.now(),
    };
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * 启动Ralph循环
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Ralph loop is already running');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      // 初始化
      await this.initialize();

      // 检查是否需要归档之前的运行
      await this.archivePreviousRun();

      // 开始循环
      this.emit(RalphEventType.LOOP_STARTED, { loopState: this.state });

      while (
        this.isRunning &&
        this.state.iteration < this.config.maxIterations &&
        !this.allStoriesComplete()
      ) {
        if (this.abortController.signal.aborted) {
          break;
        }

        await this.runIteration();
      }

      // 检查是否完成
      if (this.allStoriesComplete()) {
        this.state.status = 'completed';
        this.emit(RalphEventType.LOOP_COMPLETED, { loopState: this.state });
      } else {
        this.state.status = 'failed';
        this.state.error = `Reached max iterations (${this.config.maxIterations}) without completing all stories`;
        this.emit(RalphEventType.LOOP_FAILED, { loopState: this.state });
      }

    } catch (error) {
      this.state.status = 'failed';
      this.state.error = error instanceof Error ? error.message : String(error);
      this.emit(RalphEventType.LOOP_FAILED, { loopState: this.state });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 停止Ralph循环
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 暂停Ralph循环
   */
  async pause(): Promise<void> {
    this.state.status = 'paused';
  }

  /**
   * 恢复Ralph循环
   */
  async resume(): Promise<void> {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
    }
  }

  // =========================================================================
  // Initialization
  // =========================================================================

  /**
   * 初始化
   */
  private async initialize(): Promise<void> {
    // 加载PRD
    await this.loadPRD();

    // 加载进度
    await this.loadProgress();

    // 更新状态
    this.state.totalStories = this.prd?.userStories.length || 0;
    this.state.completedStories = this.prd?.userStories.filter(s => s.passes).length || 0;
  }

  /**
   * 加载PRD
   */
  private async loadPRD(): Promise<void> {
    const prdPath = path.join(this.basePath, this.config.prdFile);
    
    try {
      const content = await fs.readFile(prdPath, 'utf-8');
      this.prd = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load PRD from ${prdPath}: ${error}`);
    }
  }

  /**
   * 加载进度
   */
  private async loadProgress(): Promise<void> {
    const progressPath = path.join(this.basePath, this.config.progressFile);
    
    try {
      const content = await fs.readFile(progressPath, 'utf-8');
      this.progress = this.parseProgressFile(content);
    } catch {
      // 创建新的进度文件
      this.progress = {
        project: this.prd?.project || 'Unknown',
        branchName: this.prd?.branchName || '',
        startedAt: Date.now(),
        entries: [],
        codebasePatterns: [],
      };
      await this.saveProgress();
    }
  }

  /**
   * 解析进度文件
   */
  private parseProgressFile(content: string): ProgressLog {
    const lines = content.split('\n');
    const progress: ProgressLog = {
      project: '',
      branchName: '',
      startedAt: Date.now(),
      entries: [],
      codebasePatterns: [],
    };

    let currentEntry: Partial<ProgressLogEntry> | null = null;
    let inPatterns = false;

    for (const line of lines) {
      if (line.startsWith('## Codebase Patterns')) {
        inPatterns = true;
        continue;
      }

      if (inPatterns && line.startsWith('- ')) {
        progress.codebasePatterns.push(line.slice(2));
        continue;
      }

      if (line.startsWith('## ')) {
        inPatterns = false;
        if (currentEntry) {
          progress.entries.push(currentEntry as ProgressLogEntry);
        }
        currentEntry = {
          timestamp: Date.now(),
          storyId: line.slice(3).split(' - ')[1] || '',
          implemented: '',
          filesChanged: [],
          learnings: [],
        };
        continue;
      }

      if (currentEntry) {
        if (line.startsWith('- ')) {
          currentEntry.learnings?.push(line.slice(2));
        }
      }
    }

    if (currentEntry) {
      progress.entries.push(currentEntry as ProgressLogEntry);
    }

    return progress;
  }

  /**
   * 保存进度
   */
  private async saveProgress(): Promise<void> {
    if (!this.progress) return;

    const progressPath = path.join(this.basePath, this.config.progressFile);
    const content = this.formatProgressFile();
    
    await fs.writeFile(progressPath, content, 'utf-8');
  }

  /**
   * 格式化进度文件
   */
  private formatProgressFile(): string {
    if (!this.progress) return '';

    let content = `# Ralph Progress Log\n`;
    content += `Started: ${new Date(this.progress.startedAt).toISOString()}\n`;
    content += `---\n\n`;

    // 代码库模式
    if (this.progress.codebasePatterns.length > 0) {
      content += `## Codebase Patterns\n`;
      for (const pattern of this.progress.codebasePatterns) {
        content += `- ${pattern}\n`;
      }
      content += `\n`;
    }

    // 进度条目
    for (const entry of this.progress.entries) {
      content += `## ${new Date(entry.timestamp).toISOString()} - ${entry.storyId}\n`;
      if (entry.threadUrl) {
        content += `Thread: ${entry.threadUrl}\n`;
      }
      content += `${entry.implemented}\n`;
      content += `Files changed: ${entry.filesChanged.join(', ')}\n`;
      content += `**Learnings for future iterations:**\n`;
      for (const learning of entry.learnings) {
        content += `  - ${learning}\n`;
      }
      content += `---\n\n`;
    }

    return content;
  }

  // =========================================================================
  // Iteration
  // =========================================================================

  /**
   * 运行单次迭代
   */
  private async runIteration(): Promise<void> {
    this.state.iteration++;
    this.state.lastIterationAt = Date.now();

    this.emit(RalphEventType.ITERATION_STARTED, {
      iteration: this.state.iteration,
      loopState: this.state,
    });

    try {
      // 选择下一个故事
      const story = this.selectNextStory();
      if (!story) {
        this.emit(RalphEventType.ITERATION_COMPLETED, {
          iteration: this.state.iteration,
          result: { success: true, output: 'No more stories to execute' },
        });
        return;
      }

      this.state.currentStory = story;
      story.status = UserStoryStatus.IN_PROGRESS;
      story.startedAt = Date.now();

      this.emit(RalphEventType.STORY_STARTED, { story });

      // 执行故事
      const result = await this.executeStory(story);

      if (result.success) {
        // 更新故事状态
        story.status = UserStoryStatus.COMPLETED;
        story.passes = true;
        story.completedAt = Date.now();
        story.duration = story.completedAt - (story.startedAt || Date.now());

        this.state.completedStories++;

        // 记录进度
        await this.appendProgress(result);

        // 保存PRD
        await this.savePRD();

        this.emit(RalphEventType.STORY_COMPLETED, { story, result });
      } else {
        story.status = UserStoryStatus.FAILED;
        story.error = result.error;
        story.notes = `Failed: ${result.error}`;

        this.emit(RalphEventType.STORY_FAILED, { story, result });
      }

      this.emit(RalphEventType.ITERATION_COMPLETED, {
        iteration: this.state.iteration,
        story,
        result,
      });

    } catch (error) {
      this.emit(RalphEventType.ITERATION_COMPLETED, {
        iteration: this.state.iteration,
        result: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * 选择下一个故事
   */
  private selectNextStory(): UserStory | null {
    if (!this.prd) return null;

    // 选择最高优先级的未完成故事
    const pendingStories = this.prd.userStories
      .filter(s => !s.passes && s.status !== UserStoryStatus.IN_PROGRESS)
      .sort((a, b) => a.priority - b.priority);

    return pendingStories[0] || null;
  }

  /**
   * 执行故事
   */
  private async executeStory(story: UserStory): Promise<StoryExecutionResult> {
    const result: StoryExecutionResult = {
      storyId: story.id,
      success: false,
      implemented: '',
      filesChanged: [],
      learnings: [],
      qualityChecks: [],
    };

    try {
      // 创建执行上下文
      const context: StoryExecutionContext = {
        story,
        prd: this.prd!,
        progress: this.progress!,
        iteration: this.state.iteration,
        workingDirectory: this.basePath,
        branchName: this.prd?.branchName || '',
      };

      // 执行故事实现（由子类或回调实现）
      const implementation = await this.implementStory(context);
      
      result.implemented = implementation.implemented;
      result.filesChanged = implementation.filesChanged;
      result.learnings = implementation.learnings;

      // 运行质量检查
      const qualityResults = await this.runQualityChecks();
      result.qualityChecks = qualityResults;

      // 检查是否所有必需的质量检查都通过
      const allPassed = qualityResults.every(r => r.passed || !this.isCheckRequired(r.name));

      if (allPassed) {
        // 提交更改
        if (this.config.autoCommit) {
          const commitHash = await this.commitChanges(story);
          result.commitHash = commitHash;
        }

        result.success = true;
      } else {
        result.error = 'Quality checks failed';
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  /**
   * 实现故事（由子类或回调实现）
   */
  protected async implementStory(
    context: StoryExecutionContext
  ): Promise<{
    implemented: string;
    filesChanged: string[];
    learnings: string[];
  }> {
    // 默认实现 - 子类应该覆盖此方法
    return {
      implemented: `Story ${context.story.id} implementation`,
      filesChanged: [],
      learnings: [],
    };
  }

  // =========================================================================
  // Quality Checks
  // =========================================================================

  /**
   * 运行质量检查
   */
  private async runQualityChecks(): Promise<QualityCheckResult[]> {
    const results: QualityCheckResult[] = [];

    for (const check of this.qualityChecks) {
      this.emit(RalphEventType.QUALITY_CHECK_STARTED, {
        qualityCheck: { name: check.name, passed: false },
      });

      const result = await this.runQualityCheck(check);
      results.push(result);

      this.emit(RalphEventType.QUALITY_CHECK_COMPLETED, {
        qualityCheck: result,
      });
    }

    return results;
  }

  /**
   * 运行单个质量检查
   */
  private async runQualityCheck(check: QualityCheck): Promise<QualityCheckResult> {
    const startTime = Date.now();
    
    try {
      // 使用child_process执行命令
      const { spawn } = require('child_process');
      
      const result = await new Promise<QualityCheckResult>((resolve) => {
        const proc = spawn(check.command, [], {
          cwd: this.basePath,
          shell: true,
          timeout: check.timeout,
        });

        let output = '';
        proc.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
        proc.stderr?.on('data', (data: Buffer) => { output += data.toString(); });

        proc.on('close', (code: number) => {
          resolve({
            name: check.name,
            passed: code === 0,
            output,
            duration: Date.now() - startTime,
          });
        });

        proc.on('error', (error: Error) => {
          resolve({
            name: check.name,
            passed: false,
            output: error.message,
            duration: Date.now() - startTime,
            error: error.message,
          });
        });
      });

      return result;
    } catch (error) {
      return {
        name: check.name,
        passed: false,
        output: '',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 检查质量检查是否必需
   */
  private isCheckRequired(name: string): boolean {
    const check = this.qualityChecks.find(c => c.name === name);
    return check?.required ?? false;
  }

  // =========================================================================
  // Git Operations
  // =========================================================================

  /**
   * 提交更改
   */
  private async commitChanges(story: UserStory): Promise<string> {
    const { spawn } = require('child_process');
    
    const commitMessage = `feat: ${story.id} - ${story.title}`;

    // git add
    await this.runGitCommand(['add', '-A']);

    // git commit
    await this.runGitCommand(['commit', '-m', commitMessage]);

    // 获取commit hash
    const hash = await this.runGitCommand(['rev-parse', 'HEAD']);

    this.emit(RalphEventType.COMMIT_CREATED, {
      commit: { hash, message: commitMessage },
    });

    return hash;
  }

  /**
   * 运行git命令
   */
  private async runGitCommand(args: string[]): Promise<string> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, {
        cwd: this.basePath,
      });

      let output = '';
      proc.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
      proc.stderr?.on('data', (data: Buffer) => { output += data.toString(); });

      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Git command failed: ${args.join(' ')}\n${output}`));
        }
      });

      proc.on('error', reject);
    });
  }

  // =========================================================================
  // Archive
  // =========================================================================

  /**
   * 归档之前的运行
   */
  private async archivePreviousRun(): Promise<void> {
    if (!this.config.autoArchive) return;

    try {
      // 检查是否有之前的运行
      const lastBranch = await this.readLastBranch();
      const currentBranch = this.prd?.branchName;

      if (lastBranch && currentBranch && lastBranch !== currentBranch) {
        // 创建归档
        const date = new Date().toISOString().split('T')[0];
        const folderName = lastBranch.replace(/^ralph\//, '');
        const archiveFolder = path.join(this.archiveDir, `${date}-${folderName}`);

        await fs.mkdir(archiveFolder, { recursive: true });

        // 复制PRD和进度文件
        const prdPath = path.join(this.basePath, this.config.prdFile);
        const progressPath = path.join(this.basePath, this.config.progressFile);

        await fs.copyFile(prdPath, path.join(archiveFolder, 'prd.json')).catch(() => {});
        await fs.copyFile(progressPath, path.join(archiveFolder, 'progress.txt')).catch(() => {});

        // 重置进度文件
        this.progress = {
          project: this.prd?.project || '',
          branchName: currentBranch,
          startedAt: Date.now(),
          entries: [],
          codebasePatterns: [],
        };
        await this.saveProgress();
      }

      // 记录当前分支
      if (currentBranch) {
        await this.writeLastBranch(currentBranch);
      }
    } catch (error) {
      console.error('Failed to archive previous run:', error);
    }
  }

  /**
   * 读取上次分支
   */
  private async readLastBranch(): Promise<string | null> {
    try {
      return await fs.readFile(this.lastBranchFile, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * 写入当前分支
   */
  private async writeLastBranch(branch: string): Promise<void> {
    await fs.writeFile(this.lastBranchFile, branch, 'utf-8');
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * 检查是否所有故事都完成
   */
  private allStoriesComplete(): boolean {
    if (!this.prd) return true;
    return this.prd.userStories.every(s => s.passes);
  }

  /**
   * 保存PRD
   */
  private async savePRD(): Promise<void> {
    if (!this.prd) return;

    const prdPath = path.join(this.basePath, this.config.prdFile);
    this.prd.updatedAt = Date.now();
    
    await fs.writeFile(prdPath, JSON.stringify(this.prd, null, 2), 'utf-8');
  }

  /**
   * 追加进度
   */
  private async appendProgress(result: StoryExecutionResult): Promise<void> {
    if (!this.progress) return;

    const entry: ProgressLogEntry = {
      timestamp: Date.now(),
      storyId: result.storyId,
      implemented: result.implemented,
      filesChanged: result.filesChanged,
      learnings: result.learnings,
    };

    this.progress.entries.push(entry);
    await this.saveProgress();

    this.emit(RalphEventType.PROGRESS_UPDATED, { progress: entry });
  }

  /**
   * 获取状态
   */
  getState(): RalphLoopState {
    return { ...this.state };
  }

  /**
   * 获取PRD
   */
  getPRD(): PRD | null {
    return this.prd;
  }

  /**
   * 获取进度
   */
  getProgress(): ProgressLog | null {
    return this.progress;
  }
}

export default RalphLoop;
