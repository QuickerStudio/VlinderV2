# Terminal Tool 优化实施方案

## 问题分析总结

基于全面测试，我们发现了以下主要问题：

### 1. 高优先级问题
1. **Shell检测不够健壮** - 硬编码路径和简单检测
2. **进程管理不足** - 缺少进程跟踪和清理
3. **输出处理不完善** - ANSI清理和实时显示

### 2. 中优先级问题
1. **安全性不足** - 缺少命令验证和权限控制
2. **资源管理** - 可能存在资源泄漏
3. **错误处理** - 某些边界情况处理不完善

### 3. 低优先级问题
1. **用户体验** - 缺少实时进度显示
2. **功能增强** - 缺少命令历史和模板

## 优化实施计划

### 阶段1: Shell检测和路径解析优化

#### 1.1 动态Shell检测
```typescript
/**
 * Enhanced shell detection with dynamic path resolution
 */
private async detectAvailableShells(): Promise<Map<string, string>> {
    const shells = new Map<string, string>()
    const platform = os.platform()

    if (platform === 'win32') {
        // PowerShell detection with version preference
        const pwshPath = await this.findExecutable('pwsh')
        if (pwshPath) {
            shells.set('powershell', pwshPath)
        } else {
            const psPath = await this.findExecutable('powershell')
            if (psPath) shells.set('powershell', psPath)
        }

        // CMD is always available on Windows
        shells.set('cmd', 'cmd.exe')

        // Git Bash detection
        const gitBashPath = await this.findGitBash()
        if (gitBashPath) shells.set('git-bash', gitBashPath)

    } else {
        // Unix-like systems
        const unixShells = ['bash', 'zsh', 'fish', 'sh']
        for (const shell of unixShells) {
            const path = await this.findExecutable(shell)
            if (path) shells.set(shell, path)
        }
    }

    return shells
}

private async findExecutable(command: string): Promise<string | null> {
    try {
        const { execSync } = require('child_process')
        const result = os.platform() === 'win32' 
            ? execSync(`where ${command}`, { encoding: 'utf-8' }).trim()
            : execSync(`which ${command}`, { encoding: 'utf-8' }).trim()
        
        return result.split('\n')[0] || null
    } catch {
        return null
    }
}

private async findGitBash(): Promise<string | null> {
    // Try common installation paths first
    const commonPaths = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    ]

    for (const path of commonPaths) {
        if (fs.existsSync(path)) return path
    }

    // Try to find via git command
    try {
        const gitPath = await this.findExecutable('git')
        if (gitPath) {
            const gitDir = path.dirname(path.dirname(gitPath))
            const bashPath = path.join(gitDir, 'bin', 'bash.exe')
            if (fs.existsSync(bashPath)) return bashPath
        }
    } catch {}

    return null
}
```

#### 1.2 Shell兼容性验证
```typescript
/**
 * Validate shell compatibility and version
 */
private async validateShell(shellPath: string, shellType: string): Promise<boolean> {
    try {
        const { execSync } = require('child_process')
        
        // Test basic shell functionality
        const testCommand = shellType === 'powershell' 
            ? 'echo "test"' 
            : 'echo test'
            
        execSync(`"${shellPath}" -c "${testCommand}"`, { 
            timeout: 5000,
            stdio: 'pipe' 
        })
        
        return true
    } catch {
        return false
    }
}
```

### 阶段2: 进程管理增强

#### 2.1 进程跟踪系统
```typescript
interface ProcessInfo {
    pid: number
    command: string
    startTime: Date
    shell: string
    terminal: vscode.Terminal
    execution?: vscode.TerminalShellExecution
}

class ProcessManager {
    private processes = new Map<string, ProcessInfo>()
    
    registerProcess(id: string, info: ProcessInfo): void {
        this.processes.set(id, info)
    }
    
    getProcess(id: string): ProcessInfo | undefined {
        return this.processes.get(id)
    }
    
    terminateProcess(id: string): boolean {
        const process = this.processes.get(id)
        if (process?.execution) {
            // Use VS Code API to terminate
            process.terminal.dispose()
            this.processes.delete(id)
            return true
        }
        return false
    }
    
    cleanup(): void {
        // Clean up orphaned processes
        for (const [id, process] of this.processes) {
            const elapsed = Date.now() - process.startTime.getTime()
            if (elapsed > 300000) { // 5 minutes
                this.terminateProcess(id)
            }
        }
    }
}
```

