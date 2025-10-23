# MCP Server Integration Guide

This guide explains how to integrate MCP (Model Context Protocol) servers in the Universal DevTools Framework - both custom built-in servers and external community servers.

## Table of Contents

1. [Overview](#overview)
2. [Built-in MCP Servers](#built-in-mcp-servers)
3. [External MCP Servers](#external-mcp-servers)
4. [Tool Filtering](#tool-filtering)
5. [Configuration Reference](#configuration-reference)
6. [Examples](#examples)
7. [Security Best Practices](#security-best-practices)

---

## Overview

The Universal DevTools Framework supports two types of MCP servers:

1. **Built-in Servers**: Custom servers you create following the MCP protocol
2. **External Servers**: Community servers installed via npm, docker, or other package managers

Both types communicate via stdio using JSON-RPC 2.0 and can be controlled through the same configuration interface.

---

## Built-in MCP Servers

Built-in servers are JavaScript/Node.js servers that ship with the framework or that you create yourself.

### Available Built-in Servers

#### 1. Filesystem Server
**Status**: ✅ Active by default
**Tools**: `read_file`, `write_file`, `list_directory`, `file_exists`, `get_file_stats`

```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "enabled": true,
        "type": "built-in",
        "path": "built-in"
      }
    }
  }
}
```

#### 2. Git Server
**Status**: ✅ Active by default
**Tools**: `git_status`, `git_diff`, `git_log`, `git_branch`, `git_show`, `git_blame`, `git_remote`, `git_config`

```json
{
  "mcp": {
    "servers": {
      "git": {
        "enabled": true,
        "type": "built-in",
        "path": "built-in"
      }
    }
  }
}
```

**Usage Example**:
```javascript
const { MCPGateway } = require('./src/core/mcp-gateway');

// Initialize gateway
await mcpGateway.initialize(['git']);

// Get repository status
const status = await mcpGateway.callTool('git', 'git_status', {
  workingDir: '/path/to/repo'
});

// Get commit history
const log = await mcpGateway.callTool('git', 'git_log', {
  workingDir: '/path/to/repo',
  maxCount: 10,
  since: '2 weeks ago'
});
```

### Creating Your Own Built-in Server

Create a new file in `src/mcp/servers/your-server.js`:

```javascript
#!/usr/bin/env node

const readline = require('readline');

class YourMCPServer {
  constructor() {
    this.tools = [
      {
        name: 'your_tool',
        description: 'Description of what your tool does',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'Parameter description' }
          },
          required: ['param1']
        }
      }
    ];

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  start() {
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        this.sendResponse(response);
      } catch (error) {
        this.sendError(null, -32700, 'Parse error', error.message);
      }
    });
  }

  async handleRequest(request) {
    const { id, method, params } = request;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'your-server', version: '1.0.0' }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: this.tools }
        };

      case 'tools/call':
        const result = await this.executeTool(params);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: result }
        };

      default:
        return this.createErrorResponse(id, -32601, 'Method not found');
    }
  }

  async executeTool(params) {
    const { name, arguments: args } = params;

    // Implement your tool logic here
    switch (name) {
      case 'your_tool':
        return { type: 'text', text: 'Tool result' };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  createErrorResponse(id, code, message, data = null) {
    const response = { jsonrpc: '2.0', id, error: { code, message } };
    if (data) response.error.data = data;
    return response;
  }

  sendResponse(response) {
    console.log(JSON.stringify(response));
  }

  sendError(id, code, message, data) {
    this.sendResponse(this.createErrorResponse(id, code, message, data));
  }
}

const server = new YourMCPServer();
server.start();
```

**Register in configuration**:
```json
{
  "mcp": {
    "servers": {
      "yourserver": {
        "enabled": true,
        "type": "built-in",
        "path": "built-in"
      }
    }
  }
}
```

---

## External MCP Servers

External servers are MCP-compliant servers from the community, typically installed via npm.

### GitHub MCP Server

The official GitHub MCP server provides GitHub API access.

**Installation**: Automatic via npx (no pre-installation required)

**Configuration**:
```json
{
  "mcp": {
    "servers": {
      "github": {
        "enabled": true,
        "type": "external",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
        },
        "allowedTools": [
          "create_or_update_file",
          "search_repositories",
          "create_issue",
          "get_file_contents",
          "push_files"
        ]
      }
    }
  }
}
```

**Environment Setup**:
```bash
# Set your GitHub token
export GITHUB_TOKEN="ghp_your_token_here"

# Or add to .env file
echo "GITHUB_TOKEN=ghp_your_token_here" >> .env
```

**Usage Example**:
```javascript
await mcpGateway.initialize(['github']);

// Search repositories
const repos = await mcpGateway.callTool('github', 'search_repositories', {
  query: 'language:javascript stars:>1000'
});

// Create an issue
const issue = await mcpGateway.callTool('github', 'create_issue', {
  owner: 'username',
  repo: 'repository',
  title: 'Bug report',
  body: 'Description of the bug'
});
```

### Adding Other External Servers

You can add any MCP-compliant server using the same pattern:

```json
{
  "mcp": {
    "servers": {
      "servername": {
        "enabled": true,
        "type": "external",
        "command": "npx",  // or "node", "docker", "python", etc.
        "args": ["-y", "package-name"],
        "env": {
          "ENV_VAR_NAME": "${ENV_VAR_FROM_SYSTEM}"
        }
      }
    }
  }
}
```

**Examples of external server configurations**:

```json
// NPM package
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}

// Docker container
{
  "command": "docker",
  "args": ["run", "-i", "--rm", "mcp-server-image"]
}

// Python script
{
  "command": "python",
  "args": ["/path/to/mcp-server.py"]
}

// Custom node script
{
  "command": "node",
  "args": ["/path/to/custom-server.js"]
}
```

---

## Tool Filtering

Tool filtering allows you to restrict which tools from an MCP server are available to agents and workflows. This is crucial for security and clarity.

### Why Filter Tools?

1. **Security**: Prevent agents from calling destructive operations
2. **Clarity**: Reduce cognitive load by exposing only relevant tools
3. **Compliance**: Enforce policies about which operations are allowed

### Configuration

**Allow specific tools only**:
```json
{
  "git": {
    "enabled": true,
    "type": "built-in",
    "path": "built-in",
    "allowedTools": ["git_status", "git_log", "git_diff"]
    // Only these 3 tools can be called; all others blocked
  }
}
```

**Allow all tools** (default behavior):
```json
{
  "git": {
    "enabled": true,
    "type": "built-in",
    "path": "built-in"
    // No allowedTools specified = all tools allowed
  }
}
```

**Empty array = all tools allowed**:
```json
{
  "git": {
    "enabled": true,
    "type": "built-in",
    "path": "built-in",
    "allowedTools": []
    // Empty array = no restriction
  }
}
```

### Error Handling

When a blocked tool is called:

```javascript
try {
  await mcpGateway.callTool('git', 'git_blame', { ... });
} catch (error) {
  // Error: Tool 'git_blame' is not allowed for MCP server 'git'.
  // Allowed tools: git_status, git_log, git_diff
}
```

---

## Configuration Reference

### Server Configuration Schema

```typescript
{
  "enabled": boolean,           // Whether server is enabled
  "type": "built-in" | "external",  // Server type

  // Built-in server fields
  "path"?: string,              // "built-in" or absolute path

  // External server fields
  "command"?: string,           // Command to run (npx, docker, node, etc.)
  "args"?: string[],            // Command arguments
  "env"?: {                     // Environment variables
    [key: string]: string       // Can use ${VAR} for interpolation
  },
  "workingDir"?: string,        // Working directory for server process

  // Tool filtering (both types)
  "allowedTools"?: string[]     // Whitelist of allowed tools (optional)
}
```

### Environment Variable Interpolation

Use `${VAR_NAME}` syntax to reference system environment variables:

```json
{
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}",
    "API_KEY": "${MY_API_KEY}",
    "LITERAL_VALUE": "this-is-literal"
  }
}
```

---

## Examples

### Example 1: Git Analysis Agent

Create an agent that uses the Git MCP server:

```javascript
const { MCPGateway } = require('./src/core/mcp-gateway');
const { ConfigManager } = require('./src/core/config-manager');
const { Logger } = require('./src/core/logger');

async function analyzeRepository(repoPath) {
  const config = new ConfigManager();
  const logger = new Logger();
  const gateway = new MCPGateway(config, logger);

  await gateway.initialize(['git']);

  // Get status
  const status = await gateway.callTool('git', 'git_status', {
    workingDir: repoPath
  });

  // Get recent commits
  const log = await gateway.callTool('git', 'git_log', {
    workingDir: repoPath,
    maxCount: 20
  });

  // Get current branch
  const branch = await gateway.callTool('git', 'git_branch', {
    workingDir: repoPath
  });

  console.log('Repository Analysis:');
  console.log('Status:', status.text);
  console.log('Branch:', branch.text);
  console.log('Recent commits:', JSON.parse(log.text));

  await gateway.shutdown();
}

analyzeRepository('/path/to/repo');
```

### Example 2: Multi-Server Workflow

Use both Git and GitHub servers together:

```javascript
async function createBugReport(repoPath, owner, repo) {
  const gateway = new MCPGateway(config, logger);
  await gateway.initialize(['git', 'github']);

  // Get git diff of uncommitted changes
  const diff = await gateway.callTool('git', 'git_diff', {
    workingDir: repoPath
  });

  // Get current branch
  const branch = await gateway.callTool('git', 'git_branch', {
    workingDir: repoPath
  });

  // Create GitHub issue with the diff
  const issue = await gateway.callTool('github', 'create_issue', {
    owner,
    repo,
    title: `Bug found in ${branch.text.trim()}`,
    body: `## Changes\n\n\`\`\`diff\n${diff.text}\n\`\`\``
  });

  console.log('Created issue:', issue);
  await gateway.shutdown();
}
```

### Example 3: Restricted Agent

Create an agent with limited Git access:

**Configuration**:
```json
{
  "mcp": {
    "servers": {
      "git": {
        "enabled": true,
        "type": "built-in",
        "path": "built-in",
        "allowedTools": ["git_status", "git_log"]
        // Agent can only read status and logs, not modify anything
      }
    }
  }
}
```

**Agent**:
```javascript
async function readOnlyAnalysis(repoPath) {
  const gateway = new MCPGateway(config, logger);
  await gateway.initialize(['git']);

  // These work
  const status = await gateway.callTool('git', 'git_status', { workingDir: repoPath });
  const log = await gateway.callTool('git', 'git_log', { workingDir: repoPath, maxCount: 5 });

  // This throws error - tool not allowed
  try {
    await gateway.callTool('git', 'git_blame', { ... });
  } catch (error) {
    console.error('Tool blocked:', error.message);
  }

  await gateway.shutdown();
}
```

---

## Security Best Practices

### 1. Environment Variables

**DO**:
- Use `${VAR}` interpolation for sensitive values
- Store tokens in environment variables or `.env` files
- Add `.env` to `.gitignore`

**DON'T**:
- Hardcode tokens in configuration files
- Commit sensitive values to version control

### 2. Tool Filtering

**DO**:
- Use `allowedTools` to limit agent capabilities
- Start restrictive, expand as needed
- Document why each tool is allowed

**DON'T**:
- Give agents full access by default
- Allow destructive operations without explicit approval

### 3. External Servers

**DO**:
- Review external server code before use
- Pin versions in configuration (e.g., `@package@1.2.3`)
- Test external servers in isolation first

**DON'T**:
- Trust external servers blindly
- Use `latest` tags in production
- Run external servers with elevated privileges

### 4. Working Directories

**DO**:
- Validate working directory paths
- Use absolute paths
- Restrict to known safe directories

**DON'T**:
- Allow arbitrary path traversal
- Use relative paths from untrusted sources

---

## Troubleshooting

### Server Won't Start

**Check**:
1. Server is enabled in configuration
2. For built-in: file exists at expected path
3. For external: command is installed and in PATH
4. Environment variables are set

**Debug**:
```bash
# Test external server manually
npx -y @modelcontextprotocol/server-github

# Check environment variables
echo $GITHUB_TOKEN
```

### Tool Filtering Not Working

**Verify**:
- `allowedTools` is an array of strings
- Tool names match exactly (case-sensitive)
- Empty array `[]` allows all tools

### Environment Variable Interpolation Issues

**Check**:
- Variable name matches pattern: `${CAPITAL_SNAKE_CASE}`
- Variable is set in environment: `echo $VAR_NAME`
- No typos in variable name

---

## Next Steps

- Explore the [Git MCP Server Implementation](../implementation/git-mcp-server.md)
- Learn about [Agent Orchestration](./agent-orchestration.md)
- Review [MCP Protocol Specification](https://modelcontextprotocol.io)

---

**Questions or Issues?**
Open an issue on GitHub or consult the community MCP registry.
