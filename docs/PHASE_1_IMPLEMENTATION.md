# Phase 1: Foundation - Implementation Plan

**Goal**: Get LLM integration working with basic code generation
**Timeline**: 1-2 weeks
**Success Metric**: `devtools build "hello world API"` → generates working code

---

## 📋 Tasks Breakdown

### Task 1: LLM Client (Day 1-2)

#### 1.1 Create LLM Abstraction Layer
**File**: `src/core/llm-client.js`

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

class LLMClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.provider = config.provider; // 'anthropic' or 'openai'
    this.model = config.model;

    // Initialize client based on provider
    if (this.provider === 'anthropic') {
      this.client = new Anthropic({ apiKey: config.apiKey });
    } else if (this.provider === 'openai') {
      this.client = new OpenAI({ apiKey: config.apiKey });
    }
  }

  async complete(messages, options = {}) {
    const maxTokens = options.maxTokens || this.config.maxTokens || 4096;
    const temperature = options.temperature ?? this.config.temperature ?? 0.7;

    try {
      let response;

      if (this.provider === 'anthropic') {
        response = await this.client.messages.create({
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          messages
        });

        return {
          content: response.content[0].text,
          tokens: {
            input: response.usage.input_tokens,
            output: response.usage.output_tokens,
            total: response.usage.input_tokens + response.usage.output_tokens
          },
          model: this.model,
          cost: this.calculateCost(response.usage)
        };
      } else if (this.provider === 'openai') {
        response = await this.client.chat.completions.create({
          model: this.model,
          messages,
          max_tokens: maxTokens,
          temperature
        });

        return {
          content: response.choices[0].message.content,
          tokens: {
            input: response.usage.prompt_tokens,
            output: response.usage.completion_tokens,
            total: response.usage.total_tokens
          },
          model: this.model,
          cost: this.calculateCost(response.usage)
        };
      }
    } catch (error) {
      this.logger.error(`LLM API call failed: ${error.message}`);
      throw error;
    }
  }

  calculateCost(usage) {
    // Approximate costs (update with current pricing)
    const costs = {
      'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 }, // per 1M tokens
      'gpt-4-turbo': { input: 10.00, output: 30.00 }
    };

    const modelCost = costs[this.model] || { input: 0, output: 0 };
    const inputCost = (usage.input_tokens || usage.prompt_tokens) / 1000000 * modelCost.input;
    const outputCost = (usage.output_tokens || usage.completion_tokens) / 1000000 * modelCost.output;

    return inputCost + outputCost;
  }

  async stream(messages, onChunk, options = {}) {
    // Streaming support (Phase 2)
    throw new Error('Streaming not yet implemented');
  }
}

module.exports = { LLMClient };
```

#### 1.2 Update Configuration Schema
**File**: `src/config/profiles/default.json`

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "maxTokens": 4096,
    "temperature": 0.7,
    "costTracking": true
  }
}
```

**Also add to** `src/config/schema.json`:
```json
{
  "llm": {
    "type": "object",
    "properties": {
      "provider": { "type": "string", "enum": ["anthropic", "openai"] },
      "model": { "type": "string" },
      "apiKey": { "type": "string" },
      "maxTokens": { "type": "number", "minimum": 1, "maximum": 200000 },
      "temperature": { "type": "number", "minimum": 0, "maximum": 2 }
    }
  }
}
```

#### 1.3 Add Dependencies
**File**: `package.json`

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.28.0"
  }
}
```

#### 1.4 Create Tests
**File**: `tests/unit/llm-client.test.js`

```javascript
describe('LLMClient', () => {
  it('should initialize with config');
  it('should complete messages (mock)');
  it('should calculate token costs');
  it('should handle API errors');
});
```

---

### Task 2: Code Generator Agent (Day 3-4)

#### 2.1 Create Agent
**File**: `src/agents/code-generator-agent.js`

```javascript
const { BaseAgent } = require('./base-agent');

class CodeGeneratorAgent extends BaseAgent {
  constructor(context) {
    super('code-generator', context);
    this.tools = ['filesystem', 'memory']; // MCP servers needed
    this.llmClient = context.llmClient; // Inject LLM client
  }

