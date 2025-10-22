# Quick Start: Adding MCP & Multi-Agent Support

## Current State (Phases 1-4)

The framework is **production-ready** with:
- CLI framework complete (commander.js)
- Plugin system fully operational
- Configuration management with profiles
- Python & Node.js plugins
- AI skills integration
- Branding system

## What's Ready for Phase 5-6

### 1. MCP Gateway Integration (Ready Now)

The architecture already has placeholders. To implement:

```javascript
// src/core/mcp-gateway.js (NEW)
class MCPGateway {
  constructor(config) {
    this.config = config;
    this.servers = new Map();
  }

  async initialize(requiredMCPs = []) {
    // Start MCP servers specified in plugin metadata
    // Listen for tool requests from agents
  }

  async callTool(mcp, toolName, args) {
    // Route tool calls to appropriate MCP server
  }
}

// Usage in CLI.js (line 15):
this.mcpGateway = new MCPGateway(this.config);
await this.mcpGateway.initialize();
```

### 2. Agent Base Class (Ready Now)

Create standard agent interface:

```javascript
// src/agents/base-agent.js (NEW)
class BaseAgent {
  constructor(context) {
    this.context = context;  // { logger, config, mcpGateway, options }
    this.tools = [];
  }

  async initialize() {
    // Setup agent, register tools
  }

  async execute(input) {
    // Process task with MCP tool access
  }

  async cleanup() {
    // Resource cleanup
  }

  async callTool(toolName, args) {
    return await this.context.mcpGateway.callTool(toolName, args);
  }
}
```

### 3. Agent Orchestrator (Ready Now)

```javascript
// src/agents/orchestrator.js (NEW)
class Orchestrator {
  constructor(context) {
    this.context = context;
    this.agents = new Map();
  }

  registerAgent(name, AgentClass) {
    this.agents.set(name, AgentClass);
  }

  async executeWorkflow(workflow) {
    // Execute multi-agent workflow
    // Handle dependencies and communication
  }
}
```

### 4. Register Agent Commands in Plugins

```javascript
// In plugin metadata:
metadata: {
  agents: [
    { name: 'analyzer', class: 'CodeAnalyzerAgent' },
    { name: 'discoverer', class: 'ProjectDiscoveryAgent' }
  ]
}

// In plugin commands:
analyze: new AgentCommand('analyzer'),
discover: new AgentCommand('discoverer'),
```

## Integration Checklist

- [ ] Create `src/core/mcp-gateway.js`
- [ ] Create `src/core/mcp-server-manager.js` 
- [ ] Create `src/agents/base-agent.js`
- [ ] Create `src/agents/orchestrator.js`
- [ ] Update `CLI.constructor()` to initialize MCP gateway
- [ ] Update `CLI.loadPlugins()` to register agent commands
- [ ] Create bundled MCP servers (`src/mcp/servers/`)
- [ ] Add agent tests

## Configuration Already Supports MCP

In profiles (e.g., `src/config/profiles/default.json`):

```json
{
  "mcp": {
    "enabled": true,
    "autoStart": true,
    "idleTimeout": 900000
  }
}
```

## Key Extension Points

### 1. Plugin Metadata - Already Defined
```javascript
metadata: {
  requiredMCPs: ['filesystem', 'git', 'grep'],  // Declared in plugins
  agents: [                                       // NEW - add this
    { name: 'analyzer', description: 'Code analyzer' },
    { name: 'discoverer', description: 'Project discovery' }
  ]
}
```

### 2. Context Injection - Already Pattern
```javascript
const context = {
  logger: this.logger,
  config: this.config,
  mcpGateway: this.mcpGateway,  // ← Just initialize & pass
  options: this.program.opts()
};

// Commands use:
await agent.execute(context);
```

### 3. Command Registration - Already Pattern
```javascript
// In CLI.loadPlugins(), just add:
if (plugin.metadata.agents) {
  plugin.metadata.agents.forEach(agentDef => {
    // Create and register agent command
  });
}
```

## File Structure After MCP/Agent Implementation

```
src/
├── core/
│   ├── cli.js                    # (update constructor)
│   ├── config-manager.js         # (no changes)
│   ├── plugin-loader.js          # (no changes)
│   ├── registry-manager.js       # (no changes)
│   ├── logger.js                 # (no changes)
│   ├── branding-manager.js       # (no changes)
│   ├── mcp-gateway.js            # NEW
│   ├── mcp-server-manager.js     # NEW
│   └── mcp-cache.js              # NEW (optional)
├── agents/                       # NEW
│   ├── base-agent.js             # NEW
│   ├── orchestrator.js           # NEW
│   ├── code-analyzer-agent.js    # NEW
│   ├── project-discovery-agent.js # NEW
│   └── dependency-resolver-agent.js # NEW
├── mcp/                          # NEW
│   └── servers/
│       ├── filesystem-server.js
│       ├── git-server.js
│       ├── grep-server.js
│       └── bash-server.js
├── plugins/
│   ├── python/                   # (no changes)
│   └── node/                     # (no changes)
└── config/
    ├── schema.json               # (already has mcp section)
    └── profiles/
        └── default.json          # (already has mcp section)
```

## Quick Implementation Path

### Phase 5A: Core MCP (2-3 hours)
1. Implement `src/core/mcp-gateway.js`
2. Implement `src/core/mcp-server-manager.js`
3. Initialize in `CLI.constructor()`
4. Update `CLI.loadPlugins()` to start MCP servers

### Phase 5B: Agent Framework (2-3 hours)
1. Implement `src/agents/base-agent.js`
2. Implement `src/agents/orchestrator.js`
3. Create bundled MCP servers in `src/mcp/servers/`
4. Register agent commands in plugins

### Phase 6: Specific Agents (3-4 hours each)
1. `CodeAnalyzerAgent` - Analyze project code
2. `ProjectDiscoveryAgent` - Discover project structure
3. `DependencyResolverAgent` - Resolve dependencies
4. `WorkflowAgent` - Orchestrate multi-step workflows

## Testing Strategy

```javascript
// test/agents/base-agent.test.js
describe('BaseAgent', () => {
  it('should initialize with context');
  it('should call tools via mcp gateway');
  it('should cleanup resources');
});

// test/integration/mcp-agent-workflow.test.js
describe('MCP Agent Workflow', () => {
  it('should discover project structure');
  it('should analyze code');
  it('should resolve dependencies');
});
```

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| MCP server startup | <1s | Parallel startup |
| Agent initialization | <500ms | Lazy loading |
| Tool call latency | <100ms | Cached responses |
| Workflow execution | <5s | Code analysis sample |

## Key Design Principles (Already Established)

1. **Plugin-first** - Agents are plugin-optional
2. **Context injection** - Consistent service access
3. **Graceful degradation** - Works without MCP/agents
4. **Zero-config default** - MCP auto-enabled if needed
5. **Enterprise-ready** - Custom MCP servers supported

## Why This Architecture Works

- **Minimal core** - Just gateway + orchestrator
- **Extensible** - Easy to add new MCP servers
- **Modular** - Agents are independent
- **Testable** - Mock context for unit tests
- **Observable** - Logging at every level

## Next Steps

1. Read full `ARCHITECTURE.md` for deep dive
2. Check `src/core/cli.js` line 15 for MCP placeholder
3. Review `src/plugins/python/index.js` for metadata pattern
4. Start with `mcp-gateway.js` implementation
5. Follow context injection pattern used in commands

---

**Status**: Framework architecture is ready. MCP/agent implementation follows proven patterns already in use.
