# Context Management System

**Make Claude Code, Copilot, Cursor, and other AI assistants smarter by giving them persistent project context.**

## Overview

The Context Management System provides persistent memory for your project preferences, decisions, coding standards, and architectural patterns. This context survives across sessions and can be queried by AI coding assistants to provide better, more consistent suggestions.

## Quick Start

```bash
# Initialize context for your project
node bin/devtools.js context init

# Add a preference
node bin/devtools.js context add "Always use async/await" --type preference

# Add a decision
node bin/devtools.js context add "Database: PostgreSQL with Prisma" --type decision

# Add a coding standard
node bin/devtools.js context add "Test coverage must be >90%" --type standard

# View all context
node bin/devtools.js context list

# Query context
node bin/devtools.js context query "database"

# Show context for AI (copy/paste into Claude, Copilot, etc.)
node bin/devtools.js context show
```

## Why Use Context Management?

### The Problem
- **Claude Code/Copilot forget**: They don't remember yesterday's decisions
- **Inconsistent suggestions**: Different coding styles across sessions
- **Repeated explanations**: "Use TypeScript strict mode" for the 50th time
- **Lost knowledge**: Architectural decisions not documented

### The Solution
- ✅ **Persistent memory**: Context survives across sessions
- ✅ **Consistent AI**: AI assistants follow YOUR standards
- ✅ **Easy management**: Add, refine, remove context anytime
- ✅ **Portable**: Export/import across projects
- ✅ **Queryable**: Search for relevant context
- ✅ **Relationships**: Link related concepts

## Context Types

| Type | Purpose | Example |
|------|---------|---------|
| `preference` | Coding style, tool choices | "Use async/await over callbacks" |
| `decision` | Why certain choices were made | "Chose PostgreSQL for ACID compliance" |
| `standard` | Rules that must be followed | "All functions must have JSDoc" |
| `pattern` | Recurring patterns in codebase | "Repository pattern for data access" |
| `architecture` | System design, components | "Microservices with event bus" |

## Commands

### Initialize Context

Auto-analyze your project and create initial context:

```bash
# Basic initialization
node bin/devtools.js context init

# Deep analysis (slower, more thorough)
node bin/devtools.js context init --deep

# Use a template
node bin/devtools.js context init --template python-fastapi
```

### Add Context

```bash
# Simple add
node bin/devtools.js context add "Prefer functional components with hooks"

# With type
node bin/devtools.js context add "Use Zustand for state management" --type decision

# With tags
node bin/devtools.js context add "Jest for testing" --type standard --tags "testing,jest"

# With custom name
node bin/devtools.js context add "Use strict TypeScript" --name "TypeScript Strict Mode" --type preference
```

### List Context

```bash
# List all
node bin/devtools.js context list

# Filter by type
node bin/devtools.js context list --type preference

# JSON output
node bin/devtools.js context list --format json
```

### Query Context

```bash
# Search for keyword
node bin/devtools.js context query "testing"

# JSON output
node bin/devtools.js context query "database" --format json
```

### Get Details

```bash
# Get specific item
node bin/devtools.js context get "Database: PostgreSQL"

# Get multiple
node bin/devtools.js context get "TypeScript Strict Mode" "Jest for testing"
```

### Refine Context

Easily update and improve your context:

```bash
# Add observation to existing item
node bin/devtools.js context refine "Database: PostgreSQL" --add "Using connection pooling"

# Rename an item
node bin/devtools.js context refine "Old Name" --rename "New Name"

# Create relationship
node bin/devtools.js context refine "API Framework" --relate-to "Database" --relation "uses"

# Change type
node bin/devtools.js context refine "Some Item" --change-type standard
```

### Remove Context

```bash
# Remove single item
node bin/devtools.js context remove "Item Name"

# Remove multiple
node bin/devtools.js context remove "Item 1" "Item 2" "Item 3"

# Remove all of a type
node bin/devtools.js context remove --all --type preference

# Remove EVERYTHING (careful!)
node bin/devtools.js context remove --all --type all
```

### Export/Import

```bash
# Export to file
node bin/devtools.js context export --output my-context.json

# Export to stdout (for piping)
node bin/devtools.js context export > context.json

# Import (merge with existing)
node bin/devtools.js context import context.json

# Import (replace existing)
node bin/devtools.js context import context.json --replace
```

### Show for AI

Generate formatted context summary perfect for pasting into AI assistants:

```bash
# Show as markdown
node bin/devtools.js context show

# Redirect to file
node bin/devtools.js context show > context.md

# JSON format
node bin/devtools.js context show --format json
```

## Integration with AI Assistants

### Claude Code

The `.claude/CLAUDE.md` file is already configured to reference context:

```markdown
## 📌 Project Context (Auto-Injected)

Before making significant changes, check the project's stored context:

node bin/devtools.js context show
```

**Workflow:**
1. Claude Code reads `.claude/CLAUDE.md`
2. Sees the instruction to check context
3. You (or Claude) run `node bin/devtools.js context show`
4. Context is injected into the conversation
5. Claude follows your standards

### GitHub Copilot / Cursor

Add context to your project README or `.cursor/CONTEXT.md`:

````markdown
# Project Context

Before suggesting code, review:
```bash
node bin/devtools.js context show
```
````

### Manual Injection

