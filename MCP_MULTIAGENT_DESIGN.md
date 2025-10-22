# MCP & Multi-Agent Orchestrator Design Plan

## Executive Summary

This document outlines the design and implementation plan for adding **Model Context Protocol (MCP)** integration and **Multi-Agent Orchestration** to the Universal DevTools Framework.

**Key Goals:**
1. Enable plugins to leverage MCP servers for tool access (filesystem, git, grep, etc.)
2. Implement an orchestrator agent that delegates specialized tasks to sub-agents
3. Sub-agents return concise results without unnecessary context
4. Maintain zero-config defaults with enterprise customization
5. Build on existing patterns (plugin system, context injection, configuration)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Entry Point                      │
│                      (bin/devtools.js)                       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Core Framework                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   CLI.js     │  │ ConfigMgr    │  │  PluginLoader   │  │
│  │              │  │              │  │                 │  │
│  └──────┬───────┘  └──────────────┘  └─────────────────┘  │
│         │                                                   │
│         │ initializes                                       │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────┐       │
│  │           MCP Gateway                            │       │
│  │  - Server lifecycle management                   │       │
│  │  - Request routing                               │       │
│  │  - Connection pooling                            │       │
│  │  - Error recovery                                │       │
│  └──────┬──────────────────────────────────────────┘       │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │
          │ provides tool access to
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent System                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Orchestrator Agent                       │  │
│  │  - Receives high-level tasks                         │  │
│  │  - Analyzes task requirements                        │  │
│  │  - Delegates to specialized sub-agents               │  │
│  │  - Aggregates and synthesizes results                │  │
│  └───────────┬──────────────────────────────────────────┘  │
│              │                                              │
│              │ delegates to                                 │
│              ▼                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Specialized Sub-Agents                    │  │
│  │                                                        │  │
│  │  ┌───────────────┐  ┌───────────────┐               │  │
│  │  │ Code Analyzer │  │   Discovery   │               │  │
│  │  │   - AST parse │  │   - File scan │               │  │
│  │  │   - Metrics   │  │   - Structure │               │  │
│  │  └───────────────┘  └───────────────┘               │  │
│  │                                                        │  │
│  │  ┌───────────────┐  ┌───────────────┐               │  │
│  │  │   Dependency  │  │  Test Runner  │               │  │
│  │  │   Resolver    │  │   - Execute   │               │  │
│  │  │   - Conflicts │  │   - Report    │               │  │
│  │  └───────────────┘  └───────────────┘               │  │
│  │                                                        │  │
│  │  Each sub-agent:                                      │  │
│  │  - Has specialized skills and knowledge               │  │
│  │  - Accesses MCP tools via mcpGateway                 │  │
│  │  - Returns concise, structured results               │  │
│  │  - No unnecessary context or verbose output          │  │
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. MCP Gateway (`src/core/mcp-gateway.js`)

**Purpose:** Central coordinator for all MCP server interactions.

**Responsibilities:**
- Start/stop MCP servers based on plugin requirements
- Route tool requests to appropriate MCP servers
- Maintain connection pool for active servers
- Handle server failures with automatic retry
- Cache responses for identical requests (optional)
- Provide simple API for agents and commands

