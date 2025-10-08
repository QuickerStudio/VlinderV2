# Context7 Tool - Quick Start Guide

## What is Context7?

Context7 is a tool that fetches up-to-date documentation for libraries and frameworks. It helps the AI agent quickly access comprehensive documentation without browsing external websites.

## Basic Usage

### Simple Example
```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>
```

This fetches React documentation focused on hooks.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `libraryName` | string | Yes | - | Library name (e.g., "react") or Context7 ID (e.g., "/vercel/next.js") |
| `topic` | string | No | - | Specific topic to focus on (e.g., "hooks", "routing") |
| `tokens` | number | No | 5000 | Maximum tokens to retrieve (max: 10000) |

## Common Use Cases

### 1. Learn About a Library Feature
```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>
```

### 2. Get API Reference
```xml
<tool name="context7">
  <libraryName>express</libraryName>
  <topic>routing</topic>
</tool>
```

### 3. Fetch Specific Version Documentation
```xml
<tool name="context7">
  <libraryName>/vercel/next.js/v14.0.0</libraryName>
  <topic>app router</topic>
</tool>
```

### 4. Get General Documentation
```xml
<tool name="context7">
  <libraryName>typescript</libraryName>
</tool>
```

### 5. Fetch Large Documentation
```xml
<tool name="context7">
  <libraryName>mongodb</libraryName>
  <topic>aggregation</topic>
  <tokens>8000</tokens>
</tool>
```

## Supported Libraries

### Frontend
- react, vue, angular, svelte
- next.js, nuxt, gatsby
- redux, mobx, zustand

### Backend
- express, fastify, koa
- nest.js, hapi, restify

### Databases
- mongodb, postgresql, mysql
- redis, elasticsearch

### Tools
- typescript, webpack, vite
- eslint, prettier, jest
- babel, rollup, parcel

### Cloud
- aws-sdk, azure-sdk
- google-cloud, firebase

## Output Format

The tool returns documentation in XML format:

```xml
<context7_documentation>
  <library_name>react</library_name>
  <library_id>/facebook/react</library_id>
  <topic>hooks</topic>
  <documentation>
    # React Hooks
    
    Hooks are a new addition in React 16.8...
    
    ## useState
    ...
  </documentation>
</context7_documentation>
```

## Best Practices

### 1. Be Specific with Topics
❌ **Bad**: Fetch all React documentation
```xml
<tool name="context7">
  <libraryName>react</libraryName>
</tool>
```

✅ **Good**: Fetch specific topic
```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>
```

### 2. Start with Lower Token Limits
❌ **Bad**: Always use maximum tokens
```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <tokens>10000</tokens>
</tool>
```

✅ **Good**: Start with default, increase if needed
```xml
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>
```

### 3. Use Library IDs for Precision
❌ **Bad**: Ambiguous library name
```xml
<tool name="context7">
  <libraryName>next</libraryName>
</tool>
```

✅ **Good**: Use exact library ID
```xml
<tool name="context7">
  <libraryName>/vercel/next.js</libraryName>
</tool>
```

### 4. Combine with Code Search
```xml
<!-- First, get documentation -->
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>

<!-- Then, search for usage examples in codebase -->
<tool name="search_files">
  <query>useState</query>
</tool>
```

## Error Handling

### Library Not Found
```
Error: Failed to resolve library "unknown-lib": HTTP 404: Not Found
```

**Solution**: Check library name spelling or use Context7 library ID.

### Documentation Not Available
```
Error: Failed to fetch documentation for "/org/project": HTTP 404: Not Found
```

**Solution**: Verify the library ID is correct or try a different version.

### Network Timeout
```
Error: Failed to resolve library "react": Network error: AbortError
```

**Solution**: The tool automatically retries. If it persists, check network connection.

## Tips & Tricks

### 1. Find Library ID
If you're unsure about the exact library ID, start with the library name:
```xml
<tool name="context7">
  <libraryName>react</libraryName>
</tool>
```

The response will include the resolved library ID:
```xml
<library_id>/facebook/react</library_id>
```

### 2. Version-Specific Documentation
Use the format `/org/project/version`:
```xml
<tool name="context7">
  <libraryName>/vercel/next.js/v14.0.0</libraryName>
</tool>
```

### 3. Multiple Topics
For comprehensive coverage, make multiple queries:
```xml
<!-- Query 1: Hooks -->
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>hooks</topic>
</tool>

<!-- Query 2: Context -->
<tool name="context7">
  <libraryName>react</libraryName>
  <topic>context</topic>
</tool>
```

### 4. Adjust Token Limit
Start with default (5000), increase if needed:
```xml
<!-- First try -->
<tool name="context7">
  <libraryName>mongodb</libraryName>
  <topic>aggregation</topic>
</tool>

<!-- If more detail needed -->
<tool name="context7">
  <libraryName>mongodb</libraryName>
  <topic>aggregation</topic>
  <tokens>8000</tokens>
</tool>
```

## Common Patterns

### Pattern 1: Learn New Library
```xml
<!-- Step 1: Get overview -->
<tool name="context7">
  <libraryName>fastify</libraryName>
</tool>

<!-- Step 2: Get specific feature -->
<tool name="context7">
  <libraryName>fastify</libraryName>
  <topic>plugins</topic>
</tool>
```

### Pattern 2: Troubleshoot Issue
```xml
<!-- Step 1: Get documentation -->
<tool name="context7">
  <libraryName>express</libraryName>
  <topic>middleware</topic>
</tool>

<!-- Step 2: Search codebase -->
<tool name="search_files">
  <query>app.use</query>
</tool>
```

### Pattern 3: Implement Feature
```xml
<!-- Step 1: Get API reference -->
<tool name="context7">
  <libraryName>mongodb</libraryName>
  <topic>aggregation</topic>
</tool>

<!-- Step 2: Find examples in codebase -->
<tool name="search_files">
  <query>aggregate</query>
</tool>

<!-- Step 3: Read existing implementation -->
<tool name="read_file">
  <path>src/database/queries.ts</path>
</tool>
```

## Troubleshooting

### Issue: "Library not found"
**Cause**: Library name is incorrect or not supported.

**Solution**: 
1. Check spelling
2. Try common variations (e.g., "nextjs" vs "next.js")
3. Use Context7 library ID format

### Issue: "Documentation too large"
**Cause**: Documentation exceeds token limit.

**Solution**:
1. Use `topic` parameter to narrow down
2. Increase `tokens` parameter
3. Make multiple queries for different topics

### Issue: "Network timeout"
**Cause**: Network connection issues or API unavailable.

**Solution**:
1. Tool automatically retries (up to 2 times)
2. Check network connection
3. Try again later

## Quick Reference

| Task | Command |
|------|---------|
| Get library overview | `<libraryName>library-name</libraryName>` |
| Get specific topic | `<topic>topic-name</topic>` |
| Increase detail | `<tokens>8000</tokens>` |
| Use library ID | `<libraryName>/org/project</libraryName>` |
| Version-specific | `<libraryName>/org/project/version</libraryName>` |

## Next Steps

1. Try fetching documentation for a library you're using
2. Combine with code search to find usage examples
3. Use topic filtering to focus on specific features
4. Adjust token limits based on your needs

For more information, see:
- [Implementation Documentation](CONTEXT7_TOOL_IMPLEMENTATION.md)
- [Test Report](CONTEXT7_TOOL_TEST_REPORT.md)
- [Complete Summary](CONTEXT7_TOOL_COMPLETE_SUMMARY.md)

