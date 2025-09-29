# 🎯 Banner 拖拽功能演示

## ✨ 功能特点

✅ **原生拖拽支持** - Banner 图标原生支持拖拽编程
✅ **智能代码生成** - 根据文件类型自动生成相应代码
✅ **自动格式化** - 使用 VS Code 内置格式化器自动格式化代码
✅ **实时通知** - 在 VS Code 右下角显示操作状态通知
✅ **多语言支持** - 支持 React、Vue、HTML、JavaScript 等多种文件类型

## 🔧 核心实现原理

### 1. HTML5 拖拽 API 基础

拖拽功能基于标准的 HTML5 Drag and Drop API 实现：

```typescript
// 拖拽开始事件
const handleDragStart = (event: React.DragEvent<HTMLImageElement>) => {
    // 设置拖拽数据
    event.dataTransfer.setData(BANNER_MIME_TYPE, JSON.stringify(bannerData))
    event.dataTransfer.setData("text/plain", fallbackText)
    event.dataTransfer.effectAllowed = "copy"
}

// 拖拽结束事件
const handleDragEnd = (event: React.DragEvent<HTMLImageElement>) => {
    // 恢复视觉状态
    event.currentTarget.style.opacity = "1"
}
```

### 2. VS Code DocumentDropEditProvider API

VS Code 提供了 `DocumentDropEditProvider` 接口来处理拖拽到编辑器的操作：

```typescript
interface DocumentDropEditProvider {
    provideDocumentDropEdits(
        document: TextDocument,
        position: Position,
        dataTransfer: DataTransfer,
        token: CancellationToken
    ): ProviderResult<DocumentDropEdit>
}
```

### 3. 自定义 MIME 类型识别

使用自定义 MIME 类型 `application/x-vscode-banner` 确保只有 Banner 组件触发处理：

```typescript
export const BANNER_MIME_TYPE = "application/x-vscode-banner"

// 检查拖拽数据
const bannerData = dataTransfer.get(BANNER_MIME_TYPE)
if (!bannerData) {
    return undefined // 不是 Banner 拖拽，忽略
}
```

## 🚀 使用步骤

### 1. 拖拽 BANNER 图标
在扩展的 webview 界面中找到 Banner 组件，鼠标悬停会显示拖拽提示

### 2. 拖拽到代码编辑器
将 Banner 拖拽到任意打开的代码文件中的目标位置

### 3. 自动处理
- 🔄 调用 VS Code API
- 📋 复制路径信息  
- 🎨 Banner.tsx 执行逻辑处理事件和 API
- ✨ 执行 prettier 格式化代码
- 📢 VS Code 右下角显示通知

## 📁 支持的文件类型

| 文件类型 | 扩展名 | 生成代码类型 |
|---------|--------|-------------|
| React | `.tsx`, `.jsx` | React 函数组件 |
| Vue | `.vue` | Vue 3 Composition API |
| HTML | `.html` | 标准 HTML 标签 |
| JavaScript | `.js`, `.ts` | DOM 操作函数 |
| 其他 | `.*` | 通用注释格式 |

## 📚 所需 VS Code API 详解

### 1. DocumentDropEditProvider 注册

```typescript
// 在 extension.ts 中注册
vscode.languages.registerDocumentDropEditProvider(
    { scheme: 'file' }, // 文档选择器
    bannerDropProvider  // 提供者实例
)
```

### 2. WorkspaceEdit API

用于创建文档编辑操作：

```typescript
// 创建工作区编辑
const edit = new vscode.WorkspaceEdit()
edit.insert(document.uri, position, bannerCode)

// 创建拖拽编辑
const dropEdit = new vscode.DocumentDropEdit(edit)
dropEdit.title = "Insert Banner Component"
dropEdit.kind = vscode.DocumentDropEditKind.Create
```

### 3. 格式化相关 API

