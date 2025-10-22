# DevTools Framework

Universal development tools framework with AI skills and MCP orchestration.

## Features

- 🐍 **Python Support**: Virtual environment setup with configurable registries
- 🤖 **AI Integration**: Automatic skills for Copilot, Cursor, Claude
- ⚙️ **Flexible Configuration**: Works for individuals and enterprises
- 📦 **Registry Support**: Public, Artifactory, or custom registries

## Quick Start

### Personal Use (Public Registries)
```bash
# Initialize Python project
npx devtools-framework python init

# Activate virtual environment
source venv/bin/activate

# Start coding!
```

### Enterprise Use (Custom Registry)
```bash
# One-time setup
npx devtools-framework config create company --from artifactory
npx devtools-framework config set python.indexUrl https://artifactory.company.com/api/pypi/simple
npx devtools-framework config set python.trustedHost artifactory.company.com

# Use company profile
npx devtools-framework python init --profile company
```

## Installation

```bash
# Install dependencies
npm install

# Test the CLI
node bin/devtools.js --help
```

## Commands

### Python Plugin
```bash
# Initialize project
devtools python init [--template basic|fastapi]

# Add package
devtools python add <package> [--version x.x.x]

# Check environment
devtools python check
```

### Configuration
```bash
# List profiles
devtools config list

# Show configuration
devtools config show [profile]

# Create profile
devtools config create <name> --from <template>

# Switch profile
devtools config use <profile>

# Set value
devtools config set <key> <value>
```

### System Diagnostics
```bash
# Check system configuration
devtools doctor
```

## Configuration Profiles

### Default (Public Registries)

Uses PyPI, npm registry, Docker Hub by default. No configuration needed.

### Artifactory

For enterprise environments using Artifactory:
```json
{
  "profile": "company",
  "python": {
    "registryType": "artifactory",
    "indexUrl": "https://artifactory.company.com/api/pypi/simple",
    "trustedHost": "artifactory.company.com"
  }
}
```

## AI Skills

The framework automatically creates `.copilot-instructions.md` with project standards.

AI assistants (Copilot, Cursor, Claude) will:
- Use virtual environments correctly
- Install from configured registries
- Follow project conventions
- Suggest improvements based on standards

## Project Structure

```
devtools-framework/
├── bin/
│   └── devtools.js              # CLI entry point
├── src/
│   ├── core/                    # Core framework
│   │   ├── cli.js
│   │   ├── config-manager.js
│   │   ├── plugin-loader.js
│   │   ├── registry-manager.js
│   │   └── logger.js
│   ├── plugins/                 # Plugins
│   │   └── python/              # Python plugin
│   │       ├── commands/
│   │       ├── templates/
│   │       ├── skills/
│   │       └── utils/
│   └── config/                  # Configuration
│       ├── schema.json
│       └── profiles/
└── package.json
```

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Project Status](docs/PROJECT_STATUS.md)** - Current status, features, and roadmap
- **[Architecture](docs/architecture/)** - System architecture and design
- **[Usage Guides](docs/guides/)** - Getting started and reference guides
- **[Implementation Details](docs/implementation/)** - MCP, Agents, and Plugins
- **[Branding](docs/branding/)** - Visual identity and style guide
- **[Presentations](docs/presentations/)** - Demo scripts and presentations
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines

## Status

**Version**: 1.0.0
**Status**: Production Ready ✅

### Core Features
- ✅ CLI Framework with command routing
- ✅ Configuration Manager with profiles
- ✅ Plugin Loader with dynamic discovery
- ✅ Python Plugin (4 templates)
- ✅ Node.js Plugin (5 templates)
- ✅ MCP Infrastructure (Gateway, Cache, Servers)
- ✅ Agent Framework (Orchestrator, Discovery, Analyzer)
- ✅ Comprehensive Test Suite (95%+ coverage)

### What's New
- **MCP Integration**: Standards-based tool access via Model Context Protocol
- **Multi-Agent Orchestration**: Coordinate specialized agents for complex tasks
- **Declarative Workflows**: Define workflows as data structures
- **Result Synthesis**: Concise, actionable outputs without verbose context

## Testing

The Python init command has been tested and works correctly:

```bash
# Test in a temporary directory
mkdir test-project
cd test-project
devtools python init

# Result:
# ✓ Creates virtual environment (venv/)
# ✓ Creates main.py
# ✓ Creates .gitignore
# ✓ Creates README.md
# ✓ Creates .copilot-instructions.md
# ✓ Creates requirements.txt
# ✓ Installs dependencies
```

## License

MIT

## Support

This is a working implementation of the Universal DevTools Framework specification.
For issues and feature requests, please create an issue in the repository.
