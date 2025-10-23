# Universal DevTools Framework - Claude Context

This file provides essential context for Claude Code sessions working in this repository.

## Project Identity
**Universal DevTools Framework** - A production-ready CLI tool providing language-agnostic development tools with intelligent plugin management, MCP integration, and multi-agent orchestration.

**Status**: Production Ready v1.0.0
**Test Coverage**: 95%+
**Core Tech**: Node.js 18+, Jest, ESLint

## Quick Start Commands

```bash
# Run tests
npm test

# CLI usage
node bin/devtools.js --help
node bin/devtools.js python init --template fastapi
node bin/devtools.js node test --coverage

# Lint
npm run lint
```

## Architecture at a Glance

```
Universal DevTools Framework
├── Core Framework (src/core/)
│   ├── CLI routing & command execution
│   ├── Configuration manager (profile-based)
│   ├── Plugin loader (dynamic discovery)
│   └── Logger (formatted output)
├── MCP Infrastructure (src/core/mcp-*.js, src/mcp/)
│   ├── Gateway (central coordinator)
│   ├── Cache (TTL + LRU)
│   ├── Server manager (lifecycle)
│   └── Servers (filesystem, future: git, grep)
├── Agent Framework (src/agents/)
│   ├── Base agent (abstract class)
│   ├── Orchestrator (workflow coordinator)
│   ├── Specialized agents (discovery, analyzer)
│   └── Workflows (declarative definitions)
└── Plugins (src/plugins/)
    ├── Python (venv, pip, 4 templates)
    └── Node.js (npm, 5 templates)
```

## Core Files to Know

| File | Purpose |
|------|---------|
| `bin/devtools.js` | CLI entry point |
| `src/core/cli.js` | Command routing |
| `src/core/config-manager.js` | Configuration with profiles |
| `src/core/plugin-loader.js` | Plugin discovery & loading |
| `src/core/mcp-gateway.js` | MCP coordination hub |
| `src/agents/orchestrator.js` | Multi-agent workflows |
| `package.json` | Dependencies & scripts |
| `docs/PROJECT_STATUS.md` | Detailed status & metrics |

## Code Patterns

### Plugin Implementation
```javascript
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
```

### MCP Tool Usage
```javascript
const result = await mcpGateway.invokeTool('filesystem', 'read_file', {
  path: '/path/to/file'
});
```

### Agent Workflow
```javascript
const workflow = {
  name: 'analyze-project',
  agents: [
    { id: 'discover', type: 'ProjectDiscoveryAgent', inputs: {} },
    {
      id: 'analyze',
      type: 'CodeAnalyzerAgent',
      inputs: { structure: '${discover.structure}' }
    }
  ]
};
```

## Development Guidelines

### When Adding Features
1. **Plugins**: Create in `src/plugins/<name>/` with commands, templates, tests
2. **MCP Servers**: Implement JSON-RPC 2.0 via stdio in `src/mcp/<name>/`
3. **Agents**: Extend `BaseAgent`, implement `execute()`, add to orchestrator
4. **Tests**: Jest tests required (target 95%+ coverage)

### Code Standards
- ES6+ features (async/await, destructuring, arrow functions)
- Error handling with descriptive messages
- Logging via `logger.js` with appropriate levels
- Path handling with `path.join`, never hardcode
- Input validation for all user inputs

### Testing Approach
```bash
npm test              # All tests
npm run test:watch   # Watch mode
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests
```

## Project Statistics
- **Total Code**: ~15,000 LOC
- **Source Files**: 60+
- **Test Files**: 25+ (150+ tests)
- **Templates**: 50+ (9 project templates)
- **Documentation**: 10+ files (~4,000 LOC)

## Common Workflows

### Testing a Plugin Locally
```bash
cd /tmp/test-project
node /path/to/Universal-DevTools-Framework/bin/devtools.js python init --template flask
source venv/bin/activate
python main.py
```

### Running Full Test Suite
```bash
npm test -- --coverage
# Review coverage/lcov-report/index.html
```

### Adding a New Language Plugin
1. Study existing: `src/plugins/python/` or `src/plugins/nodejs/`
2. Create structure: commands/, templates/, utils/, skills/
3. Implement plugin class with standard interface
4. Add templates for common project types
5. Create comprehensive tests
6. Update documentation

## Key Constraints
- **Node.js 18+** required
- **Local execution** only (no cloud dependencies)
- **CLI-focused** (not a library)
- **Development tools** (not for production deployment)

## Known Quirks
- Jest may show active timer warnings (use `--forceExit` if needed)
- One LRU cache test can be intermittent (timing-related, functionality works)
- Integration tests may need adjustments for CI/CD (process spawning)

## Documentation Resources
- `README.md` - Getting started & quick reference (root only)
- `CONTRIBUTING.md` - Contribution guidelines (root only)
- `CHANGELOG.md` - Version history (root only)
- `docs/PROJECT_STATUS.md` - Detailed status, metrics, roadmap
- `docs/architecture/` - System architecture & design
- `docs/guides/` - Usage guides & tutorials
- `docs/implementation/` - MCP, agents, plugins details
- `docs/MCP_INTEGRATION_SUMMARY.md` - MCP server integration overview
- `docs/MCP_QUICK_REFERENCE.md` - Quick reference for MCP servers

## Documentation Policy
**IMPORTANT**: All documentation files (*.md) MUST be placed in the `/docs` directory, with the following exceptions:
- `README.md` - Project overview (root only)
- `CONTRIBUTING.md` - Contribution guidelines (root only)
- `CHANGELOG.md` - Version history (root only)

When creating new documentation:
1. Place all new `.md` files in `/docs` or appropriate subdirectory
2. Do NOT create documentation in the project root
3. Organize by type: guides/, implementation/, architecture/, etc.

## For Quick Debugging
```javascript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Test specific component
npm test -- --testPathPattern=mcp-gateway

// Run single test
npm test -- --testNamePattern="should cache responses"
```

## Philosophy
- **Plugin Architecture**: Extensible, language-agnostic design
- **Standards-Based**: MCP protocol compliance, JSON-RPC 2.0
- **Developer Experience**: Clear errors, helpful logs, rich CLI output
- **Quality First**: 95%+ test coverage, comprehensive error handling
- **Practical**: Solve real problems, avoid over-engineering

---

**Last Updated**: October 22, 2025
**Version**: 1.0.0
**Status**: Production Ready

For detailed information, see `docs/PROJECT_STATUS.md` (11KB comprehensive status doc).
