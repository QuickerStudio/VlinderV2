# Fetch Webpage Tool - 全面测试计划

## 测试概述

本文档描述了fetch-webpage工具的全面测试策略，包括单元测试、集成测试、前端测试、状态管理测试等。

## 1. 单元测试 ✅ 已完成

### 测试文件
`extension/src/agent/v1/tools/runners/__tests__/fetch-webpage.tool.test.ts`

### 测试覆盖
- ✅ 参数验证（5个测试）
  - 单个URL
  - 多个URL
  - URL数量限制
  - URL格式验证
  - 协议验证

- ✅ 内容获取（6个测试）
  - HTML内容获取
  - 纯文本内容
  - 不支持的内容类型
  - HTTP错误状态
  - 网络错误
  - 超时处理

- ✅ HTML处理（3个测试）
  - HTML转Markdown
  - 移除script/style标签
  - 提取main/article内容

- ✅ 查询过滤（3个测试）
  - 基于查询过滤内容
  - 包含上下文
  - 相关性评分排序

- ✅ 多URL处理（3个测试）
  - 并行获取
  - 部分成功
  - 全部失败

- ✅ 内容截断（2个测试）
  - 过长内容截断
  - 内容块数量限制

- ✅ XML输出格式（4个测试）
  - XML结构
  - XML特殊字符转义
  - 查询信息
  - 错误信息

- ✅ 边界情况（5个测试）
  - 空HTML
  - 格式错误的HTML
  - Unicode内容
  - 空查询
  - 不匹配的查询

- ✅ 日志记录（4个测试）
  - 获取开始日志
  - 成功完成日志
  - 内容截断警告
  - 错误日志

- ✅ 集成测试（1个测试）
  - 完整流程测试

### 测试结果
**36/36 测试通过** ✅

## 2. 集成测试

### 测试文件
`extension/src/agent/v1/tools/runners/__tests__/fetch-webpage.integration.test.ts`

### 测试覆盖
- 真实网络请求测试
  - GitHub README获取
  - MDN文档获取
  - 不存在的URL
  - 404错误处理

- 多URL并行获取测试
  - 并行性能验证
  - 部分失败处理

- 内容处理测试
  - HTML到Markdown转换
  - 查询过滤功能

- 错误处理和边界情况
  - 超时处理
  - 协议验证
  - URL数量限制

- XML输出格式测试
  - XML结构验证
  - 特殊字符转义

- 性能测试
  - 单URL获取时间
  - 大型页面处理

### 测试状态
⏳ 待执行（需要真实网络环境）

## 3. 前端UI测试