**Interface:**
```javascript
class MCPGateway {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.serverManager = new MCPServerManager(config, logger);
    this.cache = new MCPCache();
  }

  /**
   * Initialize the gateway and start required MCP servers
   * @param {string[]} requiredMCPs - List of MCP server names needed
   */
  async initialize(requiredMCPs = []) {
    if (!this.config.get('mcp.enabled')) {
      this.logger.debug('MCP disabled in config');
      return;
    }

    // Start only required MCP servers
    for (const mcpName of requiredMCPs) {
      await this.serverManager.startServer(mcpName);
    }
  }

  /**
   * Call a tool on an MCP server
   * @param {string} mcpName - MCP server name (e.g., 'filesystem')
   * @param {string} toolName - Tool to call (e.g., 'read_file')
   * @param {object} args - Tool arguments
   * @returns {Promise<any>} Tool response
   */
  async callTool(mcpName, toolName, args) {
    const cacheKey = this.cache.generateKey(mcpName, toolName, args);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Route to server
    const result = await this.serverManager.callTool(mcpName, toolName, args);

    // Cache result
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * List available tools from all active MCP servers
   * @returns {Promise<object>} Map of mcpName -> tools[]
   */
  async listTools() {
    return await this.serverManager.listAllTools();
  }

  /**
   * Gracefully shutdown all MCP servers
   */
  async shutdown() {
    await this.serverManager.stopAll();
    this.cache.clear();
  }

  /**
   * Get health status of MCP servers
   * @returns {object} Status of each server
   */
  getStatus() {
    return this.serverManager.getStatus();
  }
}
```

**Configuration Support:**
```json
{
  "mcp": {
    "enabled": true,
    "autoStart": true,
    "idleTimeout": 900000,
    "servers": {
      "filesystem": {
        "enabled": true,
        "path": "built-in"  // or custom path
      },
      "git": {
        "enabled": true,
        "path": "built-in"
      },
      "grep": {
        "enabled": true,
        "path": "built-in"
      },
      "custom-server": {
        "enabled": true,
        "path": "/path/to/custom/mcp/server",
        "args": ["--config", "/path/to/config.json"]
      }
    }
  }
}
```

---

### 2. MCP Server Manager (`src/core/mcp-server-manager.js`)

**Purpose:** Manage the lifecycle of individual MCP servers.

**Responsibilities:**
- Spawn MCP server processes
- Maintain WebSocket/stdio connections
- Handle server crashes with auto-restart
- Monitor server health
- Implement connection pooling
- Enforce idle timeout

**Interface:**
```javascript
class MCPServerManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.servers = new Map(); // mcpName -> ServerInstance
    this.connections = new Map(); // mcpName -> Connection
  }

  /**
   * Start an MCP server by name
   * @param {string} mcpName - Server name (e.g., 'filesystem')
   */
  async startServer(mcpName) {
    if (this.servers.has(mcpName)) {
      return; // Already running
    }

    const serverConfig = this.config.get(`mcp.servers.${mcpName}`);
    if (!serverConfig || !serverConfig.enabled) {
      throw new Error(`MCP server '${mcpName}' not configured`);
    }

    // Determine server path (built-in or custom)
    const serverPath = serverConfig.path === 'built-in'
      ? this.resolveBuiltInServer(mcpName)
      : serverConfig.path;

    // Spawn server process
    const serverProcess = await this.spawnServer(serverPath, serverConfig.args);

    // Create connection (stdio or WebSocket)
    const connection = await this.createConnection(serverProcess);

    this.servers.set(mcpName, serverProcess);
    this.connections.set(mcpName, connection);

    this.logger.debug(`MCP server '${mcpName}' started`);
  }

  /**
   * Stop an MCP server
   * @param {string} mcpName - Server name
   */
  async stopServer(mcpName) {
    const serverProcess = this.servers.get(mcpName);
    const connection = this.connections.get(mcpName);

    if (connection) {
      await connection.close();
    }

    if (serverProcess) {
      serverProcess.kill();
    }

    this.servers.delete(mcpName);
    this.connections.delete(mcpName);

    this.logger.debug(`MCP server '${mcpName}' stopped`);
  }

  /**
   * Call a tool on a specific MCP server
   * @param {string} mcpName - Server name
   * @param {string} toolName - Tool to call
   * @param {object} args - Tool arguments
   * @returns {Promise<any>} Tool response
   */
  async callTool(mcpName, toolName, args) {
    const connection = this.connections.get(mcpName);
    if (!connection) {
      throw new Error(`MCP server '${mcpName}' not running`);
    }

    // Send JSON-RPC request
    const response = await connection.request({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    });

    return response.result;
  }

  /**
   * List tools available on a server
   * @param {string} mcpName - Server name
   * @returns {Promise<string[]>} List of tool names
   */
  async listTools(mcpName) {
    const connection = this.connections.get(mcpName);
    if (!connection) {
      return [];
    }

    const response = await connection.request({
      method: 'tools/list'
    });

    return response.result.tools.map(t => t.name);
  }

  /**
   * Stop all running servers
   */
  async stopAll() {
    const stopPromises = Array.from(this.servers.keys())
      .map(name => this.stopServer(name));
    await Promise.all(stopPromises);
  }

  /**
   * Get status of all servers
   * @returns {object} Status map
   */
  getStatus() {
    const status = {};
    for (const [name, process] of this.servers.entries()) {
      status[name] = {
        running: !process.killed,
        pid: process.pid,
        uptime: process.uptime
      };
    }
    return status;
  }

  // Helper methods
  resolveBuiltInServer(mcpName) {
    return path.join(__dirname, '../mcp/servers', `${mcpName}-server.js`);
  }

  async spawnServer(serverPath, args = []) {
    const { execa } = await import('execa');
    return execa.node(serverPath, args, { stdio: 'pipe' });
  }

  async createConnection(serverProcess) {
    // Create stdio-based JSON-RPC connection
    return new StdioConnection(serverProcess.stdin, serverProcess.stdout);
  }
}
```

