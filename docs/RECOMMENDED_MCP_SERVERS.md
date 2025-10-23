# Recommended MCP Servers for Universal DevTools Framework

This document lists highly useful MCP servers that complement the Universal DevTools Framework's capabilities.

## 🎯 Most Useful for DevTools Framework

### 1. **Slack Server** ⭐⭐⭐⭐⭐
**Use Case**: Team communication integration
**Why**: Perfect for DevOps workflows - agents can post build results, deployment notifications, error alerts
**Package**: Various community implementations available
**Value**:
- Post CI/CD notifications to channels
- Create issues from build failures
- Query team discussions for context

### 2. **PostgreSQL / Database Servers** ⭐⭐⭐⭐⭐
**Use Case**: Database operations and migrations
**Why**: Essential for full-stack development workflows
**Packages**:
- `@modelcontextprotocol/server-postgres` (if available)
- Community implementations like `FreePeak/db-mcp-server`
**Value**:
- Execute queries during development
- Test data setup/teardown
- Schema exploration and validation
- Migration verification

### 3. **Docker MCP Server** ⭐⭐⭐⭐⭐
**Use Case**: Container management
**Why**: Natural fit with DevTools - manage containers, build images, orchestrate services
**Value**:
- Start/stop development containers
- Build and tag images as part of workflows
- Container health checks
- Log access and debugging

### 4. **Kubernetes Server (k8m)** ⭐⭐⭐⭐
**Use Case**: K8s cluster management
**Package**: `weibaohui/k8m`
**Why**: For teams deploying to K8s
**Value**:
- Multi-cluster management
- Deployment status checks
- Pod logs and debugging
- Resource monitoring
- 50+ built-in DevOps tools

### 5. **Memory/Knowledge Graph Server** ⭐⭐⭐⭐
**Use Case**: Persistent context across sessions
**Package**: `@modelcontextprotocol/server-memory`
**Why**: Agents remember project conventions, team preferences, past issues
**Value**:
- Remember coding standards per project
- Track recurring issues/solutions
- Maintain team knowledge base
- Cross-session context

---

## 📦 Official @modelcontextprotocol Servers

### **@modelcontextprotocol/server-filesystem**
**Status**: Already have similar built-in ✅
**Use Case**: File operations
**Notes**: Our built-in filesystem server covers this

### **@modelcontextprotocol/server-memory**
**Status**: Highly recommended ⭐⭐⭐⭐
**Use Case**: Knowledge graph for persistent memory
**Installation**: `npx -y @modelcontextprotocol/server-memory`
**Value**:
- Remember project-specific details
- Track decisions and rationale
- Build organizational knowledge

**Example Config**:
```json
{
  "memory": {
    "enabled": true,
    "type": "external",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "allowedTools": [
      "create_entities",
      "create_relations",
      "search_nodes",
      "read_graph"
    ]
  }
}
```

### **@modelcontextprotocol/server-sequential-thinking**
**Status**: Useful for complex workflows ⭐⭐⭐
**Use Case**: Structured problem-solving
**Installation**: `npx -y @modelcontextprotocol/server-sequential-thinking`
**Value**:
- Break down complex debugging tasks
- Systematic troubleshooting
- Decision documentation

### **@modelcontextprotocol/server-everything**
**Status**: Testing/development only ⭐⭐
**Use Case**: Test MCP protocol features
**Installation**: `npx -y @modelcontextprotocol/server-everything`
**Value**: Useful for testing your MCP integration

---

## 🌐 Web & API Servers

### **Fetch/Browser Server**
**Status**: Very useful ⭐⭐⭐⭐
**Package**: `@modelcontextprotocol/server-fetch` or `@anthropic/fetch`
**Use Case**: Web scraping, API calls, documentation fetching
**Value**:
- Fetch latest library docs
- Check API endpoints
- Monitor service health
- Convert web content to markdown

**Example Config**:
```json
{
  "fetch": {
    "enabled": true,
    "type": "external",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-fetch"],
    "allowedTools": ["fetch", "fetch_html_to_markdown"]
  }
}
```

### **Google Maps Server**
**Status**: Situational ⭐⭐
**Use Case**: Location-based applications
**Value**: Only useful if building location-aware apps

---

## 💬 Communication & Collaboration

### **Slack Server** ⭐⭐⭐⭐⭐
**Status**: Highly recommended for teams
**Packages**: Multiple community implementations
**Use Case**: Team notifications and updates
**Value**:
- Post deployment notifications
- Create alerts for failures
- Query team discussions
- Integrate with CI/CD

**Example Config**:
```json
{
  "slack": {
    "enabled": true,
    "type": "external",
    "command": "npx",
    "args": ["-y", "slack-mcp-server"],
    "env": {
      "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
      "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
    },
    "allowedTools": [
      "post_message",
      "list_channels",
      "search_messages"
    ]
  }
}
```

### **GitLab Server** ⭐⭐⭐⭐
**Status**: Alternative to GitHub
**Use Case**: GitLab integration (if using GitLab)
**Value**: Same as GitHub server but for GitLab

---

## 🗄️ Data & Database

### **PostgreSQL Server** ⭐⭐⭐⭐⭐
**Package**: `FreePeak/db-mcp-server` or similar
**Use Case**: Database operations
**Value**:
- Execute queries
- Schema exploration
- Test data management
- Migration validation

**Example Config**:
```json
{
  "postgres": {
    "enabled": true,
    "type": "external",
    "command": "npx",
    "args": ["-y", "db-mcp-server"],
    "env": {
      "DATABASE_URL": "${DATABASE_URL}"
    },
    "allowedTools": [
      "query",
      "list_tables",
      "describe_table",
      "execute_transaction"
    ]
  }
}
```

