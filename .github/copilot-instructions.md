# Universal DevTools Framework - Copilot Instructions

## Project Overview
Universal development tools framework providing language-agnostic CLI tools with plugin architecture, MCP (Model Context Protocol) integration, and multi-agent orchestration.

**Tech Stack**: Node.js 18+, Jest for testing, ESLint for linting
**Entry Point**: `bin/devtools.js`
**Main Command**: `node bin/devtools.js <plugin> <command> [options]`

## Architecture

```
src/
├── core/                   # Core framework
│   ├── cli.js             # Command routing
│   ├── config-manager.js  # Configuration with profiles
│   ├── plugin-loader.js   # Dynamic plugin discovery
│   ├── mcp-gateway.js     # MCP central coordinator
│   ├── mcp-cache.js       # Response caching (TTL/LRU)
│   └── logger.js          # Formatted logging
├── plugins/               # Language plugins
│   ├── python/           # Python plugin (venv, pip, templates)
│   └── nodejs/           # Node.js plugin (npm, templates)
├── agents/               # Multi-agent orchestration
│   ├── base-agent.js     # Abstract base class
│   ├── orchestrator.js   # Workflow coordinator
│   └── workflows/        # Declarative workflows
└── mcp/                  # MCP servers
    └── filesystem/       # Filesystem MCP server
```

## Code Standards

### General
- Use ES6+ features (async/await, destructuring, arrow functions)
- Error handling: Always throw descriptive errors with context
- Logging: Use `logger.js` with appropriate levels (debug, info, success, warn, error)
- Testing: Jest tests required for new features (target 95%+ coverage)
- No external API calls without user permission

### Patterns
```javascript
// Plugin structure
class MyPlugin {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  async execute(options) {
    try {
      this.logger.info('Starting...');
      // Implementation
      this.logger.success('Completed');
    } catch (error) {
      this.logger.error('Failed', error);
      throw error;
    }
  }
}

// MCP tool invocation
const result = await mcpGateway.invokeTool('filesystem', 'read_file', {
  path: '/path/to/file'
});

// Agent orchestration
const workflow = {
  name: 'analyze-project',
  agents: [
    { id: 'discover', type: 'ProjectDiscoveryAgent', inputs: {} },
    { id: 'analyze', type: 'CodeAnalyzerAgent', inputs: { structure: '${discover.structure}' } }
  ]
};
```

## Key Commands

### Development
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run lint         # ESLint check
node bin/devtools.js --help
```

### Testing Plugins
```bash
# Python plugin
node bin/devtools.js python init --template basic
node bin/devtools.js python add requests

# Node.js plugin
node bin/devtools.js node init --template express
node bin/devtools.js node test
```

## Important Files

- `src/core/cli.js` - CLI entry point and command routing
- `src/core/config-manager.js` - Configuration management with profiles
- `src/core/plugin-loader.js` - Dynamic plugin loading
- `src/core/mcp-gateway.js` - MCP orchestration hub
- `src/agents/orchestrator.js` - Multi-agent coordinator
- `package.json` - Dependencies and scripts

## Common Tasks

### Adding a New Plugin
1. Create `src/plugins/<name>/` directory
2. Implement plugin class with `execute()` method
3. Add commands in `src/plugins/<name>/commands/`
4. Add templates in `src/plugins/<name>/templates/`
5. Create tests in `tests/plugins/<name>/`
6. Update plugin registry in `plugin-loader.js`

### Adding MCP Server
1. Create server in `src/mcp/<name>/`
2. Implement JSON-RPC 2.0 protocol via stdio
3. Register in `mcp-gateway.js`
4. Add health check endpoint
5. Add integration tests

### Adding Agent
1. Extend `BaseAgent` class
2. Implement `execute(inputs)` method
3. Define input/output schema
4. Add to orchestrator registry
5. Create workflow definition

## Best Practices

- **Configuration**: Use profiles for environment-specific settings
- **Caching**: Leverage MCP cache for repeated operations
- **Error Handling**: Always provide actionable error messages
- **Logging**: Use consistent log levels and formatting
- **Testing**: Write unit tests for logic, integration tests for workflows
- **Documentation**: Update docs when adding features

## Avoiding Common Issues

- Don't bypass virtual environments in Python plugin
- Don't hardcode paths (use path.join, resolve)
- Don't skip validation of user inputs
- Don't forget to close MCP connections on error
- Test in isolated directory to avoid polluting workspace

## Documentation
Comprehensive docs in `/docs` directory - see PROJECT_STATUS.md for current status and roadmap.