### 组件位置
`extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

### 测试项目
- [ ] FetchWebpageBlock组件渲染
  - [ ] URL显示和链接
  - [ ] 查询参数显示
  - [ ] 错误消息显示
  - [ ] 内容预览展开/折叠
  - [ ] 加载状态显示
  - [ ] 成功/错误状态样式

- [ ] 用户交互
  - [ ] 点击URL打开新标签页
  - [ ] 点击"Show/Hide Content"按钮
  - [ ] 内容滚动
  - [ ] 复制内容

- [ ] 状态管理
  - [ ] approvalState状态变化
  - [ ] 内容加载状态
  - [ ] 错误状态处理

### 测试文件（待创建）
`extension/webview-ui-vite/src/components/chat-row/__tests__/fetch-webpage-block.test.tsx`

## 4. 状态管理测试

### 测试范围
- [ ] 工具执行状态流转
  - [ ] pending → running → success
  - [ ] pending → running → error
  - [ ] 状态更新通知

- [ ] 消息传递
  - [ ] Extension → Webview消息
  - [ ] 工具结果更新
  - [ ] 错误消息传递

- [ ] 状态持久化
  - [ ] 任务历史记录
  - [ ] 工具执行记录

### 相关文件
- `extension/src/agent/v1/tools/tool-executor.ts`
- `extension/src/providers/webview/webview-manager.ts`
- `extension/webview-ui-vite/src/context/extension-state-context.tsx`

## 5. 工具与MainAgent交互测试

### 测试项目
- [ ] 工具注册和发现
  - [ ] 工具在tool-executor中正确注册
  - [ ] 工具schema正确导出
  - [ ] 工具prompt正确注册

- [ ] 工具执行流程
  - [ ] ask/say回调正确调用
  - [ ] updateAsk更新工具状态
  - [ ] 工具响应正确返回

- [ ] 错误处理
  - [ ] 工具执行异常捕获
  - [ ] 错误消息正确传递
  - [ ] 用户反馈处理

### 测试文件（待创建）
`extension/src/agent/v1/tools/__tests__/tool-executor-fetch-webpage.test.ts`

## 6. 端到端测试

### 测试场景
- [ ] 用户发起fetch webpage请求
- [ ] AI选择使用fetch_webpage工具
- [ ] 工具执行并返回结果
- [ ] 结果显示在UI中
- [ ] 用户查看和交互

### 测试步骤
1. 启动扩展
2. 发送包含URL的任务
3. 验证工具被调用
4. 验证结果正确显示
5. 验证用户可以交互

## 7. 性能测试

### 测试指标
- [ ] 单URL获取时间 < 10秒
- [ ] 多URL并行获取效率
- [ ] 内存使用情况
- [ ] 大型页面处理能力
- [ ] 并发请求处理

### 性能基准
- 单URL（example.com）: < 5秒
- 3个URL并行: < 15秒
- 大型页面（MDN）: < 30秒
- 内存使用: < 100MB

## 8. 安全测试

### 测试项目
- [ ] URL验证
  - [ ] 只允许HTTP/HTTPS
  - [ ] 拒绝本地文件路径
  - [ ] 拒绝内网IP

- [ ] 内容安全
  - [ ] XSS防护（移除script标签）
  - [ ] XML注入防护（特殊字符转义）
  - [ ] 内容大小限制

- [ ] 网络安全
  - [ ] 超时保护
  - [ ] 重定向限制
  - [ ] SSL证书验证

## 9. 兼容性测试

### 测试环境
- [ ] Windows
- [ ] macOS
- [ ] Linux

### 浏览器兼容性
- [ ] VSCode内置浏览器
- [ ] 外部浏览器链接

## 10. 回归测试

### 测试频率
- 每次代码修改后运行单元测试
- 每次发布前运行完整测试套件

### 自动化
- ✅ Jest单元测试自动化
- [ ] CI/CD集成
- [ ] 性能监控

## 测试执行命令

```bash
# 运行所有单元测试
cd extension && npx jest fetch-webpage.tool.test.ts

# 运行集成测试（需要网络）
cd extension && npx jest fetch-webpage.integration.test.ts

# 运行手动测试
cd extension && npx ts-node src/agent/v1/tools/runners/__tests__/fetch-webpage.manual-test.ts

# 运行所有测试
cd extension && npx jest --testPathPattern=fetch-webpage
```

## 已知问题和改进计划

### 当前问题
1. ⚠️ 集成测试需要真实网络环境
2. ⚠️ 前端UI测试尚未创建
3. ⚠️ 状态管理测试不完整

### 改进计划
1. **短期（1-2天）**
   - ✅ 完成单元测试
   - [ ] 创建前端UI测试
   - [ ] 添加状态管理测试

2. **中期（1周）**
   - [ ] 完善集成测试
   - [ ] 添加性能测试
   - [ ] 添加安全测试

3. **长期（持续）**
   - [ ] CI/CD集成
   - [ ] 性能监控
   - [ ] 用户反馈收集

## 测试覆盖率目标

- 单元测试覆盖率: ✅ 95%+
- 集成测试覆盖率: ⏳ 80%+
- 端到端测试覆盖率: ⏳ 70%+
- 总体覆盖率: ⏳ 85%+