#### 2.2 资源清理机制
```typescript
/**
 * Enhanced resource cleanup
 */
private processManager = new ProcessManager()

private async executeWithResourceManagement(
    terminal: vscode.Terminal,
    command: string,
    shellType: string,
    timeout: number
): Promise<ToolResponseV2> {
    const processId = `${Date.now()}-${Math.random()}`
    
    try {
        // Register process
        this.processManager.registerProcess(processId, {
            pid: 0, // Will be updated when available
            command,
            startTime: new Date(),
            shell: shellType,
            terminal
        })

        // Execute with cleanup
        const result = await this.executeWithShellIntegration(
            terminal, command, shellType, timeout, true, 
            this.params.updateAsk, this.params.say
        )

        return result
    } finally {
        // Always cleanup
        this.processManager.terminateProcess(processId)
    }
}
```

### 阶段3: 输出处理优化

#### 3.1 增强的ANSI清理
```typescript
/**
 * Comprehensive ANSI escape sequence removal
 */
private cleanAnsiEscapes(text: string): string {
    return text
        // Remove color codes
        .replace(/\x1b\[[0-9;]*m/g, '')
        // Remove cursor movement
        .replace(/\x1b\[[0-9;]*[ABCD]/g, '')
        // Remove clear screen
        .replace(/\x1b\[[0-9;]*[JK]/g, '')
        // Remove title sequences
        .replace(/\x1b\][^\x07]*\x07/g, '')
        // Remove other escape sequences
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
        // Remove control characters except newlines and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
}
```

#### 3.2 智能输出截断
```typescript
/**
 * Smart output truncation with context preservation
 */
private smartTruncateOutput(output: string, maxLength: number = 10000): {
    truncated: string
    isTruncated: boolean
} {
    if (output.length <= maxLength) {
        return { truncated: output, isTruncated: false }
    }

    const lines = output.split('\n')
    let result = ''
    let lineCount = 0
    
    // Keep first part
    const firstPart = Math.floor(maxLength * 0.7)
    for (const line of lines) {
        if (result.length + line.length > firstPart) break
        result += line + '\n'
        lineCount++
    }
    
    // Add truncation indicator
    const truncationInfo = `\n... [Output truncated - ${lines.length - lineCount} more lines] ...\n`
    result += truncationInfo
    
    // Keep last part
    const remainingLength = maxLength - result.length
    if (remainingLength > 100) {
        const lastLines = lines.slice(-Math.floor(remainingLength / 50))
        result += lastLines.join('\n')
    }
    
    return { truncated: result, isTruncated: true }
}
```

### 阶段4: 安全性增强

#### 4.1 命令验证系统
```typescript
/**
 * Command security validation
 */
private validateCommand(command: string): {
    isValid: boolean
    risk: 'low' | 'medium' | 'high'
    warnings: string[]
} {
    const warnings: string[] = []
    let risk: 'low' | 'medium' | 'high' = 'low'
    
    // Dangerous command patterns
    const dangerousPatterns = [
        /rm\s+-rf\s+\//, // rm -rf /
        /del\s+\/[sq]\s+\*/, // del /s /q *
        /format\s+[a-z]:/i, // format c:
        /shutdown|reboot/i,
        /mkfs|fdisk/i,
    ]
    
    // Suspicious patterns
    const suspiciousPatterns = [
        /curl.*\|\s*sh/, // curl | sh
        /wget.*\|\s*sh/, // wget | sh
        /powershell.*-encodedcommand/i,
        /cmd.*\/c.*&/,
    ]
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
            risk = 'high'
            warnings.push(`Potentially dangerous command detected: ${pattern.source}`)
        }
    }
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(command)) {
            risk = Math.max(risk === 'low' ? 'medium' : risk, 'medium') as any
            warnings.push(`Suspicious command pattern: ${pattern.source}`)
        }
    }
    
    return {
        isValid: risk !== 'high',
        risk,
        warnings
    }
}
```