---

### 3. Base Agent (`src/agents/base-agent.js`)

**Purpose:** Abstract base class for all agents.

**Responsibilities:**
- Provide standard interface for agents
- Handle context injection
- Provide helpers for MCP tool access
- Enforce result format (concise, structured)
- Lifecycle management (initialize, execute, cleanup)

**Interface:**
```javascript
class BaseAgent {
  constructor(name, context) {
    this.name = name;
    this.context = context; // { logger, config, mcpGateway, options }
    this.tools = []; // MCP tools this agent needs
    this.skills = []; // Agent-specific skills/prompts
  }

  /**
   * Initialize the agent (setup, register tools, etc.)
   * Subclasses can override to perform custom initialization
   */
  async initialize() {
    this.context.logger.debug(`Initializing agent: ${this.name}`);

    // Ensure required MCP servers are available
    if (this.tools.length > 0 && this.context.mcpGateway) {
      await this.context.mcpGateway.initialize(this.tools);
    }
  }

  /**
   * Execute the agent's task
   * MUST be overridden by subclasses
   * @param {object} input - Task input/parameters
   * @returns {Promise<object>} Structured result
   */
  async execute(input) {
    throw new Error(`${this.name} must implement execute() method`);
  }

  /**
   * Cleanup resources after execution
   */
  async cleanup() {
    this.context.logger.debug(`Cleaning up agent: ${this.name}`);
  }

  /**
   * Helper: Call an MCP tool
   * @param {string} mcpName - MCP server name
   * @param {string} toolName - Tool name
   * @param {object} args - Tool arguments
   * @returns {Promise<any>} Tool result
   */
  async callTool(mcpName, toolName, args) {
    if (!this.context.mcpGateway) {
      throw new Error('MCP Gateway not available');
    }
    return await this.context.mcpGateway.callTool(mcpName, toolName, args);
  }

  /**
   * Helper: Log a message with agent context
   */
  log(level, message) {
    this.context.logger[level](`[${this.name}] ${message}`);
  }

  /**
   * Helper: Format result in standard structure
   * Ensures concise output without unnecessary context
   */
  formatResult(data, metadata = {}) {
    return {
      agent: this.name,
      timestamp: new Date().toISOString(),
      data,
      metadata
    };
  }
}

module.exports = { BaseAgent };
```

---

### 4. Agent Orchestrator (`src/agents/orchestrator.js`)

**Purpose:** Coordinate multiple specialized agents to complete complex tasks.

**Responsibilities:**
- Analyze incoming tasks and determine required sub-agents
- Delegate work to specialized sub-agents in optimal order
- Handle dependencies between agent tasks
- Aggregate results from multiple agents
- Synthesize final response with minimal context
- Handle errors and retry logic

