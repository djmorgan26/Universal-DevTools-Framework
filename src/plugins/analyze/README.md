# Analyze Plugin

Intelligent project analysis using MCP (Model Context Protocol) and multi-agent orchestration.

## Overview

The `analyze` plugin demonstrates the Universal DevTools Framework's powerful MCP + Agent orchestration capabilities. It provides deep insights into your project's structure, code quality, and technical composition through coordinated execution of specialized agents.

## Features

- **Project Discovery**: Automatically detects project type, framework, dependencies, and structure
- **Code Quality Analysis**: Analyzes code complexity, quality metrics, and identifies potential issues
- **Multi-Agent Orchestration**: Coordinates specialized agents to gather comprehensive insights
- **Multiple Output Formats**: Pretty terminal output or JSON for programmatic consumption
- **MCP Integration**: Leverages filesystem MCP server for reliable file operations

## Usage

### Basic Analysis

Analyze the current directory:

```bash
devtools analyze analyze
```

### Analyze Specific Path

Analyze a specific project directory:

```bash
devtools analyze analyze --path /path/to/project
```

### Deep Analysis

Run deep analysis with parallel agent execution:

```bash
devtools analyze analyze --deep
```

### JSON Output

Get machine-readable JSON output:

```bash
devtools analyze analyze --format json
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `--path <path>` | Project path to analyze | Current directory (`.`) |
| `--deep` | Run deep analysis with parallel execution | `false` |
| `--format <format>` | Output format: `pretty` or `json` | `pretty` |

## Example Output

### Pretty Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 PROJECT ANALYSIS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 PROJECT INFORMATION
  • Root:      /path/to/project
  • Type:      javascript
  • Framework: express

📂 PROJECT STRUCTURE
  • Total Files:     156 files
  • Source Files:    89 files
  • Test Files:      24 files
  • Config Files:    12 files

💻 CODE METRICS
  • Total Lines:     15,234
  • Code Lines:      12,456
  • Comment Lines:   1,890
  • Blank Lines:     888

✅ QUALITY SCORE: 85/100
  Excellent code quality!

⚠️  ISSUES FOUND: 3
  • High Complexity (2 files)
  • Missing JSDoc (1 file)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### JSON Format

```json
{
  "agent": "orchestrator",
  "timestamp": "2025-10-22T18:30:00.000Z",
  "data": {
    "projectRoot": "/path/to/project",
    "projectType": "javascript",
    "framework": "express",
    "fileCount": {
      "total": 156,
      "source": 89,
      "tests": 24,
      "config": 12
    },
    "totalFiles": 156,
    "totalLines": 15234,
    "codeLines": 12456,
    "commentLines": 1890,
    "qualityScore": 85,
    "issues": [
      { "type": "complexity", "severity": "warning", "files": 2 },
      { "type": "documentation", "severity": "info", "files": 1 }
    ]
  },
  "metadata": {
    "workflow": "analyze-project",
    "agentsUsed": ["discovery", "code-analyzer"],
    "totalDuration": 1234
  }
}
```

## Architecture

The analyze command showcases the framework's multi-agent architecture:

### Workflow: Simple Analysis

```
discovery (sequential)
  ↓
code-analyzer
```

The discovery agent identifies project structure, then code-analyzer performs quality analysis.

### Workflow: Deep Analysis

```
discovery (sequential)
  ↓
[code-analyzer, dependency-resolver] (parallel)
```

After discovery, multiple agents run in parallel for comprehensive analysis.

### Agents Used

1. **ProjectDiscoveryAgent**
   - Detects project type and framework
   - Identifies source directories
   - Catalogs file types and counts
   - Required MCP: `filesystem`

2. **CodeAnalyzerAgent**
   - Analyzes code quality and complexity
   - Calculates metrics (LOC, comments, etc.)
   - Identifies potential issues
   - Required MCP: `filesystem`

### MCP Servers

The analyze command requires the following MCP servers:

- **filesystem**: For file reading and directory traversal

## Configuration

The analyze plugin uses the framework's MCP configuration from `config/default.json`:

```json
{
  "mcp": {
    "enabled": true,
    "autoStart": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "path": "built-in"
      }
    }
  }
}
```

## Development

### Adding New Analysis Capabilities

To extend the analysis:

1. Create a new specialized agent in `src/agents/`
2. Register the agent with the orchestrator
3. Update the workflow definition to include the new agent
4. Add synthesis rules to include new data in results

Example:

```javascript
// Register new agent
orchestrator.registerAgent('security-scanner', SecurityScannerAgent);

// Update workflow
const analyzeProjectWorkflow = {
  name: 'analyze-project',
  steps: [
    { agent: { name: 'discovery', input: { path: projectPath } } },
    {
      parallel: true,
      agents: [
        { name: 'code-analyzer', inputMapping: { path: '$discovery.projectRoot' } },
        { name: 'security-scanner', inputMapping: { path: '$discovery.projectRoot' } }
      ]
    }
  ]
};
```

### Custom Output Formatters

Add custom formatters by extending the `displayPretty` method:

```javascript
displayPretty(result, logger, config) {
  // Custom formatting logic
  logger.info('Custom output format...');
}
```

## Troubleshooting

### MCP Server Not Starting

If the filesystem MCP server fails to start:

1. Check `config/default.json` has MCP enabled
2. Verify the filesystem server is enabled
3. Check logs with `--verbose` flag:
   ```bash
   devtools analyze analyze --verbose
   ```

### Analysis Hanging

If analysis hangs:

1. Ensure MCP servers are configured correctly
2. Check for large directories that might take time to traverse
3. Use `--deep` flag for better parallelization on large projects

### No Results Returned

If no analysis results appear:

1. Verify the path exists and is accessible
2. Check the project has recognizable files
3. Review logs for agent errors

## Performance

The analyze command is optimized for performance:

- **Sequential workflow**: ~40-100ms for small projects
- **Deep workflow (parallel)**: ~50-150ms for medium projects
- **Large projects**: May take 1-3 seconds depending on file count

MCP connection caching ensures repeated tool calls are fast.

## Related Documentation

- [MCP Infrastructure](../../docs/MCP.md)
- [Agent Framework](../../docs/AGENTS.md)
- [Plugin Development](../../docs/PLUGINS.md)
- [Orchestrator Guide](../../docs/ORCHESTRATOR.md)

## License

Part of the Universal DevTools Framework.