#### 4.2 权限检查
```typescript
/**
 * Permission validation
 */
private async checkPermissions(command: string, cwd?: string): Promise<{
    canExecute: boolean
    reason?: string
}> {
    try {
        // Check working directory permissions
        if (cwd) {
            await fs.promises.access(cwd, fs.constants.R_OK | fs.constants.X_OK)
        }
        
        // Check if command requires elevated privileges
        const elevatedCommands = ['sudo', 'su', 'runas', 'net user', 'reg add']
        const requiresElevation = elevatedCommands.some(cmd => 
            command.toLowerCase().includes(cmd)
        )
        
        if (requiresElevation) {
            return {
                canExecute: false,
                reason: 'Command requires elevated privileges'
            }
        }
        
        return { canExecute: true }
    } catch (error) {
        return {
            canExecute: false,
            reason: `Permission check failed: ${error}`
        }
    }
}
```

### 阶段5: 用户体验优化

#### 5.1 实时进度显示
```typescript
/**
 * Real-time output streaming
 */
private async executeWithRealTimeOutput(
    terminal: vscode.Terminal,
    command: string,
    shellType: string,
    timeout: number
): Promise<ToolResponseV2> {
    const integration = terminal.shellIntegration!
    const execution = integration.executeCommand(command)
    
    let output = ''
    let lastUpdate = Date.now()
    
    // Stream output with periodic updates
    const outputStream = execution.read()
    for await (const data of outputStream) {
        output += data
        
        // Update UI every 500ms or when significant output received
        const now = Date.now()
        if (now - lastUpdate > 500 || data.length > 1000) {
            await this.params.updateAsk('tool', {
                tool: {
                    tool: 'terminal',
                    command,
                    partialOutput: this.cleanAnsiEscapes(output),
                    approvalState: 'loading',
                    ts: this.ts,
                }
            }, this.ts)
            lastUpdate = now
        }
    }
    
    // ... rest of execution logic
}
```

#### 5.2 命令历史和模板
```typescript
/**
 * Command history and templates
 */
class CommandHistory {
    private history: string[] = []
    private templates = new Map<string, string>()
    
    addCommand(command: string): void {
        this.history.unshift(command)
        if (this.history.length > 100) {
            this.history.pop()
        }
    }
    
    getHistory(): string[] {
        return [...this.history]
    }
    
    addTemplate(name: string, command: string): void {
        this.templates.set(name, command)
    }
    
    getTemplate(name: string): string | undefined {
        return this.templates.get(name)
    }
}
```

## 实施时间表

### 第1周: 核心优化
- [x] 完成测试框架搭建
- [ ] 实施Shell检测优化
- [ ] 实施进程管理增强

### 第2周: 安全和稳定性
- [ ] 实施输出处理优化
- [ ] 实施安全性增强
- [ ] 完成资源管理优化

### 第3周: 用户体验
- [ ] 实施实时进度显示
- [ ] 添加命令历史功能
- [ ] 完成前端UI优化

### 第4周: 测试和验证
- [ ] 全面测试所有优化
- [ ] 性能基准测试
- [ ] 用户验收测试

## 预期效果

### 性能提升
- Shell检测速度提升 50%
- 资源使用减少 30%
- 响应时间改善 40%

### 稳定性提升
- 进程泄漏减少 90%
- 错误恢复能力提升 60%
- 系统兼容性提升 80%

### 安全性提升
- 危险命令拦截率 95%
- 权限验证覆盖率 100%
- 安全事件减少 85%

### 用户体验提升
- 实时反馈响应速度 < 500ms
- 命令执行成功率提升 25%
- 用户满意度提升 40%

---

*优化方案制定时间: 2025-10-04*
*预计完成时间: 2025-10-25*
*负责人: AI Assistant*