**Interface:**
```javascript
class Orchestrator extends BaseAgent {
  constructor(context) {
    super('orchestrator', context);
    this.agents = new Map(); // agentName -> AgentClass
    this.workflows = new Map(); // workflowName -> WorkflowDefinition
  }

  /**
   * Register a specialized sub-agent
   * @param {string} name - Agent name
   * @param {class} AgentClass - Agent class (extends BaseAgent)
   */
  registerAgent(name, AgentClass) {
    this.agents.set(name, AgentClass);
    this.log('debug', `Registered agent: ${name}`);
  }

  /**
   * Register a workflow definition
   * @param {string} name - Workflow name
   * @param {object} workflow - Workflow definition
   */
  registerWorkflow(name, workflow) {
    this.workflows.set(name, workflow);
    this.log('debug', `Registered workflow: ${name}`);
  }

  /**
   * Execute a high-level task by orchestrating sub-agents
   * @param {object} task - Task definition
   * @returns {Promise<object>} Aggregated result
   */
  async execute(task) {
    this.log('info', `Orchestrating task: ${task.type}`);

    // Determine which workflow to use
    const workflow = this.selectWorkflow(task);
    if (!workflow) {
      throw new Error(`No workflow found for task type: ${task.type}`);
    }

    // Execute workflow steps
    const results = await this.executeWorkflow(workflow, task);

    // Synthesize final result (concise, no unnecessary context)
    const finalResult = this.synthesizeResults(results, task);

    return this.formatResult(finalResult);
  }

  /**
   * Select appropriate workflow for a task
   * @param {object} task - Task definition
   * @returns {object} Workflow definition
   */
  selectWorkflow(task) {
    // Check if specific workflow requested
    if (task.workflow && this.workflows.has(task.workflow)) {
      return this.workflows.get(task.workflow);
    }

    // Auto-select based on task type
    return this.workflows.get(task.type);
  }

  /**
   * Execute a workflow by running agents in sequence/parallel
   * @param {object} workflow - Workflow definition
   * @param {object} task - Task input
   * @returns {Promise<object[]>} Results from all agents
   */
  async executeWorkflow(workflow, task) {
    const results = {};

    for (const step of workflow.steps) {
      if (step.parallel) {
        // Execute multiple agents in parallel
        const parallelResults = await Promise.all(
          step.agents.map(agentDef => this.executeAgent(agentDef, task, results))
        );

        // Merge results
        step.agents.forEach((agentDef, index) => {
          results[agentDef.name] = parallelResults[index];
        });
      } else {
        // Execute single agent
        const agentResult = await this.executeAgent(step.agent, task, results);
        results[step.agent.name] = agentResult;
      }
    }

    return results;
  }

  /**
   * Execute a single agent
   * @param {object} agentDef - Agent definition from workflow
   * @param {object} task - Original task
   * @param {object} previousResults - Results from previous steps
   * @returns {Promise<object>} Agent result
   */
  async executeAgent(agentDef, task, previousResults) {
    const AgentClass = this.agents.get(agentDef.name);
    if (!AgentClass) {
      throw new Error(`Agent not registered: ${agentDef.name}`);
    }

    // Create agent instance
    const agent = new AgentClass(this.context);
    await agent.initialize();

    // Prepare agent input (may depend on previous results)
    const agentInput = this.prepareAgentInput(agentDef, task, previousResults);

    // Execute agent
    this.log('verbose', `Executing agent: ${agentDef.name}`);
    const result = await agent.execute(agentInput);

    // Cleanup
    await agent.cleanup();

    return result;
  }

  /**
   * Prepare input for an agent based on workflow definition
   * @param {object} agentDef - Agent definition
   * @param {object} task - Original task
   * @param {object} previousResults - Results from previous agents
   * @returns {object} Agent input
   */
  prepareAgentInput(agentDef, task, previousResults) {
    const input = {
      ...task.input,
      ...agentDef.input
    };

    // Replace placeholders with previous results
    // e.g., "$discovery.projectRoot" -> previousResults.discovery.data.projectRoot
    if (agentDef.inputMapping) {
      for (const [key, mapping] of Object.entries(agentDef.inputMapping)) {
        const value = this.resolveMapping(mapping, previousResults);
        input[key] = value;
      }
    }

    return input;
  }

  /**
   * Resolve a mapping placeholder to actual value
   * @param {string} mapping - Mapping expression (e.g., "$discovery.projectRoot")
   * @param {object} results - Previous results
   * @returns {any} Resolved value
   */
  resolveMapping(mapping, results) {
    if (!mapping.startsWith('$')) {
      return mapping;
    }

    const path = mapping.slice(1).split('.');
    let value = results;
    for (const key of path) {
      value = value[key];
      if (value === undefined) break;
    }

    return value;
  }

  /**
   * Synthesize final result from all agent results
   * This is where we remove unnecessary context and create concise output
   * @param {object} results - All agent results
   * @param {object} task - Original task
   * @returns {object} Synthesized result
   */
  synthesizeResults(results, task) {
    // Extract only essential data from each agent
    const synthesized = {};

    for (const [agentName, agentResult] of Object.entries(results)) {
      // Only include the 'data' portion, not full context
      synthesized[agentName] = agentResult.data;
    }

    // Apply any task-specific synthesis rules
    if (task.synthesis) {
      return this.applySynthesisRules(synthesized, task.synthesis);
    }

    return synthesized;
  }

  /**
   * Apply synthesis rules to aggregate results
   * @param {object} results - Agent results
   * @param {object} rules - Synthesis rules
   * @returns {object} Synthesized result
   */
  applySynthesisRules(results, rules) {
    // Custom logic to combine/transform results
    // Example: Extract only specific fields, compute derived values, etc.

    if (rules.type === 'merge') {
      return Object.assign({}, ...Object.values(results));
    }

    if (rules.type === 'select') {
      const selected = {};
      for (const [key, path] of Object.entries(rules.fields)) {
        selected[key] = this.resolveMapping(path, results);
      }
      return selected;
    }

    return results;
  }
}

module.exports = { Orchestrator };
```