```typescript
// 执行文档格式化
await vscode.commands.executeCommand("editor.action.formatDocument")

// 执行选择区域格式化
await vscode.commands.executeCommand("editor.action.formatSelection")

// 获取格式化提供者
const providers = await vscode.languages.getDocumentFormattingEdits(
    document,
    formattingOptions,
    cancellationToken
)
```

### 4. 通知 API

```typescript
// 信息通知
vscode.window.showInformationMessage("✅ 操作成功！")

// 警告通知
vscode.window.showWarningMessage("⚠️ 警告信息", "操作按钮")

// 错误通知
vscode.window.showErrorMessage("❌ 错误信息")
```

### 5. 文档和编辑器 API

```typescript
// 获取活动编辑器
const editor = vscode.window.activeTextEditor

// 文档操作
const document = editor.document
const selection = editor.selection
const text = document.getText()

// 位置和范围
const position = new vscode.Position(line, character)
const range = new vscode.Range(startPos, endPos)
```

## 🛠️ 技术架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Banner.tsx    │───▶│ DocumentDrop     │───▶│ FormatService   │
│   (拖拽源)       │    │ EditProvider     │    │   (格式化)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ HTML5 Drag API  │    │ VS Code API      │    │ VS Code Format  │
│ (MIME 类型)      │    │ (文档编辑)        │    │ (代码美化)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔄 完整数据流程

### 阶段 1: 拖拽初始化
```typescript
// Banner.tsx - 拖拽开始
handleDragStart(event) {
    const bannerData = {
        src: imageSource,
        alt: "Banner",
        className: cssClasses,
        style: inlineStyles
    }

    // 设置自定义 MIME 类型数据
    event.dataTransfer.setData(
        "application/x-vscode-banner",
        JSON.stringify(bannerData)
    )

    // 设置拖拽效果
    event.dataTransfer.effectAllowed = "copy"
}
```

### 阶段 2: VS Code 拖拽检测
```typescript
// magicr-banner.ts - 拖拽处理
async provideDocumentDropEdits(document, position, dataTransfer, token) {
    // 检查是否为 Banner 拖拽
    const bannerData = dataTransfer.get(BANNER_MIME_TYPE)
    if (!bannerData) return undefined

    // 解析拖拽数据
    const bannerInfo = JSON.parse(bannerData.value)

    // 根据文件类型生成代码
    const fileExtension = document.fileName.split('.').pop()
    const bannerCode = this.generateBannerCode(bannerInfo, fileExtension)

    return new vscode.DocumentDropEdit(workspaceEdit)
}
```

### 阶段 3: 代码生成
```typescript
// 根据文件类型生成相应代码
generateBannerCode(bannerInfo, fileExtension) {
    switch (fileExtension) {
        case 'tsx':
        case 'jsx':
            return this.generateReactBannerCode(bannerInfo)
        case 'vue':
            return this.generateVueBannerCode(bannerInfo)
        case 'html':
            return this.generateHtmlBannerCode(bannerInfo)
        case 'ts':
        case 'js':
            return this.generateJavaScriptBannerCode(bannerInfo)
        default:
            return this.generateGenericBannerCode(bannerInfo)
    }
}
```

### 阶段 4: 格式化处理
```typescript
// FormatService.ts - 格式化服务
scheduleFormatting(document, position, insertedCode) {
    setTimeout(async () => {
        // 计算插入代码的范围
        const lines = insertedCode.split('\n')
        const endPosition = new vscode.Position(
            position.line + lines.length - 1,
            lines[lines.length - 1].length
        )
        const insertedRange = new vscode.Range(position, endPosition)

        // 检查格式化支持
        const supportsFormatting = await FormatService.supportsFormatting(document)

        if (supportsFormatting) {
            await FormatService.formatRange(document, insertedRange)
        }
    }, 100) // 延迟确保编辑已应用
}
```

