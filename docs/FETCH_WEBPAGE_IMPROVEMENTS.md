# Fetch Webpage Tool - 改进方案

## 当前状态分析

### ✅ 已实现的功能
1. 多URL并行获取（最多10个）
2. HTML到Markdown转换
3. 基于查询的内容过滤
4. 相关性评分和排序
5. 内容截断（50KB限制）
6. 超时处理（30秒）
7. 错误处理和部分成功支持
8. XML格式输出
9. 完整的单元测试覆盖

### ⚠️ 发现的问题

#### 1. 安全性问题
- **问题**: 没有防止访问内网IP地址
- **风险**: 可能被用于探测内网服务
- **优先级**: 高
- **建议**: 添加IP地址黑名单（127.0.0.1, 192.168.x.x, 10.x.x.x等）

#### 2. 性能问题
- **问题**: 大型页面可能导致内存占用过高
- **影响**: 多个大页面并行获取时可能OOM
- **优先级**: 中
- **建议**: 
  - 添加流式处理
  - 限制并发数量
  - 添加内存监控

#### 3. 内容质量问题
- **问题**: HTML到Markdown转换可能丢失重要信息
- **影响**: 某些网页结构复杂时提取效果不佳
- **优先级**: 中
- **建议**:
  - 改进HTML清理逻辑
  - 保留更多语义信息
  - 添加表格、列表的特殊处理

#### 4. 查询过滤算法简单
- **问题**: 当前只是简单的文本匹配
- **影响**: 相关性评分不够准确
- **优先级**: 低
- **建议**:
  - 实现TF-IDF算法
  - 添加语义相似度计算
  - 支持正则表达式查询

#### 5. 错误信息不够详细
- **问题**: 某些错误只返回简单消息
- **影响**: 调试困难
- **优先级**: 低
- **建议**:
  - 添加详细的错误堆栈
  - 记录请求/响应头
  - 添加重试机制

#### 6. 缺少缓存机制
- **问题**: 重复请求相同URL会重新获取
- **影响**: 浪费网络资源和时间
- **优先级**: 低
- **建议**:
  - 添加内存缓存
  - 支持HTTP缓存头
  - 添加缓存过期策略

## 改进计划

### 第一阶段：安全性增强（高优先级）

#### 1.1 添加IP地址黑名单
```typescript
private isPrivateIP(hostname: string): boolean {
    const privateRanges = [
        /^127\./,           // 127.0.0.0/8
        /^10\./,            // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
        /^192\.168\./,      // 192.168.0.0/16
        /^localhost$/i,
        /^::1$/,            // IPv6 localhost
        /^fe80:/,           // IPv6 link-local
    ]
    return privateRanges.some(range => range.test(hostname))
}
```

#### 1.2 添加URL白名单/黑名单配置
```typescript
interface SecurityConfig {
    allowedDomains?: string[]
    blockedDomains?: string[]
    allowPrivateIPs?: boolean
}
```

#### 1.3 添加重定向限制
```typescript
private readonly MAX_REDIRECTS = 5
```

### 第二阶段：性能优化（中优先级）

#### 2.1 添加并发控制
```typescript
import PQueue from 'p-queue'

private readonly queue = new PQueue({ 
    concurrency: 3,  // 最多3个并发请求
    timeout: 30000 
})
```

#### 2.2 添加流式处理
```typescript
private async fetchWithStream(url: string): Promise<string> {
    const response = await fetch(url)
    const reader = response.body?.getReader()
    let content = ''
    let totalBytes = 0
    const maxBytes = 1024 * 1024 // 1MB limit
    
    while (true) {
        const { done, value } = await reader.read()
        if (done || totalBytes >= maxBytes) break
        
        content += new TextDecoder().decode(value)
        totalBytes += value.length
    }
    
    return content
}
```

#### 2.3 添加内存监控
```typescript
private checkMemoryUsage(): void {
    const usage = process.memoryUsage()
    if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
        this.logger('High memory usage detected', 'warn')
    }
}
```

### 第三阶段：内容质量提升（中优先级）

#### 3.1 改进HTML清理
```typescript
private cleanHtml(html: string): string {
    // 移除注释
    html = html.replace(/<!--[\s\S]*?-->/g, '')
    
    // 移除script和style标签及内容
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    
    // 移除SVG
    html = html.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    
    // 保留语义标签
    return html
}
```

#### 3.2 添加表格处理
```typescript
private processTables(html: string): string {
    // 将HTML表格转换为Markdown表格
    // 使用turndown的table插件
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
    })
    
    turndownService.use(require('turndown-plugin-gfm').tables)
    return turndownService.turndown(html)
}
```

