# Database Layer

## Overview
This directory contains the database layer for the extension, built with [Drizzle ORM](https://orm.drizzle.team/) and SQLite. The database stores tasks, messages, API history, files, and other persistent data for the AI coding assistant.

## Architecture

### Database Technology Stack
- **ORM**: Drizzle ORM with TypeScript support
- **Database**: SQLite (via libsql)
- **Migrations**: Drizzle Kit for schema migrations
- **Connection**: File-based SQLite database

### Core Components

#### Files Structure
```
src/db/
├── README.md              # This documentation
├── index.ts               # Database connection and initialization
├── schema.ts              # Database schema definitions
├── filesystem-to-db.ts    # Migration utilities (legacy)
└── migrations/            # Database migration files
    ├── 0000_worthless_iceman.sql
    └── meta/              # Migration metadata
```

## Database Schema

### Core Tables

#### `tasks`
Main task entities that represent user requests or projects.
- `id` - Primary key (auto-increment)
- `text` - Task description/content
- `name` - Optional task name
- `dirAbsolutePath` - Working directory path
- `createdAt`, `updatedAt` - Timestamps
- `isDeleted` - Soft delete flag
- `tokensIn`, `tokensOut` - Token usage tracking
- `cacheWrites`, `cacheReads` - Cache usage metrics
- `totalCost` - Total API cost
- `isRepoInitialized` - Git repository status
- `currentSubAgentId` - Active sub-agent reference

#### `taskAgents`
Agents working on tasks (main thread and sub-agents).
- `id` - Primary key
- `taskId` - Foreign key to tasks
- `isMainThread` - Main vs sub-agent flag
- `name` - Agent type (from SpawnAgentOptions)
- `modelId` - AI model being used
- `state` - Agent state (RUNNING, DONE, EXITED)
- `historyErrors` - Error tracking (JSON)
- `systemPromptId`, `autoReminderPromptId` - Prompt references

#### `messages`
All messages in task conversations.
- `id` - Primary key
- `taskId` - Foreign key to tasks
- `type` - Message type ("ask" or "say")
- `ask`, `say` - Message content (typed)
- `text` - Display text
- `images` - Image attachments (JSON array)
- `agentName` - Agent that created the message
- `autoApproved` - Auto-approval status
- `completedAt` - Completion timestamp
- `isAborted` - Abortion status ("user" or "timeout")
- `isError`, `errorText` - Error handling
- `isFetching` - Loading state
- `hook` - Hook execution data (JSON)
- `isSubMessage` - Sub-message flag
- `retryCount` - Retry attempts
- `status` - Message status (pending, approved, etc.)
- `isDone` - Completion flag
- `modelId` - AI model used
- `apiMetrics` - API usage metrics (JSON)

#### `apiHistory`
Historical record of API calls and responses.
- `id` - Primary key
- `taskId` - Foreign key to tasks
- `agentName` - Agent that made the call
- `modelId` - AI model used
- `content` - API call/response data (JSON)
- `commitHash`, `branch`, `preCommitHash` - Git context

#### `files`
File versions and content tracking.
- `id` - Primary key
- `taskId` - Foreign key to tasks
- `content` - File content
- `path` - File path
- `version` - Version number
- `createdAt` - Creation timestamp

#### `promptTemplates`
Reusable prompt templates for agents.
- `id` - Primary key
- `name` - Unique template name
- `agentName` - Target agent
- `type` - Template type ("auto-reminder" or "system")
- `content` - Template content
- `enabledTools` - Available tools (JSON array)

### Indexes
- `messages_task_id_idx` - Message lookup by task
- `messages_type_idx` - Message lookup by type
- `api_history_task_id_idx` - API history by task
- `api_history_agent_name_idx` - API history by agent
- `files_task_id_idx` - Files by task
- `task_agents_task_id_idx` - Agents by task
- `prompt_templates_name_idx` - Templates by name

## Database Connection

### Initialization
The database uses a singleton pattern via the `DB` class:

```typescript
// Initialize database
const db = await DB.init(dbPath, context)

// Get instance
const dbInstance = DB.getInstance()

// Disconnect
DB.disconnect()
```

### Connection Features
- **Auto-creation**: Database file created if it doesn't exist
- **Migrations**: Automatic schema migrations on startup
- **Runtime loading**: Dynamic libsql loading for cross-platform support
- **Error handling**: Comprehensive error handling and logging

## Migrations

### Migration System
- **Tool**: Drizzle Kit for migration generation
- **Location**: `src/db/migrations/`
- **Auto-run**: Migrations run automatically on database initialization
- **Versioning**: Sequential migration files with metadata

### Running Migrations
Migrations are automatically executed during database initialization. Manual migration commands:

```bash
# Generate new migration
npx drizzle-kit generate

# Apply migrations (handled automatically)
npx drizzle-kit migrate
```

### Configuration
Migration configuration in `drizzle.config.ts`:
- **Output**: `./src/db/migrations`
- **Schema**: `./src/db/schema.ts`
- **Dialect**: `turso` (SQLite compatible)
- **Database**: `file:local.db`

## Usage Patterns

### Common Operations

#### Creating a Task
```typescript
const [task] = await db.insert(schema.tasks)
  .values({
    text: "Task description",
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  .returning()
```

#### Querying Messages
```typescript
const messages = await db.select()
  .from(schema.messages)
  .where(eq(schema.messages.taskId, taskId))
  .orderBy(schema.messages.createdAt)
```

#### Tracking API Usage
```typescript
await db.insert(schema.apiHistory)
  .values({
    taskId,
    agentName: "main",
    content: apiCallData,
    createdAt: new Date(),
  })
```

## Development

### Schema Changes
1. Modify `src/db/schema.ts`
2. Generate migration: `npx drizzle-kit generate`
3. Test migration locally
4. Commit both schema and migration files

### Best Practices
- Use transactions for related operations
- Implement proper error handling
- Use indexes for frequently queried columns
- Keep JSON fields minimal and well-typed
- Use soft deletes where appropriate

### Debugging
- Enable SQL logging in development
- Use Drizzle Studio for database inspection
- Monitor migration logs during startup
- Check database file permissions and paths

## Legacy Migration

The `filesystem-to-db.ts` file contains commented migration code for transitioning from the old filesystem-based storage to the database. This is currently disabled but preserved for reference.

## Performance Considerations

- **Indexes**: Strategic indexes on foreign keys and query columns
- **JSON Fields**: Minimal use for complex data structures
- **Soft Deletes**: Preserve data while maintaining performance
- **Connection Pooling**: Single connection with proper lifecycle management
- **Migration Efficiency**: Incremental migrations to minimize downtime

## Future Plans

### RAG (Retrieval-Augmented Generation) Integration

#### Overview
Plan to integrate RAG capabilities to enhance the AI assistant's knowledge retrieval and context understanding.

#### Proposed RAG Schema

##### `documents`
Store source documents for knowledge retrieval.
```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'file', 'web', 'manual'
  source_path TEXT,
  file_hash TEXT,
  language TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1
);
```

##### `document_chunks`
Store document chunks with embeddings for vector search.
```sql
CREATE TABLE document_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB, -- Vector embedding (serialized)
  token_count INTEGER,
  chunk_type TEXT, -- 'paragraph', 'code_block', 'function', 'class'
  metadata TEXT, -- JSON metadata
  created_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
```

##### `rag_queries`
Track RAG query performance and results.
```sql
CREATE TABLE rag_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  query_text TEXT NOT NULL,
  query_embedding BLOB,
  retrieved_chunks TEXT, -- JSON array of chunk IDs
  relevance_scores TEXT, -- JSON array of scores
  response_quality INTEGER, -- 1-5 rating
  created_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

#### RAG Implementation Plan

1. **Document Ingestion Pipeline**
   - File system scanning and indexing
   - Content extraction and preprocessing
   - Chunk generation with overlap
   - Embedding generation using AI models

2. **Vector Search Integration**
   - Implement similarity search algorithms
   - Add vector indexing for performance
   - Support for multiple embedding models
   - Hybrid search (keyword + semantic)

3. **Context Retrieval System**
   - Query understanding and expansion
   - Relevance scoring and ranking
   - Context window management
   - Dynamic chunk selection

4. **Performance Optimization**
   - Vector index optimization
   - Caching strategies for embeddings
   - Incremental updates for changed files
   - Batch processing for large codebases

### Context Engine Enhancement

#### Overview
Enhance the existing context engine with advanced codebase understanding and intelligent context selection.

#### Proposed Context Schema

##### `code_symbols`
Store extracted code symbols with relationships.
```sql
CREATE TABLE code_symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_type TEXT NOT NULL, -- 'function', 'class', 'variable', 'import'
  start_line INTEGER,
  end_line INTEGER,
  signature TEXT,
  docstring TEXT,
  complexity_score INTEGER,
  dependencies TEXT, -- JSON array of symbol IDs
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

##### `code_relationships`
Track relationships between code symbols.
```sql
CREATE TABLE code_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_symbol_id INTEGER NOT NULL,
  target_symbol_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL, -- 'calls', 'inherits', 'imports', 'references'
  strength REAL, -- Relationship strength (0.0-1.0)
  context TEXT, -- Additional context
  created_at INTEGER NOT NULL,
  FOREIGN KEY (source_symbol_id) REFERENCES code_symbols(id),
  FOREIGN KEY (target_symbol_id) REFERENCES code_symbols(id)
);
```

##### `context_sessions`
Track context usage and effectiveness.
```sql
CREATE TABLE context_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  session_type TEXT NOT NULL, -- 'code_completion', 'debugging', 'refactoring'
  selected_symbols TEXT, -- JSON array of symbol IDs
  context_size INTEGER,
  effectiveness_score REAL,
  user_feedback TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

#### Context Engine Implementation Plan

1. **Advanced Code Analysis**
   - AST parsing for multiple languages
   - Symbol extraction and classification
   - Dependency graph construction
   - Code complexity analysis

2. **Intelligent Context Selection**
   - Relevance scoring algorithms
   - Context window optimization
   - Dynamic context expansion
   - Multi-file context assembly

3. **Learning and Adaptation**
   - User feedback integration
   - Context effectiveness tracking
   - Adaptive selection algorithms
   - Personalization features

4. **Performance and Scalability**
   - Incremental analysis for large codebases
   - Parallel processing for symbol extraction
   - Efficient graph traversal algorithms
   - Memory-optimized data structures

### Integration Timeline

#### Phase 1: Foundation (Months 1-2)
- Extend current schema with basic RAG tables
- Implement document ingestion pipeline
- Add basic vector storage capabilities
- Create migration scripts

#### Phase 2: Core RAG (Months 3-4)
- Implement embedding generation
- Add similarity search functionality
- Integrate with existing message system
- Basic context retrieval

#### Phase 3: Advanced Context (Months 5-6)
- Enhanced code symbol extraction
- Relationship mapping and analysis
- Intelligent context selection
- Performance optimization

#### Phase 4: Learning & Optimization (Months 7-8)
- User feedback integration
- Adaptive algorithms
- Performance tuning
- Production deployment

### Technical Considerations

#### Vector Storage Options
- **SQLite with extensions**: sqlite-vss, sqlite-vec
- **Embedded vector DB**: Chroma, LanceDB
- **External vector DB**: Pinecone, Weaviate (for cloud deployment)

#### Embedding Models
- **Local models**: sentence-transformers, all-MiniLM
- **API-based**: OpenAI embeddings, Cohere
- **Code-specific**: CodeBERT, GraphCodeBERT

#### Performance Targets
- **Query latency**: < 100ms for context retrieval
- **Indexing speed**: < 1 minute for 10k files
- **Memory usage**: < 500MB for medium codebases
- **Accuracy**: > 85% relevance for retrieved context