### 阶段 5: 通知反馈
```typescript
// 成功通知
vscode.window.showInformationMessage(
    "✅ Banner inserted and code formatted successfully!",
    { modal: false }
)

// 错误通知
vscode.window.showErrorMessage(
    `❌ Banner inserted but formatting failed: ${error.message}`,
    { modal: false }
)
```

## 🎨 代码生成模板

### React 组件生成
```tsx
import React from "react"

const Banner: React.FC = () => {
	return (
		<div className="banner-container">
			<img
				src="data:image/png;base64,YOUR_BASE64_STRING"
				alt="Banner"
				className="max-w-full h-auto"
				style={{}}
			/>
		</div>
	)
}

export default Banner
```

### Vue 组件生成
```vue
<template>
	<div class="banner-container">
		<img
			:src="bannerSrc"
			:alt="bannerAlt"
			:class="bannerClass"
			:style="bannerStyle"
		/>
	</div>
</template>

<script setup lang="ts">
const bannerSrc = "data:image/png;base64,YOUR_BASE64_STRING"
const bannerAlt = "Banner"
const bannerClass = "max-w-full h-auto"
const bannerStyle = {}
</script>
```

### HTML 标签生成
```html
<div class="banner-container">
	<img
		src="data:image/png;base64,YOUR_BASE64_STRING"
		alt="Banner"
		class="max-w-full h-auto"
	/>
</div>
```

### JavaScript 函数生成
```javascript
// Banner component creation
function createBanner() {
	const bannerContainer = document.createElement('div')
	bannerContainer.className = 'banner-container'

	const bannerImg = document.createElement('img')
	bannerImg.src = 'data:image/png;base64,YOUR_BASE64_STRING'
	bannerImg.alt = 'Banner'
	bannerImg.className = 'max-w-full h-auto'

	bannerContainer.appendChild(bannerImg)
	return bannerContainer
}

// Usage: document.body.appendChild(createBanner())
```

## 📢 通知系统

- ✅ **成功通知**: "Banner 插入并格式化成功！"
- ⚠️ **警告通知**: "Banner 已插入，但此文件类型不支持自动格式化"
- ❌ **错误通知**: "Banner 插入失败：[错误信息]"

## 🧪 测试方法

1. 打开 `test-banner-drop.tsx` 文件
2. 从 webview 拖拽 Banner 组件到文件中
3. 观察代码插入和格式化效果
4. 检查右下角通知消息

## 🔧 关键技术细节

### 1. MIME 类型数据传输

```typescript
// 设置拖拽数据
event.dataTransfer.setData(BANNER_MIME_TYPE, JSON.stringify({
    src: "data:image/png;base64,...",
    alt: "Banner",
    className: "max-w-full h-auto",
    style: { width: "100%" }
}))

// 获取拖拽数据
const bannerData = dataTransfer.get(BANNER_MIME_TYPE)
const bannerInfo = JSON.parse(bannerData.value)
```

### 2. 文件类型检测

```typescript
// 从文档路径提取文件扩展名
const fileExtension = document.fileName.split('.').pop()?.toLowerCase()

// 根据扩展名选择代码生成器
const codeGenerator = {
    'tsx': this.generateReactBannerCode,
    'jsx': this.generateReactBannerCode,
    'vue': this.generateVueBannerCode,
    'html': this.generateHtmlBannerCode,
    'js': this.generateJavaScriptBannerCode,
    'ts': this.generateJavaScriptBannerCode
}[fileExtension] || this.generateGenericBannerCode
```

### 3. 异步格式化调度

```typescript
// 使用 setTimeout 确保编辑操作完成后再格式化
setTimeout(async () => {
    try {
        const supportsFormatting = await FormatService.supportsFormatting(document)
        if (supportsFormatting) {
            await FormatService.formatRange(document, insertedRange)
        } else {
            FormatService.showFormattingNotification(false, fileName)
        }
    } catch (error) {
        console.error("Formatting error:", error)
        vscode.window.showErrorMessage(`格式化失败: ${error.message}`)
    }
}, 100) // 100ms 延迟确保编辑已应用
```

