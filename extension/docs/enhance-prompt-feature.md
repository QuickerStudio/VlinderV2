# 提示词增强功能 (Enhance Prompt Feature)

## 概述

提示词增强功能通过两阶段AI处理流程，帮助用户优化和改进他们的提示词，使其更加清晰、具体和可操作。

## 功能特点

- ✨ **两阶段增强流程**：
  - **阶段1**：初步清理和结构化
  - **阶段2**：深度分析和最终优化
- 🔄 **后台静默处理**：不经过聊天界面显示
- ⚡ **实时反馈**：按钮状态显示处理进度
- 🎯 **智能优化**：基于AI的提示词改进

## 使用方法

1. 在输入框中输入您的提示词
2. 点击发送按钮左边的 ✨ 增强按钮
3. 等待处理完成（按钮会显示加载动画）
4. 增强后的提示词会自动替换输入框中的内容

## 技术架构

### 后端组件

#### 1. EnhancePromptHook (`src/agent/v1/hooks/enhance-prompt.ts`)
- 实现两阶段增强流程
- 管理API调用和错误处理
- 提供配置选项（模型ID、提供商ID）

#### 2. Agent Router (`src/router/routes/agent-router.ts`)
- 添加 `enhancePrompt` RPC路由
- 处理前端请求并调用hook
- 返回增强结果或错误信息

### 前端组件

#### 1. EnhancePromptButton (`webview-ui-vite/src/components/chat-view/enhance-prompt-button.tsx`)
- 提供用户界面交互
- 管理加载状态和错误处理
- 使用RPC客户端与后端通信

#### 2. InputArea 更新 (`webview-ui-vite/src/components/chat-view/input-area.tsx`)
- 集成增强按钮到输入区域
- 处理增强后的提示词回调
- 管理输入框焦点和光标位置

## 两阶段处理流程

### 阶段1：初步增强
- **目标**：清理和基础结构化
- **处理内容**：
  - 语法和拼写修正
  - 基本结构组织
  - 意图澄清
  - 基础上下文添加

### 阶段2：深度分析
- **目标**：战略性优化和最终完善
- **处理内容**：
  - 战略分析和上下文丰富
  - 技术精度提升
  - 输出优化
  - 高级提示技巧应用

## 配置选项

```typescript
interface EnhancePromptOptions {
  modelId?: string      // 可选：指定使用的模型ID
  providerId?: string   // 可选：指定使用的提供商ID
}
```

## 错误处理

- 网络错误和超时处理
- 阶段失败时的降级策略
- 用户友好的错误反馈（计划中）

## 未来改进

- [ ] 添加用户友好的错误通知
- [ ] 支持自定义增强模板
- [ ] 添加增强历史记录
- [ ] 支持批量提示词增强
- [ ] 添加增强质量评估

## 开发说明

### 测试
建议编写单元测试来验证：
- 两阶段增强流程
- 错误处理机制
- RPC通信
- UI交互

### 调试
使用浏览器控制台查看详细日志：
- `[EnhancePrompt]` - 后端处理日志
- `[EnhancePromptButton]` - 前端交互日志