  async execute(task) {
    this.validateInput(task, ['specification']);

    const timer = this.startTimer();
    this.log('info', 'Generating code from specification');

    try {
      // 1. Get project context
      const projectContext = await this.getProjectContext();

      // 2. Build prompt
      const prompt = this.buildPrompt(task.specification, projectContext);

      // 3. Call LLM
      const response = await this.llmClient.complete([
        { role: 'user', content: prompt }
      ]);

      // 4. Parse generated code
      const files = this.parseCodeResponse(response.content);

      // 5. Validate code (basic checks)
      const validation = this.validateCode(files);

      const duration = timer.stop();

      return this.formatResult({
        files,
        validation,
        explanation: response.content,
        metadata: {
          tokens: response.tokens,
          cost: response.cost,
          model: response.model
        }
      }, { duration });

    } catch (error) {
      this.log('error', `Code generation failed: ${error.message}`);
      throw this.wrapError(error, 'code-generation');
    }
  }

  async getProjectContext() {
    try {
      // Read package.json or requirements.txt to understand project type
      const packageFile = await this.callTool('filesystem', 'read_file', {
        path: './package.json'
      }).catch(() => null);

      // Get project conventions from memory
      const conventions = await this.callTool('memory', 'search_nodes', {
        query: 'coding standards'
      }).catch(() => ({ text: '[]' }));

      return {
        projectType: packageFile ? 'nodejs' : 'unknown',
        conventions: JSON.parse(conventions.text || '[]')
      };
    } catch (error) {
      return { projectType: 'unknown', conventions: [] };
    }
  }

  buildPrompt(specification, context) {
    return `You are an expert software engineer. Generate production-ready code based on this specification.

SPECIFICATION:
${specification}

PROJECT CONTEXT:
- Type: ${context.projectType}
- Conventions: ${JSON.stringify(context.conventions, null, 2)}

REQUIREMENTS:
1. Write clean, well-documented code
2. Follow best practices for ${context.projectType}
3. Include error handling
4. Add helpful comments
5. Make code production-ready

OUTPUT FORMAT:
Return code in this format:

\`\`\`filename:path/to/file.ext
// code here
\`\`\`

Generate all necessary files. Be complete and thorough.`;
  }

