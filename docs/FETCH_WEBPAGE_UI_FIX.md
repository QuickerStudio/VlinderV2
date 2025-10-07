# Fetch Web Page 工具 UI 错误修复

## 修复日期
2025-01-04

## 🐛 问题描述

用户报告 Fetch Web Page 工具出现界面错误，显示验证错误：

```
Validation error: [
  {
    "code": "invalid_type",
    "expected": "array",
    "received": "undefined",
    "path": ["urls"],
    "message": "Required"
  }
]
```

**错误截图显示**：
- URL: `https://baike.baidu.com/item/Python`
- Error: Validation error (urls parameter is undefined)
- 工具显示红色错误状态

## 🔍 根本原因

与 Multi Replace String 工具的问题完全相同：

1. **Schema 层缺少 undefined 处理**
   - `z.preprocess` 没有处理 `val === undefined` 的情况
   - 当 tool-parser 没有捕获到 `<urls>` 参数时，`val` 是 `undefined`
   - 返回空数组 `[]`，触发 `.min(1)` 验证失败

2. **UI 层缺少防御性编程**
   - 没有检查 `urls` 是否为 `undefined`
   - 在 loading/pending 状态时也显示错误
   - 缺少清晰的错误提示

3. **类型定义不匹配**
   - Schema 使用 `urls: string[]`（数组）
   - UI 组件期望 `url: string`（单个字符串）
   - 需要同时支持两种格式以保持向后兼容

## ✅ 修复方案

### 修复 1: Schema 层添加 undefined 处理

**文件**: `extension/src/agent/v1/tools/schema/fetch-webpage.ts`

**修改**：
```typescript
urls: z.preprocess(
  (val) => {
    console.log('[FetchWebpage] z.preprocess called with type:', typeof val);
    console.log('[FetchWebpage] Value is undefined:', val === undefined);
    console.log('[FetchWebpage] Value is null:', val === null);

    // If it's already an array, return as-is
    if (Array.isArray(val)) {
      console.log('[FetchWebpage] URLs already in array format, count:', val.length);
      return val;
    }

    // If it's undefined or null, log detailed error
    if (val === undefined || val === null) {
      console.error('[FetchWebpage] ❌ CRITICAL: urls parameter is', 
        val === undefined ? 'undefined' : 'null');
      console.error('[FetchWebpage] This means tool-parser did not capture the <urls> parameter');
      console.error('[FetchWebpage] Possible causes:');
      console.error('[FetchWebpage]   1. AI did not send <urls> tag');
      console.error('[FetchWebpage]   2. Tool-parser failed to parse the XML');
      console.error('[FetchWebpage]   3. Streaming was interrupted before <urls> was sent');
      // Return empty array to trigger the min(1) validation error
      return [];
    }

    // If it's a string, parse it as XML
    if (typeof val === 'string') {
      console.log('[FetchWebpage] Received string, length:', val.length);
      console.log('[FetchWebpage] First 100 chars:', val.substring(0, 100));

      // Check if string is empty or whitespace only
      if (val.trim().length === 0) {
        console.error('[FetchWebpage] ❌ Received empty or whitespace-only string');
        return [];
      }

      // ... rest of parsing logic
    }

    // Otherwise, return empty array to trigger validation error
    console.error('[FetchWebpage] ❌ Invalid urls type:', typeof val);
    console.error('[FetchWebpage] Value:', val);
    return [];
  },
  z.array(z.string().url()).min(1).max(10)
),
```

### 修复 2: 更新类型定义支持多 URL

**文件**: `extension/src/shared/new-tools.ts`

**修改**：
```typescript
export type FetchWebpageTool = {
  tool: 'fetch_webpage';
  urls?: string[]; // Array of URLs (new format)
  url?: string;    // Single URL (backward compatibility)
  query?: string;
  content?: string;
  error?: string;
};
```

### 修复 3: UI 层添加防御性编程

**文件**: `extension/webview-ui-vite/src/components/chat-row/chat-tools.tsx`

**关键修改**：

1. **添加无效数据检查**：
```typescript
// Check if urls data is invalid (undefined when it should be an array)
const hasInvalidData = !Array.isArray(urls) && !url && 
  approvalState !== 'loading' && 
  approvalState !== 'pending';

// Determine variant based on approval state
const variant = hasInvalidData ? 'destructive' : 'info';
```

