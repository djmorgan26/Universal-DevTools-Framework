# MCP Server Quick Reference

## Add Your Own MCP Server (Built-in)

### 1. Create Server File
`src/mcp/servers/myserver.js`:
```javascript
#!/usr/bin/env node
const readline = require('readline');

class MyMCPServer {
  constructor() {
    this.tools = [{
      name: 'my_tool',
      description: 'What it does',
      inputSchema: {
        type: 'object',
        properties: { param: { type: 'string' } },
        required: ['param']
      }
    }];
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  }

  start() {
    this.rl.on('line', async (line) => {
      const request = JSON.parse(line);
      const response = await this.handleRequest(request);
      console.log(JSON.stringify(response));
    });
  }

  async handleRequest(request) {
    const { id, method, params } = request;
    if (method === 'initialize') return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'myserver', version: '1.0.0' } } };
    if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: this.tools } };
    if (method === 'tools/call') {
      const result = { type: 'text', text: 'Result' }; // Your logic here
      return { jsonrpc: '2.0', id, result: { content: result } };
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
  }
}

new MyMCPServer().start();
```

### 2. Add to Config
`src/config/profiles/default.json`:
```json
{
  "mcp": {
    "servers": {
      "myserver": {
        "enabled": true,
        "type": "built-in",
        "path": "built-in"
      }
    }
  }
}
```

### 3. Use It
```javascript
const { MCPGateway } = require('./src/core/mcp-gateway');
const { ConfigManager } = require('./src/core/config-manager');
const config = new ConfigManager();
await config.load();
const gateway = new MCPGateway(config, new Logger());
await gateway.initialize(['myserver']);
const result = await gateway.callTool('myserver', 'my_tool', { param: 'value' });
```

---

## Add External MCP Server (Someone Else's)

### 1. Find Package
Search npm/GitHub for MCP servers:
- `@modelcontextprotocol/server-github` - GitHub API
- `@modelcontextprotocol/server-memory` - Memory/knowledge graph
- `@modelcontextprotocol/server-filesystem` - File operations

### 2. Add to Config
```json
{
  "mcp": {
    "servers": {
      "servername": {
        "enabled": true,
        "type": "external",
        "command": "npx",
        "args": ["-y", "package-name"],
        "env": {
          "API_TOKEN": "${MY_TOKEN}"
        }
      }
    }
  }
}
```

### 3. Set Environment
```bash
export MY_TOKEN="your-token-here"
# or add to .env file
```

### 4. Use It
```javascript
await gateway.initialize(['servername']);
const result = await gateway.callTool('servername', 'tool_name', { arg: 'value' });
```

---

## Tool Filtering (Security)

### Restrict Tools
```json
{
  "git": {
    "enabled": true,
    "type": "built-in",
    "path": "built-in",
    "allowedTools": ["git_status", "git_log"]
    // Only these 2 tools can be called
  }
}
```

### Allow All Tools
```json
{
  "git": {
    "enabled": true,
    "type": "built-in",
    "path": "built-in"
    // No allowedTools = all tools allowed
  }
}
```

---

## Configuration Options Reference

### Built-in Server
```json
{
  "servername": {
    "enabled": true,
    "type": "built-in",
    "path": "built-in",              // or absolute path
    "allowedTools": ["tool1", "tool2"]  // optional
  }
}
```

### External Server
```json
{
  "servername": {
    "enabled": true,
    "type": "external",
    "command": "npx",                // or "node", "python", "docker"
    "args": ["-y", "package"],
    "env": {
      "VAR": "${ENV_VAR}"            // interpolate from process.env
    },
    "workingDir": "/path",           // optional
    "allowedTools": ["tool1"]        // optional
  }
}
```

---

## Common Commands

### NPX (npm packages)
```json
{
  "command": "npx",
  "args": ["-y", "@scope/package"]
}
```

### Node (local scripts)
```json
{
  "command": "node",
  "args": ["/absolute/path/to/server.js"]
}
```

### Docker
```json
{
  "command": "docker",
  "args": ["run", "-i", "--rm", "mcp-server-image"]
}
```

### Python
```json
{
  "command": "python",
  "args": ["/path/to/server.py"]
}
```

---

## Built-in Servers Available

### Filesystem (Active by default)
**Tools**: `read_file`, `write_file`, `list_directory`, `file_exists`, `get_file_stats`

### Git (Active by default)
**Tools**: `git_status`, `git_diff`, `git_log`, `git_branch`, `git_show`, `git_blame`, `git_remote`, `git_config`

---

## Example: GitHub MCP Server

### 1. Get GitHub Token
```bash
# GitHub Settings > Developer Settings > Personal Access Tokens
# Create token with 'repo' scope
export GITHUB_TOKEN="ghp_your_token_here"
```

### 2. Enable in Config
```json
{
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
      "create_issue"
    ]
  }
}
```

### 3. Use It
```javascript
await gateway.initialize(['github']);

const repos = await gateway.callTool('github', 'search_repositories', {
  query: 'language:javascript stars:>1000'
});

const issue = await gateway.callTool('github', 'create_issue', {
  owner: 'user',
  repo: 'repo',
  title: 'Bug',
  body: 'Description'
});
```

---

## Testing

### Test Built-in Server
```bash
npm test -- --testPathPattern=git-mcp-server
```

### Test Tool Filtering
```bash
npm test -- --testPathPattern=mcp-tool-filtering
```

### Test Example
```bash
node examples/mcp/analyze-repository.js /path/to/repo
```

---

## Troubleshooting

### Server Won't Start
1. Check `enabled: true` in config
2. Verify command/path is correct
3. Check environment variables are set

### Tool Blocked
- Check `allowedTools` array
- Tool names are case-sensitive
- Empty array `[]` allows all tools

### Environment Variable Not Working
- Use `${CAPITAL_SNAKE_CASE}` format
- Set variable: `export VAR=value`
- Verify: `echo $VAR`

---

## Need Help?

- **Full Guide**: `docs/guides/mcp-servers.md`
- **Examples**: `examples/mcp/analyze-repository.js`
- **Tests**: `tests/integration/git-mcp-server.test.js`
- **Summary**: `MCP_INTEGRATION_SUMMARY.md`