  parseCodeResponse(content) {
    // Extract code blocks with filenames
    const files = [];
    const regex = /```(?:filename:)?([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const [, filename, code] = match;
      files.push({
        path: filename.trim(),
        content: code.trim()
      });
    }

    return files;
  }

  validateCode(files) {
    const issues = [];

    for (const file of files) {
      // Basic validation
      if (!file.path) {
        issues.push({ file: 'unknown', issue: 'Missing file path' });
      }
      if (!file.content || file.content.length === 0) {
        issues.push({ file: file.path, issue: 'Empty file' });
      }
      // Add more validation as needed
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

module.exports = { CodeGeneratorAgent };
```

#### 2.2 Update Context Injection
**File**: `src/core/cli.js` (or wherever agents are instantiated)

```javascript
const { LLMClient } = require('./llm-client');
const { CodeGeneratorAgent } = require('../agents/code-generator-agent');

// Create LLM client
const llmClient = new LLMClient(config.get('llm'), logger);

// Inject into agent context
const context = {
  logger,
  config,
  mcpGateway,
  llmClient,  // NEW
  options
};

const agent = new CodeGeneratorAgent(context);
```

#### 2.3 Create Tests
**File**: `tests/unit/code-generator-agent.test.js`

```javascript
describe('CodeGeneratorAgent', () => {
  it('should generate code from specification');
  it('should parse code response into files');
  it('should validate generated code');
  it('should include project context in prompt');
});
```

---

### Task 3: Planning Agent (Day 5)

#### 3.1 Create Agent
**File**: `src/agents/planning-agent.js`

```javascript
const { BaseAgent } = require('./base-agent');

class PlanningAgent extends BaseAgent {
  constructor(context) {
    super('planning', context);
    this.llmClient = context.llmClient;
  }

  async execute(task) {
    this.validateInput(task, ['request']);

    this.log('info', 'Creating execution plan');

    const prompt = `You are a software architect planning how to implement a feature request.

REQUEST:
${task.request}

AVAILABLE AGENTS:
- code-generator: Generates code from specifications
- test-writer: Writes tests for code (Phase 2, not available yet)
- code-reviewer: Reviews code quality (Phase 2, not available yet)
- documentation: Generates documentation (Phase 2, not available yet)

Create a plan to implement this request. For now, only use code-generator.

OUTPUT FORMAT (JSON):
{
  "summary": "brief description of what will be built",
  "tasks": [
    {
      "agent": "code-generator",
      "description": "detailed task description",
      "specification": "detailed spec for the agent"
    }
  ],
  "estimatedTime": "rough estimate in minutes"
}

Return only valid JSON, no other text.`;

    const response = await this.llmClient.complete([
      { role: 'user', content: prompt }
    ]);

    // Parse JSON from response
    const plan = this.parseJSON(response.content);

    return this.formatResult({
      plan,
      metadata: {
        tokens: response.tokens,
        cost: response.cost
      }
    });
  }

  parseJSON(content) {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      this.log('error', 'Failed to parse JSON from LLM response');
      throw new Error('Invalid JSON in response');
    }
  }
}

module.exports = { PlanningAgent };
```

---

### Task 4: Build Workflow (Day 6)

#### 4.1 Add Workflow
**File**: `src/agents/workflows.js`

```javascript
const buildFeatureWorkflow = {
  name: 'build-feature',
  description: 'Build a feature from natural language description',
  steps: [
    {
      // Step 1: Create plan
      agent: {
        name: 'planning',
        input: {
          request: '$input.description'
        }
      }
    },
    {
      // Step 2: Generate code (loop through tasks in plan)
      agent: {
        name: 'code-generator',
        inputMapping: {
          specification: '$planning.plan.tasks[0].specification'
        }
      }
    }
  ]
};

module.exports = {
  // ... existing workflows
  buildFeatureWorkflow
};
```

#### 4.2 Register Workflow
**File**: Wherever orchestrator is set up

```javascript
const { buildFeatureWorkflow } = require('./agents/workflows');

orchestrator.registerWorkflow('build-feature', buildFeatureWorkflow);
orchestrator.registerAgent('planning', PlanningAgent);
orchestrator.registerAgent('code-generator', CodeGeneratorAgent);
```

---

### Task 5: CLI Integration (Day 7-8)

#### 5.1 Create Build Command
**File**: `src/plugins/build/commands/build.js`

```javascript
const { Orchestrator } = require('../../../agents/orchestrator');
const { PlanningAgent } = require('../../../agents/planning-agent');
const { CodeGeneratorAgent } = require('../../../agents/code-generator-agent');
const { buildFeatureWorkflow } = require('../../../agents/workflows');

async function buildCommand(description, options) {
  const logger = this.logger;
  const config = this.config;
  const mcpGateway = this.mcpGateway;

  // Initialize LLM client
  const { LLMClient } = require('../../../core/llm-client');
  const llmClient = new LLMClient(config.get('llm'), logger);

  // Setup context
  const context = { logger, config, mcpGateway, llmClient, options };

  // Create orchestrator
  const orchestrator = new Orchestrator(context);
  orchestrator.registerWorkflow('build-feature', buildFeatureWorkflow);
  orchestrator.registerAgent('planning', PlanningAgent);
  orchestrator.registerAgent('code-generator', CodeGeneratorAgent);

  // Execute
  logger.info(`🚀 Building: ${description}\n`);

  try {
    const result = await orchestrator.execute({
      type: 'build-feature',
      input: { description }
    });

    // Display results
    logger.success('\n✅ Build complete!\n');

    if (result.data['code-generator']) {
      const codeResult = result.data['code-generator'];
      logger.info(`Generated ${codeResult.files.length} files:\n`);

      codeResult.files.forEach(file => {
        logger.info(`  📄 ${file.path}`);
      });

      // Write files to disk
      if (!options.dryRun) {
        logger.info('\n📝 Writing files...');

        for (const file of codeResult.files) {
          await mcpGateway.callTool('filesystem', 'write_file', {
            path: file.path,
            content: file.content
          });
          logger.success(`  ✅ ${file.path}`);
        }
      }

      // Show cost
      if (codeResult.metadata?.cost) {
        logger.info(`\n💰 Cost: $${codeResult.metadata.cost.toFixed(4)}`);
      }
    }

  } catch (error) {
    logger.error(`\n❌ Build failed: ${error.message}`);
    throw error;
  }
}

module.exports = { buildCommand };
```

#### 5.2 Create Plugin Structure
**File**: `src/plugins/build/index.js`

```javascript
const { buildCommand } = require('./commands/build');

class BuildPlugin {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  getCommands() {
    return {
      build: {
        description: 'Build a feature from natural language description',
        options: [
          { name: 'dry-run', description: 'Show what would be generated without writing files', type: 'boolean' }
        ],
        handler: buildCommand
      }
    };
  }
}

module.exports = BuildPlugin;
```

#### 5.3 Register Plugin
**File**: `src/core/plugin-loader.js`

```javascript
// Add to plugin discovery
const buildPluginPath = path.join(__dirname, '../plugins/build');
```

#### 5.4 Usage
```bash
# Set API key
export ANTHROPIC_API_KEY="sk-..."

# Build something
devtools build "a simple todo list API with Express.js"

# Dry run (don't write files)
devtools build "REST API for user management" --dry-run
```

---

### Task 6: Testing & Validation (Day 9-10)

#### 6.1 Unit Tests
```bash
npm test -- --testPathPattern=llm-client
npm test -- --testPathPattern=code-generator-agent
npm test -- --testPathPattern=planning-agent
```

#### 6.2 Integration Tests
**File**: `tests/integration/build-workflow.test.js`

```javascript
describe('Build Workflow Integration', () => {
  it('should complete full build workflow');
  it('should generate valid code files');
  it('should handle LLM errors gracefully');
  it('should track costs');
});
```

#### 6.3 End-to-End Test
```bash
# Real test with actual LLM (requires API key)
devtools build "hello world Express API" --dry-run

# Expected:
# - Planning agent creates plan
# - Code generator creates files
# - Files are valid JavaScript
# - Cost is tracked
```

---

## 📦 Deliverables Checklist

### Week 1
- [ ] LLM client implemented (Anthropic + OpenAI)
- [ ] Configuration schema updated
- [ ] Dependencies added
- [ ] Unit tests passing

### Week 2
- [ ] Code generator agent working
- [ ] Planning agent creating plans
- [ ] Build workflow executing end-to-end
- [ ] CLI command `devtools build` functional
- [ ] Integration tests passing
- [ ] E2E test with real LLM successful

---

## 🎯 Success Criteria

### MVP Working
```bash
$ export ANTHROPIC_API_KEY="sk-..."
$ devtools build "a REST API with one endpoint that returns hello world"

🚀 Building: a REST API with one endpoint that returns hello world

Planning agent: Creating execution plan...
✅ Plan created: 1 task

Code generator: Generating code...
✅ Generated 3 files:
  📄 server.js
  📄 package.json
  📄 README.md

📝 Writing files...
  ✅ server.js
  ✅ package.json
  ✅ README.md

💰 Cost: $0.0234

✅ Build complete!

Next steps:
  1. npm install
  2. npm start
  3. Test: curl http://localhost:3000
```

### Generated Code Works
```bash
$ npm install
$ npm start
Server running on port 3000

$ curl http://localhost:3000
{"message": "Hello World"}
```

---

## 🚨 Risks & Mitigation

### Risk 1: LLM API Costs
**Mitigation**:
- Add cost tracking and budgets
- Use cheaper models for testing
- Cache responses where possible

### Risk 2: Generated Code Quality
**Mitigation**:
- Start with simple examples
- Add validation layer
- Phase 2: Add code review agent

### Risk 3: API Rate Limits
**Mitigation**:
- Add retry with backoff
- Respect rate limits
- Use multiple API keys if needed

### Risk 4: Complex Specifications
**Mitigation**:
- Start with simple, well-scoped tasks
- Add clarification questions in Phase 4
- Iterative refinement

---

## 📝 Notes

- Keep prompts simple and clear
- Log all LLM interactions for debugging
- Track token usage and costs
- Validate generated code before writing to disk
- Start with well-defined, simple examples

---

**Ready to start? Begin with Task 1 (LLM Client)!**
