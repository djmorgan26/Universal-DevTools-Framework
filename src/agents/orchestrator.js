const { BaseAgent } = require('./base-agent');

/**
 * Orchestrator - Coordinates multiple specialized agents
 *
 * The orchestrator analyzes tasks, delegates to appropriate sub-agents,
 * manages dependencies, and synthesizes results into concise output.
 *
 * Key features:
 * - Workflow-based execution (declarative, not imperative)
 * - Parallel and sequential agent execution
 * - Result synthesis (removes verbose context)
 * - Error handling and retry logic
 * - Dependency resolution between agents
 */
class Orchestrator extends BaseAgent {
  constructor(context) {
    super('orchestrator', context);

    this.agents = new Map(); // agentName -> AgentClass
    this.workflows = new Map(); // workflowName -> WorkflowDefinition
    this.agentInstances = new Map(); // Cache for reusable agent instances
  }

  /**
   * Register a specialized sub-agent
   * @param {string} name - Agent name
   * @param {class} AgentClass - Agent class (extends BaseAgent)
   */
  registerAgent(name, AgentClass) {
    if (!name || typeof name !== 'string') {
      throw new Error('Agent name must be a non-empty string');
    }

    if (typeof AgentClass !== 'function') {
      throw new Error('AgentClass must be a constructor function');
    }

    this.agents.set(name, AgentClass);
    this.log('debug', `Registered agent: ${name}`);
  }

  /**
   * Register a workflow definition
   * @param {string} name - Workflow name
   * @param {object} workflow - Workflow definition
   *
   * Workflow structure:
   * {
   *   name: 'analyze-project',
   *   description: 'Discover and analyze a project',
   *   steps: [
   *     { agent: { name: 'discovery', input: { path: '.' } } },
   *     {
   *       parallel: true,
   *       agents: [
   *         { name: 'code-analyzer', inputMapping: { files: '$discovery.sourceFiles' } },
   *         { name: 'dependency-resolver', inputMapping: { packageFile: '$discovery.packageFile' } }
   *       ]
   *     }
   *   ]
   * }
   */
  registerWorkflow(name, workflow) {
    if (!name || typeof name !== 'string') {
      throw new Error('Workflow name must be a non-empty string');
    }

    if (!workflow || !workflow.steps || !Array.isArray(workflow.steps)) {
      throw new Error('Workflow must have a steps array');
    }

    // Validate workflow structure
    this.validateWorkflow(workflow);

    this.workflows.set(name, workflow);
    this.log('debug', `Registered workflow: ${name}`);
  }

  /**
   * Execute the orchestrator with a task
   * Delegates to workflow execution
   *
   * @param {object} task - Task definition
   * @param {string} task.type - Task type (maps to workflow name)
   * @param {string} [task.workflow] - Override workflow name
   * @param {object} task.input - Task input parameters
   * @param {object} [task.synthesis] - Result synthesis rules
   * @returns {Promise<object>} Aggregated and synthesized result
   */
  async execute(task) {
    this.validateInput(task, ['type', 'input']);

    const timer = this.startTimer();
    this.log('info', `Orchestrating task: ${task.type}`);

    try {
      // Select workflow
      const workflow = this.selectWorkflow(task);
      if (!workflow) {
        throw new Error(`No workflow found for task type: ${task.type}`);
      }

      this.log('verbose', `Using workflow: ${workflow.name || task.workflow || task.type}`);

      // Execute workflow
      const results = await this.executeWorkflow(workflow, task);

      // Synthesize results
      const synthesized = this.synthesizeResults(results, task);

      const duration = timer.stop();
      const agentsUsed = Object.keys(results);

      return this.formatResult(synthesized, {
        workflow: workflow.name || task.workflow || task.type,
        agentsUsed,
        totalDuration: duration
      });
    } catch (error) {
      this.log('error', `Orchestration failed: ${error.message}`);
      throw this.wrapError(error, 'orchestration');
    }
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
    if (this.workflows.has(task.type)) {
      return this.workflows.get(task.type);
    }

    return null;
  }

