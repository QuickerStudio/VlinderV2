# Banner 拖拽功能使用指南

## 功能概述

这个功能允许用户从 VS Code 扩展的 webview 中拖拽 Banner 组件到打开的代码编辑器中，自动生成相应的代码并使用 prettier 格式化。

## 使用流程

1. **拖拽 Banner 图标** - 在扩展的 webview 中找到 Banner 组件
2. **拖拽到代码编辑器** - 将 Banner 拖拽到打开的代码文件中的任意位置
3. **自动调用 VS Code API** - 系统会自动识别拖拽操作并处理
4. **复制路径和处理** - Banner.tsx 组件会处理拖拽事件和 API 调用
5. **执行 prettier 格式化** - 插入代码后自动格式化
6. **显示通知** - 在 VS Code 右下角显示成功或错误通知

## 支持的文件类型

### React/TypeScript (.tsx, .jsx)
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

### Vue (.vue)
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

### HTML (.html)
```html
<div class="banner-container">
	<img 
		src="data:image/png;base64,YOUR_BASE64_STRING" 
		alt="Banner"
		class="max-w-full h-auto"
	/>
</div>
```

### JavaScript (.js, .ts)
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

## 技术实现

### 核心组件

1. **BannerDropEditProvider** (`src/integrations/MagicTools/magicr-banner.ts`)
   - 实现 VS Code 的 `DocumentDropEditProvider` API
   - 处理拖拽事件和 MIME 类型识别
   - 根据文件类型生成相应的代码

2. **FormatService** (`src/integrations/editor/format-service.ts`)
   - 集成 VS Code 的格式化功能
   - 支持文档和范围格式化
   - 提供格式化通知

3. **Banner 组件** (`webview-ui-vite/src/components/ui/Banner.tsx`)
   - 支持原生 HTML5 拖拽
   - 设置自定义 MIME 类型 `application/x-vscode-banner`
   - 提供拖拽视觉反馈

### 注册和激活

在 `src/extension.ts` 中注册：
```typescript
const bannerDropProvider = new BannerDropEditProvider()
context.subscriptions.push(
	vscode.languages.registerDocumentDropEditProvider(
		{ scheme: 'file' },
		bannerDropProvider
	)
)
```

## 自定义 MIME 类型

使用自定义 MIME 类型 `application/x-vscode-banner` 来识别 Banner 拖拽操作，确保只有 Banner 组件的拖拽会触发相应的处理逻辑。

## 错误处理和通知

- ✅ 成功插入并格式化时显示成功通知
- ⚠️ 插入成功但格式化失败时显示警告通知
- ❌ 插入失败时显示错误通知
- 🔧 提供手动格式化选项

## 测试

使用 `test-banner-drop.tsx` 文件测试拖拽功能：
1. 打开测试文件
2. 从 webview 拖拽 Banner 到文件中
3. 验证代码插入和格式化效果

## 注意事项

- 确保目标文件支持相应的语法
- 格式化功能依赖于 VS Code 的内置格式化器或已安装的格式化扩展
- 拖拽操作需要在 VS Code 编辑器中进行，不支持外部应用