### 4. 格式化支持检测

```typescript
// 检查文档是否支持格式化
static async supportsFormatting(document: vscode.TextDocument): Promise<boolean> {
    try {
        const providers = await vscode.languages.getDocumentFormattingEdits(
            document,
            { insertSpaces: true, tabSize: 2 },
            new vscode.CancellationTokenSource().token
        )
        return providers !== undefined && providers.length > 0
    } catch (error) {
        return false
    }
}
```

### 5. 错误处理机制

```typescript
// 多层错误处理
try {
    // 主要操作
    const bannerCode = this.generateBannerCode(bannerInfo, fileExtension)
    if (!bannerCode) {
        vscode.window.showErrorMessage("不支持此文件类型的 Banner 组件")
        return undefined
    }

    // 创建编辑操作
    const edit = new vscode.WorkspaceEdit()
    edit.insert(document.uri, position, bannerCode)

    // 调度格式化
    this.scheduleFormatting(document, position, bannerCode)

} catch (error) {
    console.error("Banner drop error:", error)
    vscode.window.showErrorMessage(`拖拽失败: ${error.message}`)
    return undefined
}
```

## 🎯 性能优化策略

### 1. 延迟格式化
- 使用 `setTimeout` 避免阻塞拖拽操作
- 确保文档编辑完成后再执行格式化

### 2. 条件格式化
- 检测格式化支持避免无效调用
- 提供降级通知机制

### 3. 内存管理
- 及时清理事件监听器
- 避免内存泄漏

## 🔧 自定义配置

### Banner 组件属性
```typescript
interface BannerProps {
    className?: string           // CSS 类名
    style?: React.CSSProperties  // 内联样式
    draggable?: boolean         // 是否启用拖拽（默认 true）
}
```

### 拖拽数据结构
```typescript
interface BannerDragData {
    src: string                 // 图片源地址
    alt: string                 // 替代文本
    className: string           // CSS 类名
    style: React.CSSProperties  // 内联样式
}
```

## 📝 注意事项

- ✅ 需要在 VS Code 环境中使用
- ✅ 格式化功能依赖于已安装的格式化扩展
- ✅ 自定义 MIME 类型确保只有 Banner 组件触发处理逻辑
- ✅ 支持撤销操作（Ctrl+Z）
- ✅ 兼容 VS Code 1.96.0+ 版本
- ✅ 支持多工作区环境
- ✅ 自动检测文件编码格式

## 📖 完整 API 参考

### VS Code Extension API

#### 1. DocumentDropEditProvider 接口
```typescript
interface DocumentDropEditProvider {
    /**
     * 提供拖拽编辑操作
     * @param document 目标文档
     * @param position 拖拽位置
     * @param dataTransfer 拖拽数据传输对象
     * @param token 取消令牌
     */
    provideDocumentDropEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        dataTransfer: vscode.DataTransfer,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentDropEdit>
}
```

#### 2. DocumentDropEdit 类
```typescript
class DocumentDropEdit {
    /**
     * 创建拖拽编辑操作
     * @param insertText 要插入的文本
     */
    constructor(insertText: string)

    /**
     * 创建拖拽编辑操作（使用工作区编辑）
     * @param edit 工作区编辑对象
     */
    constructor(edit: vscode.WorkspaceEdit)

    /** 编辑操作的标题 */
    title?: string

    /** 编辑操作的类型 */
    kind?: vscode.DocumentDropEditKind

    /** 编辑操作的优先级 */
    priority?: number
}
```

#### 3. DataTransfer 接口
```typescript
interface DataTransfer {
    /**
     * 获取指定 MIME 类型的数据
     * @param mimeType MIME 类型
     */
    get(mimeType: string): vscode.DataTransferItem | undefined

    /**
     * 设置指定 MIME 类型的数据
     * @param mimeType MIME 类型
     * @param value 数据值
     */
    set(mimeType: string, value: vscode.DataTransferItem): void

    /**
     * 遍历所有数据项
     */
    forEach(callback: (item: vscode.DataTransferItem, mimeType: string) => void): void
}
```