  /**
   * Execute a workflow by running agents in sequence/parallel
   * @param {object} workflow - Workflow definition
   * @param {object} task - Original task
   * @returns {Promise<object>} Results from all agents
   */
  async executeWorkflow(workflow, task) {
    const results = {};

    for (const step of workflow.steps) {
      if (step.parallel) {
        // Execute multiple agents in parallel
        this.log('verbose', `Executing ${step.agents.length} agents in parallel`);

        const parallelResults = await Promise.all(
          step.agents.map(agentDef =>
            this.executeAgent(agentDef, task, results)
          )
        );

        // Merge results
        step.agents.forEach((agentDef, index) => {
          results[agentDef.name] = parallelResults[index];
        });
      } else if (step.agent) {
        // Execute single agent
        this.log('verbose', `Executing agent: ${step.agent.name}`);

        const agentResult = await this.executeAgent(step.agent, task, results);
        results[step.agent.name] = agentResult;
      } else {
        this.log('warn', `Invalid workflow step: ${JSON.stringify(step)}`);
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

    try {
      // Initialize agent
      await agent.initialize();

      // Prepare agent input
      const agentInput = this.prepareAgentInput(agentDef, task, previousResults);

      // Execute agent
      this.log('debug', `Starting agent: ${agentDef.name}`);
      const result = await agent.execute(agentInput);

      // Cleanup
      await agent.cleanup();

      return result;
    } catch (error) {
      this.log('error', `Agent ${agentDef.name} failed: ${error.message}`);

      // Cleanup even on failure
      try {
        await agent.cleanup();
      } catch (cleanupError) {
        this.log('warn', `Cleanup failed for ${agentDef.name}: ${cleanupError.message}`);
      }

      throw error;
    }
  }

  /**
   * Prepare input for an agent based on workflow definition
   * @param {object} agentDef - Agent definition
   * @param {object} task - Original task
   * @param {object} previousResults - Results from previous agents
   * @returns {object} Agent input
   */
  prepareAgentInput(agentDef, task, previousResults) {
    // Start with task input and agent-specific input
    const input = {
      ...task.input,
      ...(agentDef.input || {})
    };

    // Apply input mappings if defined
    if (agentDef.inputMapping) {
      for (const [key, mapping] of Object.entries(agentDef.inputMapping)) {
        const value = this.resolveMapping(mapping, previousResults);
        if (value !== undefined) {
          input[key] = value;
        }
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
    // If not a mapping placeholder, return as-is
    if (typeof mapping !== 'string' || !mapping.startsWith('$')) {
      return mapping;
    }

    // Parse path: $agentName.field1.field2...
    const path = mapping.slice(1).split('.');
    let value = results;

    for (const key of path) {
      if (value === undefined || value === null) {
        break;
      }

      // Navigate: results.agentName.data.field...
      if (value[key]) {
        value = value[key];
      } else if (value.data && value.data[key]) {
        value = value.data[key];
      } else {
        value = undefined;
        break;
      }
    }

    return value;
  }

  /**
   * Synthesize final result from all agent results
   * Removes unnecessary context and creates concise output
   *
   * @param {object} results - All agent results
   * @param {object} task - Original task
   * @returns {object} Synthesized result
   */
  synthesizeResults(results, task) {
    // Extract only essential data from each agent
    const synthesized = {};

    for (const [agentName, agentResult] of Object.entries(results)) {
      // Only include the 'data' portion, not full context
      if (agentResult && agentResult.data) {
        synthesized[agentName] = agentResult.data;
      } else {
        // Fallback: include entire result if no data field
        synthesized[agentName] = agentResult;
      }
    }

    // Apply custom synthesis rules if provided
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
    switch (rules.type) {
      case 'merge':
        // Merge all results into single object
        return Object.assign({}, ...Object.values(results));

      case 'select':
        // Select specific fields from results
        const selected = {};
        for (const [key, path] of Object.entries(rules.fields || {})) {
          const value = this.resolveMapping(path, results);
          if (value !== undefined) {
            selected[key] = value;
          }
        }
        return selected;

      case 'custom':
        // Custom function provided
        if (typeof rules.fn === 'function') {
          return rules.fn(results);
        }
        return results;

      default:
        // Unknown synthesis type, return as-is
        this.log('warn', `Unknown synthesis type: ${rules.type}`);
        return results;
    }
  }

  /**
   * Validate workflow structure
   * @param {object} workflow - Workflow to validate
   * @throws {Error} If workflow is invalid
   */
  validateWorkflow(workflow) {
    if (!workflow.steps || !Array.isArray(workflow.steps)) {
      throw new Error('Workflow must have a steps array');
    }

    for (const [index, step] of workflow.steps.entries()) {
      if (step.parallel) {
        if (!step.agents || !Array.isArray(step.agents)) {
          throw new Error(`Step ${index}: parallel step must have agents array`);
        }
        for (const agent of step.agents) {
          if (!agent.name) {
            throw new Error(`Step ${index}: agent missing name`);
          }
        }
      } else if (step.agent) {
        if (!step.agent.name) {
          throw new Error(`Step ${index}: agent missing name`);
        }
      } else {
        throw new Error(`Step ${index}: must have either 'agent' or 'parallel' with 'agents'`);
      }
    }
  }

  /**
   * Get list of registered agents
   * @returns {string[]} Agent names
   */
  getRegisteredAgents() {
    return Array.from(this.agents.keys());
  }

  /**
   * Get list of registered workflows
   * @returns {string[]} Workflow names
   */
  getRegisteredWorkflows() {
    return Array.from(this.workflows.keys());
  }

  /**
   * Check if an agent is registered
   * @param {string} name - Agent name
   * @returns {boolean} True if registered
   */
  hasAgent(name) {
    return this.agents.has(name);
  }

  /**
   * Check if a workflow is registered
   * @param {string} name - Workflow name
   * @returns {boolean} True if registered
   */
  hasWorkflow(name) {
    return this.workflows.has(name);
  }
}

module.exports = { Orchestrator };
