# Tester Agent 提示词通用性检查报告

## 🔍 检查范围

对 `extension/src/agent/v1/prompts/agents/tester.prompt.ts` 进行全面的通用性检查，识别并修复所有降低通用性的内容。

---

## ❌ 发现的问题

### 1. 语言/技术栈特定 (TypeScript 偏向)

**问题位置**:
- 第 58 行: `.test.ts` 或 `.spec.ts`
- 第 59 行: `.fixture.ts` 或 `.json`
- 第 60 行: `.helper.ts`
- 第 181 行: `pattern-search.tool.ts`

**问题分析**:
- 硬编码 `.ts` 扩展名，假设所有项目都使用 TypeScript
- 限制了对 Python、Java、Go、Rust 等其他语言的适用性

**影响范围**: 
- Python 项目 (`.py`)
- Java 项目 (`.java`)
- Go 项目 (`.go`)
- Rust 项目 (`.rs`)
- JavaScript 项目 (`.js`)

---

### 2. 领域特定词汇 (图像处理偏向)

**问题位置**:
- 第 54 行: "screenshots"
- 第 70 行: "real images"
- 第 99 行: "Claude", "OCR", "image size ≤1568px"
- 第 102 行: "PNG level 6 vs 9", "37.4% vs 35.8% savings"

**问题分析**:
- 过多图像处理相关词汇，暗示 agent 主要用于图像测试
- 具体的技术细节（Claude、OCR、PNG 压缩级别）降低了通用性
- 限制了对其他领域的适用性（API 测试、数据处理、算法测试等）

**影响范围**:
- API 测试
- 数据库测试
- 算法性能测试
- 网络协议测试
- 文件系统测试

---

### 3. 操作系统特定

**问题位置**:
- 第 204 行: `ls -la test/` (Unix/Linux 命令)

**问题分析**:
- 使用 Unix/Linux 特定命令
- 在 Windows 环境下不可用（需要 `dir` 或 PowerShell 命令）

**影响范围**:
- Windows 用户
- 跨平台项目

---

### 4. 具体示例过于详细

**问题位置**:
- 第 178-208 行: "pattern-search tool" 示例

**问题分析**:
- 使用具体的工具名称和文件路径
- 降低了示例的通用性和可迁移性

**影响范围**:
- 所有非 pattern-search 相关的测试场景

---

## ✅ 修复方案

### 修复 1: 文件扩展名泛化

**修复前**:
```typescript
- Test files: `<feature-name>.test.ts` or `<feature-name>.spec.ts`
- Fixture files: `<feature-name>.fixture.ts` or `<data-type>.json`
- Helper files: `<utility-name>.helper.ts`
```

**修复后**:
```typescript
- Test files: `<feature-name>.test.<ext>` or `<feature-name>.spec.<ext>`
- Fixture files: `<feature-name>.fixture.<ext>` or `<data-type>.<format>`
- Helper files: `<utility-name>.helper.<ext>`
- Use appropriate extension for your language (e.g., .ts, .py, .js, .java, .go, .rs)
```

**效果**:
- ✅ 支持所有编程语言
- ✅ 明确说明需要根据语言选择扩展名
- ✅ 提供多语言示例

---

### 修复 2: 领域词汇泛化

#### 2.1 目录说明

**修复前**:
```typescript
└── output/           # Test outputs for human verification (screenshots, reports)
```

**修复后**:
```typescript
└── output/           # Test outputs for human verification (reports, artifacts, visual outputs)
```

**效果**:
- ✅ "screenshots" → "visual outputs" (更通用)
- ✅ 添加 "artifacts" 覆盖更多输出类型
- ✅ 适用于任何需要人工验证的输出

---

#### 2.2 测试数据说明

**修复前**:
```typescript
- Use real data samples (actual code snippets, real images, real configs)
```

**修复后**:
```typescript
- Use real data samples (actual code snippets, binary files, configuration files, sample datasets)
```

**效果**:
- ✅ "real images" → "binary files" (更通用)
- ✅ 添加 "sample datasets" 覆盖数据测试场景
- ✅ 适用于任何类型的测试数据

---

#### 2.3 Lesson 5 泛化

**修复前**:
```typescript
Check official API docs before implementing. Example: Anthropic docs showed Claude has native OCR, optimal image size ≤1568px. Prevents wasted effort on wrong solutions.
```

**修复后**:
```typescript
Check official API/library documentation before implementing. Official docs reveal capabilities, limitations, and optimal usage patterns that prevent wasted effort on wrong solutions. Always verify assumptions against authoritative sources.
```