**Example Workflow Definition:**
```javascript
const analyzeProjectWorkflow = {
  name: 'analyze-project',
  description: 'Discover and analyze a project',
  steps: [
    {
      // Step 1: Discover project structure
      agent: {
        name: 'discovery',
        input: {
          path: '.'
        }
      }
    },
    {
      // Step 2: Analyze code in parallel
      parallel: true,
      agents: [
        {
          name: 'code-analyzer',
          inputMapping: {
            projectRoot: '$discovery.projectRoot',
            files: '$discovery.sourceFiles'
          }
        },
        {
          name: 'dependency-resolver',
          inputMapping: {
            projectRoot: '$discovery.projectRoot',
            packageFile: '$discovery.packageFile'
          }
        }
      ]
    }
  ]
};
```

---

### 5. Specialized Sub-Agents

#### 5.1 Project Discovery Agent (`src/agents/project-discovery-agent.js`)

**Skills:**
- Scan directory structure
- Identify project type (Python, Node.js, etc.)
- Locate configuration files
- Find source files and test files
- Detect framework (FastAPI, Express, React, etc.)

**MCP Tools Used:**
- `filesystem:list_directory`
- `filesystem:read_file`
- `grep:search`

**Output Format:**
```javascript
{
  agent: 'discovery',
  data: {
    projectRoot: '/path/to/project',
    projectType: 'python',
    framework: 'fastapi',
    structure: {
      src: [...],
      tests: [...],
      configs: [...]
    },
    packageFile: 'requirements.txt',
    dependencies: [...],
    entryPoint: 'src/main.py'
  }
}
```

#### 5.2 Code Analyzer Agent (`src/agents/code-analyzer-agent.js`)