#### 3.3 添加代码块识别
```typescript
private extractCodeBlocks(html: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = []
    const regex = /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g
    let match
    
    while ((match = regex.exec(html)) !== null) {
        codeBlocks.push({
            content: match[1],
            language: this.detectLanguage(match[1]),
        })
    }
    
    return codeBlocks
}
```

### 第四阶段：查询算法优化（低优先级）

#### 4.1 实现TF-IDF
```typescript
private calculateTFIDF(text: string, query: string): number {
    const terms = query.toLowerCase().split(/\s+/)
    const textLower = text.toLowerCase()
    
    let score = 0
    for (const term of terms) {
        const tf = (textLower.match(new RegExp(term, 'g')) || []).length
        const idf = Math.log(1 + 1 / (tf + 1))
        score += tf * idf
    }
    
    return score
}
```

#### 4.2 添加语义相似度
```typescript
// 使用简单的余弦相似度
private cosineSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)
    
    const set1 = new Set(words1)
    const set2 = new Set(words2)
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    
    return intersection.size / Math.sqrt(set1.size * set2.size)
}
```

### 第五阶段：缓存机制（低优先级）

#### 5.1 添加内存缓存
```typescript
private cache = new Map<string, CacheEntry>()

interface CacheEntry {
    content: string
    timestamp: number
    etag?: string
}

private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟

private getCached(url: string): string | null {
    const entry = this.cache.get(url)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(url)
        return null
    }
    
    return entry.content
}
```

#### 5.2 支持HTTP缓存头
```typescript
private async fetchWithCache(url: string): Promise<Response> {
    const cached = this.cache.get(url)
    const headers: HeadersInit = {
        'User-Agent': 'Mozilla/5.0 (compatible; VlinderBot/1.0)',
    }
    
    if (cached?.etag) {
        headers['If-None-Match'] = cached.etag
    }
    
    const response = await fetch(url, { headers })
    
    if (response.status === 304 && cached) {
        // 使用缓存
        return new Response(cached.content)
    }
    
    return response
}
```

## 测试改进

### 添加性能测试
```typescript
describe('Performance Tests', () => {
    test('should handle 10 URLs within 60 seconds', async () => {
        const urls = Array.from({ length: 10 }, (_, i) => 
            `https://example${i}.com`
        )
        const start = Date.now()
        await tool.execute({ urls })
        const duration = Date.now() - start
        expect(duration).toBeLessThan(60000)
    })
    
    test('should not exceed memory limit', async () => {
        const initialMemory = process.memoryUsage().heapUsed
        await tool.execute({ urls: [largePageUrl] })
        const finalMemory = process.memoryUsage().heapUsed
        const increase = finalMemory - initialMemory
        expect(increase).toBeLessThan(100 * 1024 * 1024) // 100MB
    })
})
```

### 添加安全测试
```typescript
describe('Security Tests', () => {
    test('should reject private IP addresses', async () => {
        const result = await tool.execute({ 
            urls: ['http://192.168.1.1'] 
        })
        expect(result.status).toBe('error')
        expect(result.text).toContain('private IP')
    })
    
    test('should limit redirects', async () => {
        // Mock infinite redirect
        const result = await tool.execute({ 
            urls: ['http://redirect-loop.com'] 
        })
        expect(result.status).toBe('error')
    })
})
```

## 实施时间表

### Week 1: 安全性增强
- Day 1-2: 实现IP黑名单
- Day 3-4: 添加重定向限制
- Day 5: 测试和文档

### Week 2: 性能优化
- Day 1-2: 实现并发控制
- Day 3-4: 添加流式处理
- Day 5: 性能测试

### Week 3: 内容质量
- Day 1-2: 改进HTML清理
- Day 3-4: 添加表格和代码块处理
- Day 5: 质量测试

### Week 4: 高级功能
- Day 1-2: 实现TF-IDF
- Day 3-4: 添加缓存机制
- Day 5: 集成测试和文档

## 成功指标

- ✅ 所有单元测试通过
- ✅ 代码覆盖率 > 90%
- ⏳ 性能测试通过（10 URLs < 60s）
- ⏳ 安全测试通过（拒绝私有IP）
- ⏳ 内存使用 < 200MB
- ⏳ 用户满意度 > 4.5/5

## 监控和维护

### 日志记录
- 记录所有请求URL
- 记录响应时间
- 记录错误和异常
- 记录缓存命中率

### 性能监控
- 平均响应时间
- 成功率
- 错误率
- 内存使用

### 用户反馈
- 收集使用数据
- 分析常见错误
- 优化常用场景

