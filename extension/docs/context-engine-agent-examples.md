# Context Engine Agent - Usage Examples

## Basic Usage Examples

### 1. Semantic Search for Authentication Logic

```xml
<context_engine_agent>
<query>user authentication and login functionality</query>
<searchType>semantic</searchType>
<includeGitHistory>true</includeGitHistory>
<analysisDepth>deep</analysisDepth>
</context_engine_agent>
```

**Expected Output:**
- Authentication services and components
- Login/logout implementations
- JWT token handling
- Password validation logic
- Recent authentication-related commits

### 2. Structural Search for Service Classes

```xml
<context_engine_agent>
<query>UserService class methods</query>
<searchType>structural</searchType>
<scope>src/services</scope>
<maxResults>15</maxResults>
</context_engine_agent>
```

**Expected Output:**
- UserService class definition
- All public and private methods
- Method parameters and return types
- Usage patterns across the codebase

### 3. Historical Analysis of Bug Fixes

```xml
<context_engine_agent>
<query>payment processing bug fixes</query>
<searchType>historical</searchType>
<scope>src/payment</scope>
<maxResults>10</maxResults>
</context_engine_agent>
```

**Expected Output:**
- Recent bug fix commits
- Files modified in each fix
- Commit messages and authors
- Pattern analysis of common issues

### 4. Contextual Search for Database Operations

```xml
<context_engine_agent>
<query>database connection and query handling</query>
<searchType>contextual</searchType>
<analysisDepth>comprehensive</analysisDepth>
</context_engine_agent>
```

**Expected Output:**
- Database connection classes
- Query builders and ORM usage
- Connection pooling implementations
- Error handling patterns

## Advanced Usage Patterns

### 5. API Endpoint Analysis

```xml
<context_engine_agent>
<query>REST API endpoint implementations</query>
<searchType>structural</searchType>
<scope>src/api</scope>
<includeGitHistory>true</includeGitHistory>
<maxResults>20</maxResults>
</context_engine_agent>
```

### 6. Error Handling Patterns

```xml
<context_engine_agent>
<query>error handling and exception management</query>
<searchType>semantic</searchType>
<analysisDepth>comprehensive</analysisDepth>
</context_engine_agent>
```

### 7. TypeScript Interface Analysis

```xml
<context_engine_agent>
<query>interface definitions and type declarations</query>
<searchType>structural</searchType>
<scope>**/*.ts</scope>
<maxResults>25</maxResults>
</context_engine_agent>
```

### 8. Recent Code Changes Analysis

```xml
<context_engine_agent>
<query>recent feature implementations</query>
<searchType>historical</searchType>
<maxResults>15</maxResults>
</context_engine_agent>
```

## Integration with Other Tools

### Workflow Example: Code Exploration

1. **Start with Context Engine Agent**:
```xml
<context_engine_agent>
<query>authentication middleware</query>
<searchType>semantic</searchType>
</context_engine_agent>
```

2. **Read specific files found**:
```xml
<read_file>
<path>src/middleware/auth.middleware.ts</path>
</read_file>
```

3. **Search for related files**:
```xml
<search_files>
<path>src</path>
<regex>auth.*middleware</regex>
</search_files>
```

### Workflow Example: Bug Investigation

1. **Historical search for related issues**:
```xml
<context_engine_agent>
<query>memory leak issues</query>
<searchType>historical</searchType>
<maxResults>5</maxResults>
</context_engine_agent>
```

2. **Structural search for current implementation**:
```xml
<context_engine_agent>
<query>memory management and cleanup</query>
<searchType>structural</searchType>
<analysisDepth>comprehensive</analysisDepth>
</context_engine_agent>
```

## Best Practices

### Query Optimization
- Use specific technical terms
- Include context about the domain
- Combine multiple search types for comprehensive analysis

### Scope Management
- Use directory scopes for large projects
- Filter by file extensions when needed
- Combine with maxResults for performance

### Analysis Depth Selection
- **shallow**: Quick overview, fast results
- **deep**: Detailed analysis with relationships (default)
- **comprehensive**: Full analysis including patterns and evolution

### Git History Integration
- Enable for understanding code evolution
- Useful for debugging and learning implementation decisions
- Provides context for current code state

## Common Use Cases

1. **Code Understanding**: Learn how existing features work
2. **Refactoring Preparation**: Understand dependencies and usage
3. **Bug Investigation**: Find similar issues and solutions
4. **Architecture Analysis**: Understand system design patterns
5. **Code Review**: Find related implementations and best practices
6. **Documentation**: Generate insights about code structure
7. **Onboarding**: Help new developers understand the codebase

## Performance Tips

- Use scope to limit search area for large codebases
- Start with shallow analysis for quick exploration
- Use maxResults to control response size
- Combine different search types for comprehensive understanding

## Troubleshooting

### No Results Found
- Try broader query terms
- Remove scope restrictions
- Use different search types
- Check if files are accessible in workspace

### Irrelevant Results
- Use more specific queries
- Add scope restrictions
- Try structural search for specific code elements
- Use contextual search for related suggestions

### Performance Issues
- Reduce maxResults
- Use shallow analysis depth
- Add scope restrictions to specific directories
- Avoid very broad queries on large codebases