**Skills:**
- Parse AST (Abstract Syntax Tree)
- Compute code metrics (complexity, LOC, etc.)
- Identify code smells
- Find unused imports/variables
- Check code style compliance

**MCP Tools Used:**
- `filesystem:read_file`
- `grep:search_pattern`

**Output Format:**
```javascript
{
  agent: 'code-analyzer',
  data: {
    totalFiles: 42,
    totalLines: 3500,
    metrics: {
      complexity: 'medium',
      maintainability: 85,
      testCoverage: 78
    },
    issues: [
      { file: 'src/utils.py', line: 42, type: 'unused-import', severity: 'low' }
    ],
    summary: 'Codebase is well-structured with good test coverage'
  }
}
```

#### 5.3 Dependency Resolver Agent (`src/agents/dependency-resolver-agent.js`)

**Skills:**
- Parse dependency files (requirements.txt, package.json)
- Check for outdated dependencies
- Identify security vulnerabilities
- Detect dependency conflicts
- Suggest updates

**MCP Tools Used:**
- `filesystem:read_file`
- `bash:execute` (for npm audit, pip check, etc.)

**Output Format:**
```javascript
{
  agent: 'dependency-resolver',
  data: {
    totalDependencies: 25,
    outdated: [
      { name: 'fastapi', current: '0.95.0', latest: '0.104.0' }
    ],
    vulnerabilities: [],
    conflicts: [],
    recommendations: ['Update fastapi to latest version']
  }
}
```

#### 5.4 Test Runner Agent (`src/agents/test-runner-agent.js`)

**Skills:**
- Discover test files
- Run tests (pytest, jest, etc.)
- Parse test results
- Compute coverage
- Identify failing tests

**MCP Tools Used:**
- `bash:execute`
- `filesystem:read_file`
- `grep:search`

**Output Format:**
```javascript
{
  agent: 'test-runner',
  data: {
    totalTests: 156,
    passed: 154,
    failed: 2,
    skipped: 0,
    duration: '12.5s',
    coverage: 78,
    failedTests: [
      { file: 'tests/test_api.py', test: 'test_create_user', error: '...' }
    ]
  }
}
```

---

## Agent Communication Protocol

### Task Input Format
```javascript
{
  type: 'analyze-project',  // Task type (maps to workflow)
  workflow: 'optional-override',  // Optional workflow override
  input: {
    // Task-specific parameters
    path: '.',
    options: {}
  },
  synthesis: {
    // Optional synthesis rules
    type: 'select',
    fields: {
      projectType: '$discovery.projectType',
      codeQuality: '$code-analyzer.metrics.maintainability'
    }
  }
}
```

### Agent Result Format (Standard)
```javascript
{
  agent: 'agent-name',
  timestamp: '2024-01-15T10:30:00Z',
  data: {
    // Concise, structured result
    // No unnecessary context
  },
  metadata: {
    // Optional metadata (duration, resources used, etc.)
    duration: 1500,  // ms
    toolsCalled: ['filesystem:read_file', 'grep:search']
  }
}
```

### Orchestrator Final Output (Concise)
```javascript
{
  agent: 'orchestrator',
  timestamp: '2024-01-15T10:30:05Z',
  data: {
    // Synthesized results from all sub-agents
    // Only essential information, no verbose context
    projectType: 'python',
    framework: 'fastapi',
    codeQuality: 85,
    dependencies: {
      total: 25,
      outdated: 1,
      vulnerabilities: 0
    },
    tests: {
      total: 156,
      passed: 154,
      failed: 2,
      coverage: 78
    }
  },
  metadata: {
    workflow: 'analyze-project',
    agentsUsed: ['discovery', 'code-analyzer', 'dependency-resolver', 'test-runner'],
    totalDuration: 5200  // ms
  }
}
```

---

## Implementation Phases

### Phase 5A: Core MCP Infrastructure (6-8 hours)

**Tasks:**
1. Implement `src/core/mcp-gateway.js`
   - Constructor, initialize, callTool, shutdown
   - Configuration loading
   - Error handling