#### 4. WorkspaceEdit 类
```typescript
class WorkspaceEdit {
    /**
     * 在指定位置插入文本
     * @param uri 文档 URI
     * @param position 插入位置
     * @param newText 要插入的文本
     */
    insert(uri: vscode.Uri, position: vscode.Position, newText: string): void

    /**
     * 替换指定范围的文本
     * @param uri 文档 URI
     * @param range 替换范围
     * @param newText 新文本
     */
    replace(uri: vscode.Uri, range: vscode.Range, newText: string): void

    /**
     * 删除指定范围的文本
     * @param uri 文档 URI
     * @param range 删除范围
     */
    delete(uri: vscode.Uri, range: vscode.Range): void
}
```

### HTML5 Drag and Drop API

#### 1. DragEvent 接口
```typescript
interface DragEvent extends MouseEvent {
    /** 拖拽数据传输对象 */
    readonly dataTransfer: DataTransfer | null

    /** 拖拽效果 */
    readonly effectAllowed: string

    /** 拖拽操作类型 */
    readonly dropEffect: string
}
```

#### 2. DataTransfer 对象（HTML5）
```typescript
interface DataTransfer {
    /**
     * 设置拖拽数据
     * @param format 数据格式/MIME类型
     * @param data 数据内容
     */
    setData(format: string, data: string): void

    /**
     * 获取拖拽数据
     * @param format 数据格式/MIME类型
     */
    getData(format: string): string

    /** 允许的拖拽效果 */
    effectAllowed: string

    /** 当前拖拽效果 */
    dropEffect: string

    /** 拖拽的文件列表 */
    readonly files: FileList

    /** 拖拽项目列表 */
    readonly items: DataTransferItemList
}
```

## 🔍 调试和故障排除

### 1. 启用调试日志
```typescript
// 在 Banner.tsx 中添加调试日志
console.log("Banner drag started with data:", bannerData)
console.log("Drag effect allowed:", event.dataTransfer.effectAllowed)

// 在 magicr-banner.ts 中添加调试日志
console.log("Drop detected, MIME type:", BANNER_MIME_TYPE)
console.log("Banner data received:", bannerInfo)
console.log("Target file extension:", fileExtension)
```

### 2. 常见问题解决

#### 问题：拖拽无响应
```typescript
// 检查 MIME 类型是否正确设置
const bannerData = dataTransfer.get(BANNER_MIME_TYPE)
if (!bannerData) {
    console.warn("No banner data found, MIME type:", BANNER_MIME_TYPE)
    return undefined
}
```

#### 问题：格式化失败
```typescript
// 检查格式化支持
const supportsFormatting = await FormatService.supportsFormatting(document)
console.log("Document supports formatting:", supportsFormatting)

if (!supportsFormatting) {
    console.warn("No formatting provider available for:", document.languageId)
}
```

#### 问题：代码生成错误
```typescript
// 验证文件扩展名检测
const fileExtension = document.fileName.split('.').pop()?.toLowerCase()
console.log("Detected file extension:", fileExtension)

// 验证代码生成器选择
const hasGenerator = this.codeGenerators.hasOwnProperty(fileExtension)
console.log("Has code generator for extension:", hasGenerator)
```

### 3. 性能监控
```typescript
// 测量拖拽处理时间
const startTime = Date.now()
const bannerCode = this.generateBannerCode(bannerInfo, fileExtension)
const generationTime = Date.now() - startTime
console.log(`Code generation took ${generationTime}ms`)

// 测量格式化时间
const formatStartTime = Date.now()
await FormatService.formatRange(document, insertedRange)
const formatTime = Date.now() - formatStartTime
console.log(`Formatting took ${formatTime}ms`)
```