### **Supabase Server** ⭐⭐⭐⭐
**Use Case**: Supabase/serverless database
**Value**: Edge functions + Postgres for modern apps

### **Qdrant (Vector Database)** ⭐⭐⭐
**Use Case**: RAG (Retrieval Augmented Generation)
**Value**: Semantic search, embeddings, AI memory

---

## 🛠️ Development Tools

### **Next.js DevTools Server** ⭐⭐⭐
**Package**: `next-devtools-mcp`
**Use Case**: Next.js development
**Value**: Next.js-specific utilities for AI assistants

### **JetBrains MCP Proxy** ⭐⭐⭐⭐
**Package**: `JetBrains/mcpProxy`
**Use Case**: IDE integration (IntelliJ, WebStorm, etc.)
**Value**: Connect AI to JetBrains IDEs for development tasks

### **GitKraken Server** ⭐⭐⭐
**Use Case**: Multi-service Git GUI
**Value**: Wraps GitKraken, Jira, GitHub, GitLab APIs

---

## 📊 Monitoring & Observability

### **Prometheus/Grafana Servers**
**Status**: Community implementations ⭐⭐⭐⭐
**Use Case**: Metrics and monitoring
**Value**:
- Query metrics
- Check system health
- Alert on anomalies
- Dashboard insights

### **Sentry Server**
**Status**: Highly valuable ⭐⭐⭐⭐
**Use Case**: Error tracking
**Value**:
- Query recent errors
- Track error trends
- Link errors to commits
- Prioritize bug fixes

---

## 🎯 Top 5 Recommendations for Universal DevTools Framework

Based on your framework's focus on development workflows, here are the **must-have** servers:

### 1. **@modelcontextprotocol/server-memory**
**Priority**: HIGHEST ⭐⭐⭐⭐⭐
- Persistent knowledge across sessions
- Remember project conventions
- Track team decisions
- Built by Anthropic, well-maintained

### 2. **PostgreSQL/Database Server**
**Priority**: HIGHEST ⭐⭐⭐⭐⭐
- Essential for full-stack workflows
- Test data management
- Schema validation
- Migration support

### 3. **Slack Server**
**Priority**: HIGH ⭐⭐⭐⭐
- CI/CD notifications
- Team communication
- Alert management
- Perfect for DevOps

### 4. **Docker Server**
**Priority**: HIGH ⭐⭐⭐⭐
- Container management
- Development environment setup
- Image building
- Natural fit with DevTools

### 5. **Fetch/Browser Server**
**Priority**: MEDIUM-HIGH ⭐⭐⭐⭐
- Fetch documentation
- API testing
- Web scraping
- Content conversion

---

## 📝 Implementation Priority

### Phase 1 (Immediate - Highest Value)
1. **Memory Server** - Add knowledge persistence
2. **PostgreSQL Server** - Database operations
3. **Fetch Server** - Web content access

### Phase 2 (Short Term - High Value)
4. **Slack Server** - Team communication
5. **Docker Server** - Container management

### Phase 3 (Medium Term - Situational)
6. **Kubernetes Server** - If using K8s
7. **Sentry Server** - Error tracking
8. **Sequential Thinking Server** - Complex workflows

### Phase 4 (Long Term - Nice to Have)
9. **JetBrains Proxy** - IDE integration
10. **GitLab Server** - If using GitLab
11. **Supabase/Qdrant** - Modern stack features

---

## 🚀 Quick Add Instructions

### Memory Server (Recommended First)
```json
{
  "mcp": {
    "servers": {
      "memory": {
        "enabled": true,
        "type": "external",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"]
      }
    }
  }
}
```

**Usage**:
```javascript
// Store project knowledge
await gateway.callTool('memory', 'create_entities', {
  entities: [{
    name: 'ProjectConvention',
    entityType: 'standard',
    observations: ['Always use async/await', 'Prefer ES6+ syntax']
  }]
});

// Query knowledge
const knowledge = await gateway.callTool('memory', 'search_nodes', {
  query: 'project conventions'
});
```

### PostgreSQL Server (Recommended Second)
```json
{
  "postgres": {
    "enabled": true,
    "type": "external",
    "command": "npx",
    "args": ["-y", "db-mcp-server"],
    "env": {
      "DATABASE_URL": "${DATABASE_URL}"
    }
  }
}
```

### Fetch Server (Recommended Third)
```json
{
  "fetch": {
    "enabled": true,
    "type": "external",
    "command": "npx",
    "args": ["-y", "@anthropic/fetch"]
  }
}
```

---

## 🔍 Finding More Servers

**Official Sources**:
- GitHub: https://github.com/modelcontextprotocol/servers
- NPM: Search for `@modelcontextprotocol/server-*`
- MCP Registry: https://github.com/modelcontextprotocol/registry

**Community Lists**:
- Awesome MCP Servers: https://github.com/wong2/awesome-mcp-servers
- PulseMCP Directory: https://www.pulsemcp.com/servers
- MCP.so Marketplace: https://mcp.so

**Search Strategy**:
1. Check official @modelcontextprotocol npm packages first
2. Search "awesome-mcp-servers" on GitHub
3. Look for `mcp-server` suffix in package names
4. Check MCP directories for curated lists

---

## 💡 Building Custom Servers

If a server doesn't exist for your needs, it's easy to create:

**When to Build Custom**:
- Internal tool integration (company-specific APIs)
- Proprietary systems (custom databases, services)
- Specialized workflows (unique to your team)

**Follow Git Server Pattern**:
- See `src/mcp/servers/git-server.js` for reference
- Implement JSON-RPC 2.0 via stdio
- Define clear tool schemas
- Add comprehensive tests

---

**Last Updated**: October 22, 2025
**Based On**: Official MCP registry and community awesome lists