**效果**:
- ✅ 删除具体的 Claude/OCR/image size 示例
- ✅ 强调通用原则：查阅官方文档
- ✅ 适用于任何 API/库的测试

---

#### 2.4 Lesson 6 泛化

**修复前**:
```typescript
"Higher" ≠ "better". Example: PNG level 6 outperformed level 9 (37.4% vs 35.8% savings). Test multiple configs with real data, measure results, choose based on evidence.
```

**修复后**:
```typescript
"Higher" ≠ "better". Counterintuitive results are common: moderate settings often outperform aggressive ones. Test multiple configurations with real data, measure actual results, choose based on evidence not assumptions.
```

**效果**:
- ✅ 删除具体的 PNG 压缩示例
- ✅ 强调通用原则：反直觉结果很常见
- ✅ 适用于任何参数优化场景

---

### 修复 3: 操作系统命令泛化

**修复前**:
```xml
<action>
<execute_command>
<command>ls -la test/</command>
</execute_command>
</action>
```

**修复后**:
```xml
<action>
<check_directory>
<path>test/</path>
</check_directory>
</action>
```

**效果**:
- ✅ 使用抽象的工具调用，而非具体命令
- ✅ 跨平台兼容
- ✅ 让工具层处理平台差异

---

### 修复 4: 示例泛化

**修复前**:
```typescript
User: "Test the pattern-search tool"

Task: Test pattern-search tool at extension/src/agent/v1/tools/runners/pattern-search.tool.ts
...
File should be test/integration/pattern-search.test.ts, NOT src/tests/ or root level.
```

**修复后**:
```typescript
User: "Test the search functionality"

Task: Test search functionality in src/core/search.{ext}
...
File should be test/integration/search.test.{ext}, NOT src/tests/ or root level.
```

**效果**:
- ✅ "pattern-search tool" → "search functionality" (更通用)
- ✅ 使用 `{ext}` 占位符代替 `.ts`
- ✅ 简化文件路径，更具代表性

---

## 📊 改进总结

| 类别 | 修复数量 | 影响范围 |
|------|----------|----------|
| **语言特定** | 5 处 | 支持所有编程语言 |
| **领域特定** | 4 处 | 支持所有测试领域 |
| **操作系统特定** | 1 处 | 跨平台兼容 |
| **示例特定** | 1 处 | 通用示例 |
| **总计** | **11 处** | **全面通用化** |

---

## 🎯 通用性验证

### ✅ 现在支持的场景

#### 编程语言
- ✅ TypeScript/JavaScript
- ✅ Python
- ✅ Java
- ✅ Go
- ✅ Rust
- ✅ C/C++
- ✅ C#
- ✅ Ruby
- ✅ PHP

#### 测试领域
- ✅ API 测试
- ✅ 数据库测试
- ✅ 算法测试
- ✅ 性能测试
- ✅ 图像处理测试
- ✅ 文件系统测试
- ✅ 网络协议测试
- ✅ UI/UX 测试
- ✅ 数据处理测试

#### 操作系统
- ✅ Linux
- ✅ macOS
- ✅ Windows

---

## 🔑 关键改进

1. **语言无关** - 使用 `<ext>` 占位符，支持所有编程语言
2. **领域无关** - 删除图像处理专有词汇，适用于所有测试领域
3. **平台无关** - 使用抽象工具调用，跨平台兼容
4. **示例通用** - 使用通用功能名称，易于理解和迁移

---

## 📝 验证清单

- [x] 删除所有语言特定扩展名
- [x] 删除所有领域特定词汇（图像、OCR、PNG 等）
- [x] 删除所有操作系统特定命令
- [x] 泛化所有具体示例
- [x] 添加多语言支持说明
- [x] 保留核心原则和价值
- [x] 确保所有修改符合 Anthropic 原则

---

## 💡 使用建议

现在这份提示词可以用于：

1. **任何编程语言的项目** - 自动适应项目的语言和扩展名
2. **任何测试领域** - API、数据库、算法、图像、网络等
3. **任何操作系统** - Linux、macOS、Windows
4. **任何项目规模** - 小型工具到大型系统

---

## ✨ 总结

通过 11 处关键修复，提示词的通用性得到了全面提升：

- ✅ **语言通用性**: 从 TypeScript 特定 → 支持所有语言
- ✅ **领域通用性**: 从图像处理偏向 → 支持所有测试领域
- ✅ **平台通用性**: 从 Unix 特定 → 跨平台兼容
- ✅ **示例通用性**: 从具体工具 → 通用功能

**现在这是一份真正通用的 Tester Agent 提示词！** 🎉