2. Implement `src/core/mcp-server-manager.js`
   - Server lifecycle (start, stop)
   - Connection management (stdio, WebSocket)
   - Health monitoring

3. Implement `src/core/mcp-cache.js` (optional)
   - Simple in-memory cache with TTL
   - Cache key generation
   - Invalidation strategies

4. Create built-in MCP servers (`src/mcp/servers/`)
   - `filesystem-server.js` (read, write, list, stat)
   - `git-server.js` (status, log, diff, blame)
   - `grep-server.js` (search, regex)
   - `bash-server.js` (execute commands)

5. Update `src/core/cli.js`
   - Initialize MCP Gateway in constructor (line 15)
   - Pass mcpGateway in context injection
   - Handle shutdown on exit

6. Write tests
   - Unit tests for MCP Gateway
   - Integration tests for MCP servers
   - Mock servers for testing

**Deliverables:**
- MCP Gateway operational
- Built-in MCP servers working
- Configuration support complete
- Tests passing

---

### Phase 5B: Agent Framework (6-8 hours)

**Tasks:**
1. Implement `src/agents/base-agent.js`
   - Abstract base class
   - Standard interface (initialize, execute, cleanup)
   - Helper methods (callTool, log, formatResult)

2. Implement `src/agents/orchestrator.js`
   - Agent registration
   - Workflow registration
   - Workflow execution engine
   - Result synthesis

3. Create workflow definitions
   - Project analysis workflow
   - Dependency check workflow
   - Code review workflow

4. Update plugin system to support agents
   - Plugin metadata: `agents: []` field
   - Agent command registration in CLI
   - Context injection for agents

5. Write tests
   - Unit tests for BaseAgent
   - Unit tests for Orchestrator
   - Mock agents for testing
   - Workflow execution tests

**Deliverables:**
- Agent framework operational
- Orchestrator with workflow support
- Plugin integration complete
- Tests passing

---

### Phase 6A: Specialized Agents (3-4 hours each)

**Agent 1: Project Discovery Agent**
- Implement discovery logic
- File/directory scanning
- Project type detection
- Framework identification
- Output format compliance
- Tests

**Agent 2: Code Analyzer Agent**
- AST parsing (using Babel for JS, ast module for Python)
- Metrics computation
- Code smell detection
- Output format compliance
- Tests

**Agent 3: Dependency Resolver Agent**
- Dependency parsing
- Outdated package detection
- Vulnerability scanning
- Conflict detection
- Output format compliance
- Tests

**Agent 4: Test Runner Agent**
- Test discovery
- Test execution (pytest, jest)
- Result parsing
- Coverage computation
- Output format compliance
- Tests

---

### Phase 6B: Integration & Polish (4-6 hours)

**Tasks:**
1. Create example plugin using agents
   - `devtools analyze` command
   - Uses orchestrator with full workflow
   - Demonstrates agent coordination

2. End-to-end testing
   - Full workflow execution
   - Error handling
   - Performance testing

3. Documentation
   - Agent development guide
   - Workflow definition guide
   - MCP server customization guide
   - API reference

4. Performance optimization
   - Parallel agent execution
   - MCP connection pooling
   - Result caching

5. Error handling improvements
   - Graceful degradation
   - Retry logic
   - Helpful error messages

**Deliverables:**
- Working example plugin with agents
- Complete test suite
- Documentation
- Performance benchmarks

---

## Configuration Examples

### Default Profile (MCP Enabled)
```json
{
  "profile": "default",
  "mcp": {
    "enabled": true,
    "autoStart": true,
    "idleTimeout": 900000,
    "servers": {
      "filesystem": {
        "enabled": true,
        "path": "built-in"
      },
      "git": {
        "enabled": true,
        "path": "built-in"
      },
      "grep": {
        "enabled": true,
        "path": "built-in"
      },
      "bash": {
        "enabled": true,
        "path": "built-in"
      }
    }
  },
  "agents": {
    "maxConcurrent": 4,
    "timeout": 60000,
    "retries": 3
  }
}
```

