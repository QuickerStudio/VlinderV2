# 🤝 贡献指南

感谢你对 Vlinder 项目的关注！我们欢迎所有形式的贡献。

---

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [项目结构](#项目结构)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [问题反馈](#问题反馈)

---

## 🌟 行为准则

参与本项目即表示你同意遵守我们的行为准则：

- **尊重他人** - 尊重所有贡献者和用户
- **建设性反馈** - 提供有帮助的、建设性的反馈
- **包容性** - 欢迎不同背景和经验水平的贡献者
- **专业性** - 保持专业和友好的态度

---

## 🎯 如何贡献

你可以通过以下方式贡献：

### 1. 报告 Bug

在 [Issues](https://github.com/QuickerStudio/Vlinder/issues) 页面创建 Bug 报告。

### 2. 提出功能建议

在 [Discussions](https://github.com/QuickerStudio/Vlinder/discussions) 中讨论新功能。

### 3. 改进文档

文档改进总是受欢迎的！

### 4. 提交代码

修复 Bug 或实现新功能。

### 5. 帮助他人

在 Issues 和 Discussions 中帮助其他用户。

---

## 🛠️ 开发环境设置

### 前置要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **VS Code** >= 1.80.0
- **Git** >= 2.30.0

### 安装步骤

1. **Fork 仓库**

   点击 GitHub 页面右上角的 "Fork" 按钮。

2. **克隆仓库**

   ```bash
   git clone https://github.com/YOUR_USERNAME/Vlinder.git
   cd Vlinder
   ```

3. **安装依赖**

   ```bash
   cd extension
   pnpm install
   ```

4. **构建项目**

   ```bash
   pnpm run build
   ```

5. **运行开发模式**

   在 VS Code 中按 `F5` 启动调试。

### 验证安装

```bash
# 运行测试
pnpm run test

# 类型检查
pnpm run type-check

# 代码检查
pnpm run lint
```

---

## 📁 项目结构

```
vlinder/
├── .github/                # GitHub 配置
│   ├── workflows/          # CI/CD 工作流
│   └── docs/               # GitHub Actions 文档
├── docs/                   # 项目文档
│   ├── development/        # 开发文档
│   ├── deployment/         # 部署文档
│   ├── user-guide/         # 用户指南
│   └── archive/            # 归档文档
├── extension/              # VS Code 扩展核心代码
│   ├── src/                # 源代码
│   │   ├── extension.ts    # 扩展入口
│   │   ├── tools/          # 工具实现
│   │   ├── ui/             # UI 组件
│   │   └── utils/          # 工具函数
│   ├── assets/             # 资源文件
│   ├── webview-ui-vite/    # Webview UI
│   └── package.json        # 扩展配置
├── scripts/                # 实用脚本
├── tests/                  # 测试文件
│   ├── unit/               # 单元测试
│   ├── integration/        # 集成测试
│   └── fixtures/           # 测试数据
├── CHANGELOG.md            # 变更日志
├── CONTRIBUTING.md         # 本文件
├── LICENSE                 # 许可证
└── README.md               # 项目说明
```

### 核心目录说明

- **`extension/src/`** - 扩展的主要代码
- **`extension/webview-ui-vite/`** - Webview UI 代码
- **`docs/`** - 所有文档
- **`tests/`** - 所有测试

---

## 📝 代码规范

### TypeScript 规范

```typescript
// ✅ 好的示例
export interface UserConfig {
  name: string;
  age: number;
}

export function greetUser(config: UserConfig): string {
  return `Hello, ${config.name}!`;
}

// ❌ 不好的示例
export function greet(n: any) {
  return "Hello, " + n;
}
```

### 命名规范

- **文件名**: `kebab-case.ts`
- **类名**: `PascalCase`
- **函数名**: `camelCase`
- **常量**: `UPPER_SNAKE_CASE`
- **接口**: `PascalCase` (以 `I` 开头可选)

### 注释规范

```typescript
/**
 * 计算两个数的和
 * @param a 第一个数
 * @param b 第二个数
 * @returns 两数之和
 */
function add(a: number, b: number): number {
  return a + b;
}
```

### 代码格式化

项目使用 ESLint 和 Prettier：

```bash
# 检查代码
pnpm run lint

# 自动修复
pnpm run lint:fix

# 格式化
pnpm run format
```

---

## 💬 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

- **feat**: 新功能
- **fix**: Bug 修复
- **docs**: 文档更新
- **style**: 代码格式（不影响功能）
- **refactor**: 重构
- **perf**: 性能优化
- **test**: 测试相关
- **chore**: 构建/工具相关

### 示例

```bash
# 新功能
git commit -m "feat(tools): add new file search tool"

# Bug 修复
git commit -m "fix(ui): resolve button alignment issue"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(core): simplify error handling logic"
```

### 详细提交

```bash
git commit -m "feat(tools): add advanced search functionality

- Implement regex search
- Add file type filtering
- Support case-sensitive search

Closes #123"
```

---

## 🔄 Pull Request 流程

### 1. 创建分支

```bash
# 从 main 分支创建新分支
git checkout -b feature/your-feature-name

# 或者修复 Bug
git checkout -b fix/bug-description
```

### 2. 开发和测试

```bash
# 编写代码
# ...

# 运行测试
pnpm run test

# 代码检查
pnpm run lint

# 类型检查
pnpm run type-check
```

### 3. 提交更改

```bash
git add .
git commit -m "feat: your feature description"
```

### 4. 推送到 Fork

```bash
git push origin feature/your-feature-name
```

### 5. 创建 Pull Request

1. 访问你的 Fork 仓库
2. 点击 "Compare & pull request"
3. 填写 PR 描述：

```markdown
## 描述
简要描述你的更改

## 更改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 重构
- [ ] 其他

## 测试
描述你如何测试这些更改

## 截图（如适用）
添加截图

## 相关 Issue
Closes #123
```

### 6. 代码审查

- 等待维护者审查
- 根据反馈进行修改
- 保持 PR 更新

### 7. 合并

PR 被批准后，维护者会合并你的代码。

---

## 🐛 问题反馈

### Bug 报告

创建 Bug 报告时，请包含：

1. **问题描述** - 清晰描述问题
2. **复现步骤** - 如何复现问题
3. **预期行为** - 应该发生什么
4. **实际行为** - 实际发生了什么
5. **环境信息** - OS、VS Code 版本等
6. **截图/日志** - 如果适用

### 功能建议

创建功能建议时，请包含：

1. **问题/需求** - 你想解决什么问题
2. **建议方案** - 你的解决方案
3. **替代方案** - 其他可能的方案
4. **使用场景** - 谁会使用这个功能

---

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pnpm run test

# 运行特定测试
pnpm run test -- <test-file-pattern>

# 监听模式
pnpm run test:watch

# 覆盖率报告
pnpm run test:coverage
```

### 编写测试

```typescript
import { describe, it, expect } from '@jest/globals';
import { add } from './math';

describe('add', () => {
  it('should add two numbers correctly', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('should handle negative numbers', () => {
    expect(add(-1, -2)).toBe(-3);
  });
});
```

---

## 📚 资源

- [VS Code 扩展 API](https://code.visualstudio.com/api)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Jest 文档](https://jestjs.io/docs/getting-started)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 💡 提示

### 首次贡献？

- 从简单的 Issue 开始（标记为 `good first issue`）
- 阅读现有代码，了解项目风格
- 不要害怕提问！

### 需要帮助？

- 在 [Discussions](https://github.com/QuickerStudio/Vlinder/discussions) 中提问
- 查看 [文档](docs/)
- 联系维护者

---

## 🙏 感谢

感谢你的贡献！每一个贡献都让 Vlinder 变得更好。

---

**Happy Coding! 🦋**