```bash
# Get context
node bin/devtools.js context show > /tmp/context.md

# Copy /tmp/context.md and paste into:
# - Claude Code chat
# - Copilot chat
# - Cursor chat
# - Any AI assistant
```

## Workflow Examples

### Example 1: New Project Setup

```bash
# Initialize with template
node bin/devtools.js context init --template nodejs-express

# Add project-specific decisions
node bin/devtools.js context add "Using MongoDB for flexibility" --type decision
node bin/devtools.js context add "JWT authentication" --type architecture

# Create relationships
node bin/devtools.js context refine "MongoDB" --relate-to "JWT authentication" --relation "stores"

# Show context for AI
node bin/devtools.js context show
```

### Example 2: Mid-Project Learning

```bash
# You discover a bug from using callbacks
# Document the learning:
node bin/devtools.js context add "Async/await prevents callback hell and race conditions" --type standard

# You choose a testing strategy
node bin/devtools.js context add "Integration tests with Supertest" --type decision --tags "testing"

# Relate to existing context
node bin/devtools.js context refine "Integration tests" --relate-to "API Framework" --relation "tests"
```

### Example 3: Team Onboarding

```bash
# Export your project context
node bin/devtools.js context export --output team-context.json

# Share with team
# scp team-context.json teammate@host:/project/

# Teammate imports
node bin/devtools.js context import team-context.json

# Now whole team has same context
```

### Example 4: Context Refinement

```bash
# List all context
node bin/devtools.js context list

# Found outdated item
node bin/devtools.js context get "Old Decision"

# Update it
node bin/devtools.js context refine "Old Decision" --add "Updated: now using newer approach"

# Or remove if no longer relevant
node bin/devtools.js context remove "Old Decision"
```

## Best Practices

### 1. Be Specific

❌ **Bad**: "Use good code style"
✅ **Good**: "Follow Airbnb JavaScript style guide with 2-space indentation"

### 2. Document WHY

❌ **Bad**: "Use PostgreSQL"
✅ **Good**: "Use PostgreSQL for ACID compliance and complex queries. Considered MongoDB but need transactions."

### 3. Regular Updates

```bash
# After making a decision
node bin/devtools.js context add "Decided to use Redis for caching" --type decision

# After learning something
node bin/devtools.js context add "Learned: Always validate user input server-side" --type standard
```

### 4. Clean Up

```bash
# Monthly review
node bin/devtools.js context list

# Remove outdated
node bin/devtools.js context remove "Old Framework Choice"
```

### 5. Use Relationships

```bash
# Show how concepts connect
node bin/devtools.js context refine "Authentication" --relate-to "Database" --relation "uses"
node bin/devtools.js context refine "API" --relate-to "Authentication" --relation "requires"
```

## Storage

Context is stored in the **Memory MCP Server** which provides:
- ✅ Persistent storage (survives across sessions)
- ✅ Fast queries and search
- ✅ Relationship graphs
- ✅ Standard MCP protocol

**Location**: Memory MCP server data directory
**Format**: Internal graph database
**Portability**: Export to JSON anytime

## Tips & Tricks

### Quick Context Injection

```bash
# Add alias to ~/.bashrc or ~/.zshrc
alias ctx="node bin/devtools.js context show"

# Now just type:
ctx
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
# Remind to update context if architectural files changed

if git diff --cached --name-only | grep -E "(schema|model|config)" > /dev/null; then
  echo "📌 Reminder: Update context if you made architectural changes"
  echo "   node bin/devtools.js context add \"your change\""
fi
```

### Context Templates

Save common contexts and reuse:

```bash
# Export base template
node bin/devtools.js context export --output templates/nodejs-api-base.json

# New project
node bin/devtools.js context import templates/nodejs-api-base.json
```

## Troubleshooting

### "Memory MCP server is not available"

```bash
# Enable memory server
node bin/devtools.js config set mcp.servers.memory.enabled true
```

### Context not showing in getAll()

The Memory MCP server response parsing may need adjustment. Context is still stored correctly, just the retrieval format may vary.

### Clear all context

```bash
# Nuclear option - removes EVERYTHING
node bin/devtools.js context remove --all --type all
```

## API Reference

See `src/core/context-manager.js` for programmatic API:

```javascript
const { ContextManager } = require('./src/core/context-manager');
const { MCPGateway } = require('./src/core/mcp-gateway');

// Initialize
const mcpGateway = new MCPGateway(config, logger);
await mcpGateway.initialize(['memory']);

const contextManager = new ContextManager(mcpGateway, logger);
await contextManager.initialize();

// Add context
await contextManager.add({
  type: 'preference',
  name: 'Async/Await',
  description: 'Use async/await over callbacks',
  tags: ['javascript', 'async']
});

// Query
const results = await contextManager.search('async');

// Export
const data = await contextManager.export();
```

## Examples

See `examples/context/basic-usage.js` for a complete working example.

## Next Steps

1. **Initialize**: `node bin/devtools.js context init`
2. **Add context**: `node bin/devtools.js context add "your preference"`
3. **Show for AI**: `node bin/devtools.js context show`
4. **Integrate**: Update your AI assistant workflow to query context

---

**Related Documentation:**
- [MCP Integration](./MCP_INTEGRATION_SUMMARY.md)
- [Memory MCP Server](./RECOMMENDED_MCP_SERVERS.md)
- [Project Status](./PROJECT_STATUS.md)