## ⚙️ 扩展配置

### package.json 配置
```json
{
    "name": "automatic-iterator",
    "engines": {
        "vscode": "^1.96.0"
    },
    "activationEvents": [
        "onStartupFinished"
    ],
    "contributes": {
        "commands": [],
        "configuration": {
            "title": "Banner Drag Drop",
            "properties": {
                "bannerDragDrop.enableFormatting": {
                    "type": "boolean",
                    "default": true,
                    "description": "Enable automatic code formatting after banner insertion"
                },
                "bannerDragDrop.showNotifications": {
                    "type": "boolean",
                    "default": true,
                    "description": "Show notifications for banner operations"
                },
                "bannerDragDrop.supportedFileTypes": {
                    "type": "array",
                    "default": ["tsx", "jsx", "vue", "html", "js", "ts"],
                    "description": "File types that support banner insertion"
                }
            }
        }
    }
}
```

### 扩展激活配置
```typescript
// extension.ts - 激活事件
export function activate(context: vscode.ExtensionContext) {
    // 注册 Banner Drop Edit Provider
    const bannerDropProvider = new BannerDropEditProvider()
    context.subscriptions.push(
        vscode.languages.registerDocumentDropEditProvider(
            { scheme: 'file' }, // 支持所有文件
            bannerDropProvider
        )
    )

    // 注册配置变更监听
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('bannerDragDrop')) {
                // 重新加载配置
                bannerDropProvider.reloadConfiguration()
            }
        })
    )
}
```

## 🚀 部署和分发

### 1. 构建扩展
```bash
# 安装依赖
pnpm install

# 编译 TypeScript
pnpm run compile

# 构建 webview
pnpm run build:webview

# 打包扩展
pnpm run package
```

### 2. 测试扩展
```bash
# 启动开发模式
pnpm run watch

# 在 VS Code 中按 F5 启动扩展开发主机
# 或者使用命令行
code --extensionDevelopmentPath=. --new-window
```

### 3. 发布扩展
```bash
# 发布到 VS Code Marketplace
pnpm run publish

# 或发布预发布版本
pnpm run publish:pre-release
```

## 📊 功能特性总结

| 特性 | 实现状态 | 技术栈 | 说明 |
|------|---------|--------|------|
| 🎯 拖拽识别 | ✅ 完成 | HTML5 Drag API | 自定义 MIME 类型识别 |
| 🔧 代码生成 | ✅ 完成 | TypeScript | 支持多种文件类型 |
| ✨ 自动格式化 | ✅ 完成 | VS Code API | 集成内置格式化器 |
| 📢 通知系统 | ✅ 完成 | VS Code API | 成功/警告/错误通知 |
| 🎨 视觉反馈 | ✅ 完成 | CSS + React | 拖拽状态指示 |
| 🔄 错误处理 | ✅ 完成 | Try-Catch | 多层错误捕获 |
| ⚡ 性能优化 | ✅ 完成 | 异步处理 | 延迟格式化策略 |
| 🧪 调试支持 | ✅ 完成 | Console API | 详细日志记录 |

## 🎓 学习资源

### VS Code 扩展开发
- [VS Code Extension API](https://code.visualstudio.com/api)
- [DocumentDropEditProvider 文档](https://code.visualstudio.com/api/references/vscode-api#DocumentDropEditProvider)
- [Webview API 指南](https://code.visualstudio.com/api/extension-guides/webview)

### HTML5 拖拽 API
- [MDN Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [DataTransfer 接口](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer)

### React 拖拽实现
- [React DnD 库](https://react-dnd.github.io/react-dnd/)
- [React 拖拽事件处理](https://reactjs.org/docs/events.html#drag-events)

---

**🎉 恭喜！您已经完成了一个功能完整的 Banner 拖拽功能实现。这个功能展示了如何将 HTML5 拖拽 API 与 VS Code 扩展 API 完美结合，创造出流畅的用户体验。**