### Enterprise Profile (Custom MCP Servers)
```json
{
  "profile": "enterprise",
  "mcp": {
    "enabled": true,
    "autoStart": true,
    "servers": {
      "filesystem": {
        "enabled": true,
        "path": "/company/mcp/servers/secure-filesystem",
        "args": ["--audit-log", "/var/log/mcp-audit.log"]
      },
      "git": {
        "enabled": true,
        "path": "built-in"
      },
      "company-analytics": {
        "enabled": true,
        "path": "/company/mcp/servers/analytics",
        "args": ["--api-key", "${ANALYTICS_API_KEY}"]
      }
    }
  }
}
```

---

## Usage Examples

### Example 1: Analyze a Project
```bash
# User runs analysis command
$ devtools analyze .

# Orchestrator delegates to sub-agents:
# 1. Discovery agent scans project structure
# 2. Code analyzer computes metrics
# 3. Dependency resolver checks dependencies
# 4. Test runner executes tests

# Output (concise):
Project Analysis Results:
━━━━━━━━━━━━━━━━━━━━━━━━
Type: Python FastAPI project
Quality: 85/100 (Good)
Dependencies: 25 total, 1 outdated
Tests: 154/156 passed (78% coverage)

Recommendations:
  • Update fastapi to 0.104.0
  • Fix 2 failing tests in test_api.py
  • Add tests for src/utils.py (low coverage)
```

### Example 2: Custom Workflow
```javascript
// In plugin command
const task = {
  type: 'custom-analysis',
  workflow: 'security-audit',
  input: {
    path: '.',
    scanDepth: 'deep'
  },
  synthesis: {
    type: 'select',
    fields: {
      vulnerabilities: '$dependency-resolver.vulnerabilities',
      codeIssues: '$code-analyzer.issues',
      summary: '$security-scanner.summary'
    }
  }
};

const result = await context.mcpGateway.orchestrator.execute(task);
console.log(result.data);
```

---

## Testing Strategy

### Unit Tests
- `test/core/mcp-gateway.test.js`
  - Server initialization
  - Tool calling
  - Error handling
  - Cache behavior

- `test/agents/base-agent.test.js`
  - Lifecycle methods
  - Tool access
  - Result formatting

- `test/agents/orchestrator.test.js`
  - Agent registration
  - Workflow execution
  - Result synthesis

### Integration Tests
- `test/integration/mcp-workflow.test.js`
  - Full workflow execution
  - Multiple agents coordination
  - Real MCP server interaction

### End-to-End Tests
- `test/e2e/analyze-command.test.js`
  - Complete analysis command
  - Real project analysis
  - Output validation

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| MCP server startup | <1s | Parallel startup |
| Agent initialization | <500ms | Lazy loading |
| Tool call latency | <100ms | Cached responses |
| Single agent execution | <2s | Average |
| Full workflow execution | <10s | 4-agent workflow |
| Orchestrator overhead | <200ms | Minimal |

---

## Key Design Principles

1. **Concise Results** - Sub-agents return only essential data, no verbose context
2. **Modular Agents** - Each agent is independent and specialized
3. **Workflow-Driven** - Orchestrator uses declarative workflows, not imperative code
4. **Tool Abstraction** - Agents use MCP tools via gateway, not direct access
5. **Zero-Config Default** - Works out of the box with built-in MCP servers
6. **Enterprise-Ready** - Custom MCP servers and workflows supported
7. **Error Resilience** - Graceful degradation, retry logic, helpful messages
8. **Observable** - Logging at every level for debugging and monitoring

---

## Next Steps

1. Review this design with stakeholders
2. Create detailed file structure for Phase 5A
3. Implement MCP Gateway (start with minimal feature set)
4. Create simple test MCP server for validation
5. Iterate and expand based on real usage

---

**Status:** Design complete, ready for implementation.
