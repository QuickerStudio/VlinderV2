# 自动安装格式化器功能 🚀

## 🎯 功能概述

当Banner拖拽格式化功能检测到系统中没有相应的格式化器时，会自动提示用户安装推荐的格式化扩展，让格式化功能开箱即用！

## ✨ 新功能特性

### 1. 智能检测格式化器
```typescript
private async checkFormatterAvailable(document: vscode.TextDocument): Promise<boolean> {
    // 检查Prettier扩展是否已安装
    const prettierExtension = vscode.extensions.getExtension('esbenp.prettier-vscode')
    
    // 对于前端文件，检查Prettier扩展
    const frontendLanguages = ['javascript', 'typescript', 'typescriptreact', 'javascriptreact', 'css', 'scss', 'html', 'json', 'markdown']
    if (frontendLanguages.includes(document.languageId)) {
        return prettierExtension !== undefined
    }
    
    return true
}
```

### 2. 友好的安装提示
当检测到缺少格式化器时，系统会显示：
- 📋 **详细说明**: 解释为什么需要安装格式化器
- 🎯 **推荐扩展**: 根据文件类型推荐最合适的扩展
- 🚀 **一键安装**: 点击按钮即可自动安装

### 3. 自动安装流程
```typescript
private async promptAndInstallFormatter(languageId: string): Promise<boolean> {
    const choice = await vscode.window.showWarningMessage(
        `未找到 ${languageDisplayName} 文件的格式化器`,
        {
            modal: true,
            detail: `为了格式化 ${languageDisplayName} 文件，建议安装 ${formatterInfo.name} 扩展。`
        },
        '安装格式化器',
        '取消'
    )

    if (choice === '安装格式化器') {
        await vscode.commands.executeCommand('workbench.extensions.installExtension', formatterInfo.extensionId)
        return true
    }
    return false
}
```

## 📊 推荐的格式化器

### 前端开发
| 文件类型 | 推荐扩展 | 扩展ID |
|----------|----------|--------|
| JavaScript/TypeScript | Prettier - Code formatter | `esbenp.prettier-vscode` |
| TSX/JSX | Prettier - Code formatter | `esbenp.prettier-vscode` |
| CSS/SCSS | Prettier - Code formatter | `esbenp.prettier-vscode` |
| HTML | Prettier - Code formatter | `esbenp.prettier-vscode` |
| JSON | Prettier - Code formatter | `esbenp.prettier-vscode` |
| Vue | Prettier - Code formatter | `esbenp.prettier-vscode` |

### 后端开发
| 文件类型 | 推荐扩展 | 扩展ID |
|----------|----------|--------|
| Python | Python | `ms-python.python` |
| Java | Extension Pack for Java | `vscjava.vscode-java-pack` |
| C# | C# Dev Kit | `ms-dotnettools.csdevkit` |
| Go | Go | `golang.go` |

## 🔄 完整的用户体验流程

### 场景1: 已安装格式化器
1. 用户拖拽Banner到代码文件
2. 系统检测到格式化器可用
3. 直接执行格式化
4. 显示成功消息

### 场景2: 未安装格式化器
1. 用户拖拽Banner到代码文件
2. 系统检测到缺少格式化器
3. 弹出安装提示对话框
4. 用户点击"安装格式化器"
5. 自动下载并安装推荐扩展
6. 安装完成后执行格式化
7. 显示安装成功和格式化完成消息

### 场景3: 用户取消安装
1. 用户拖拽Banner到代码文件
2. 系统检测到缺少格式化器
3. 弹出安装提示对话框
4. 用户点击"取消"
5. 显示友好的取消消息

## 💡 智能推荐算法

```typescript
private getRecommendedFormatter(languageId: string): { name: string, extensionId: string } {
    // 前端文件推荐Prettier
    const frontendLanguages = ['javascript', 'typescript', 'typescriptreact', 'javascriptreact', 'css', 'scss', 'html', 'json', 'markdown', 'vue']
    if (frontendLanguages.includes(languageId)) {
        return {
            name: 'Prettier - Code formatter',
            extensionId: 'esbenp.prettier-vscode'
        }
    }
    
    // 根据语言类型推荐专门的扩展
    // Python -> Python扩展
    // Java -> Java扩展包
    // C# -> C# Dev Kit
    // Go -> Go扩展
    
    // 默认推荐Prettier（支持多种格式）
    return {
        name: 'Prettier - Code formatter',
        extensionId: 'esbenp.prettier-vscode'
    }
}
```

## 🎯 用户界面设计

### 安装提示对话框
```
⚠️ 未找到 TypeScript React (TSX) 文件的格式化器

为了格式化 TypeScript React (TSX) 文件，建议安装 Prettier - Code formatter 扩展。

点击"安装"将自动安装推荐的格式化器。

[安装格式化器]  [取消]
```

### 安装进度提示
```
🔄 正在安装 Prettier - Code formatter...
├── 准备安装 (30%)
└── 安装完成 (100%)
```

### 成功消息
```
✅ Prettier - Code formatter 安装成功！现在可以格式化 TypeScript React (TSX) 文件了。
```

## 🛠️ 技术实现细节

### 1. 扩展检测
使用VS Code API检测扩展是否已安装：
```typescript
const prettierExtension = vscode.extensions.getExtension('esbenp.prettier-vscode')
```

### 2. 自动安装
使用VS Code命令安装扩展：
```typescript
await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId)
```

### 3. 进度反馈
使用Progress API显示安装进度：
```typescript
await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `正在安装 ${formatterInfo.name}...`,
    cancellable: false
}, async (progress) => {
    // 安装逻辑
})
```

## 🎉 优势总结

1. **零配置体验**: 用户无需手动搜索和安装扩展
2. **智能推荐**: 根据文件类型推荐最合适的格式化器
3. **一键安装**: 简化安装流程，提高用户体验
4. **友好提示**: 清晰的说明和进度反馈
5. **错误处理**: 完善的错误处理和回退机制

现在Banner拖拽格式化功能真正做到了开箱即用！🚀