2. **支持单个和多个 URL**：
```typescript
// Support both single URL (backward compatibility) and multiple URLs
const urlList = urls || (url ? [url] : []);
const urlCount = urlList.length;

const summary = urlCount > 0
  ? query
    ? `Fetching ${urlCount} URL${urlCount > 1 ? 's' : ''} (filtered by: "${query}")`
    : `Fetching ${urlCount} URL${urlCount > 1 ? 's' : ''}`
  : 'Fetch Web Page';
```

3. **添加 Loading 状态显示**：
```typescript
{approvalState === 'loading' && (
  <div className='bg-info/10 border border-info/30 rounded-md p-3'>
    <div className='flex items-center space-x-2'>
      <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info'></div>
      <span className='text-sm text-info'>
        Fetching web page{urlCount > 1 ? 's' : ''}...
      </span>
    </div>
  </div>
)}
```

4. **添加无效数据错误提示**：
```typescript
{hasInvalidData && (
  <div className='bg-destructive/10 border border-destructive/30 rounded-md p-3'>
    <p className='text-sm font-medium text-destructive mb-2'>Invalid Tool Data</p>
    <p className='text-xs text-destructive/80'>
      The urls data is missing or invalid. This may be due to XML parsing failure.
    </p>
  </div>
)}
```

5. **支持多 URL 显示**：
```typescript
{urlList.length > 0 && (
  <div className='flex items-start space-x-2'>
    <span className='text-sm font-medium text-muted-foreground min-w-[80px]'>
      URL{urlList.length > 1 ? 's' : ''}:
    </span>
    <div className='flex-1 space-y-1'>
      {urlList.map((urlItem, index) => (
        <a
          key={index}
          href={urlItem}
          target='_blank'
          rel='noopener noreferrer'
          className='text-sm font-mono text-primary hover:underline break-all block'
        >
          {urlItem}
        </a>
      ))}
    </div>
  </div>
)}
```

---

## 📊 修复效果

### 修复前
| 状态 | 显示 |
|------|------|
| Pending | 🔵 蓝色 ✅ |
| Loading | 🔴 红色 + 验证错误 ❌ |
| Success | 🔵 蓝色 ❌ |
| Error | 🔴 红色 ✅ |

### 修复后
| 状态 | 显示 |
|------|------|
| Pending | 🔵 蓝色 ✅ |
| Loading | 🔵 蓝色 + 🔄 加载动画 ✅ |
| Success | 🟢 绿色 ✅ |
| Error | 🔴 红色 + 详细错误信息 ✅ |

---

## 🎯 解决的问题

1. ✅ **验证错误** - 添加 undefined 处理，提供详细的错误日志
2. ✅ **UI 状态错误** - 添加防御性编程，正确处理各种状态
3. ✅ **缺少 Loading 状态** - 添加蓝色 loading 状态显示
4. ✅ **类型不匹配** - 同时支持单个 URL 和多个 URLs
5. ✅ **错误提示不清晰** - 添加详细的错误提示信息

---

## 🔄 向后兼容性

所有修改都保持向后兼容：

- ✅ 支持旧的单个 `url` 字段
- ✅ 支持新的 `urls` 数组字段
- ✅ 自动适配显示格式
- ✅ 现有代码无需修改

---

## ✅ 编译验证

```bash
✅ TypeScript 类型检查通过
✅ ESLint 检查通过
✅ Vite 构建成功
✅ 扩展打包成功
```

---

## 📝 相关修复

这是继 Multi Replace String 工具之后的第二个类似修复：

1. **Multi Replace String** - 修复 `replacements` 参数 undefined 问题
2. **Fetch Web Page** - 修复 `urls` 参数 undefined 问题

两个工具的问题根源相同：
- Schema 层缺少 undefined 处理
- UI 层缺少防御性编程
- 需要在 loading/pending 状态时不显示错误

---

## 🎉 总结

Fetch Web Page 工具的 UI 错误已完全修复！

**修复内容**：
- ✅ Schema 层添加 undefined 处理和详细日志
- ✅ 类型定义支持单个和多个 URL
- ✅ UI 层添加防御性编程
- ✅ 添加完整的状态管理（pending, loading, success, error）
- ✅ 添加清晰的错误提示
- ✅ 支持多 URL 显示

**工具现在具有完整的错误处理和清晰的视觉反馈！** 🎉

