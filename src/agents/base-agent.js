/**
 * Base Agent - Abstract base class for all agents
 *
 * Provides standard interface and common functionality for specialized agents.
 * All agents should extend this class and implement the execute() method.
 *
 * Key principles:
 * - Agents receive context (logger, config, mcpGateway, options)
 * - Agents declare required MCP tools
 * - Agents return concise, structured results (no verbose context)
 * - Agents are stateless between executions
 */
class BaseAgent {
  /**
   * Create a new agent
   * @param {string} name - Agent name (e.g., 'discovery', 'code-analyzer')
   * @param {object} context - Execution context
   * @param {object} context.logger - Logger instance
   * @param {object} context.config - Config manager
   * @param {object} context.mcpGateway - MCP Gateway instance
   * @param {object} context.options - CLI options
   */
  constructor(name, context) {
    if (!name) {
      throw new Error('Agent name is required');
    }

    if (!context) {
      throw new Error('Agent context is required');
    }

    this.name = name;
    this.context = context;
    this.tools = []; // MCP tools this agent needs (e.g., ['filesystem', 'git'])
    this.skills = []; // Agent-specific skills/capabilities
    this.initialized = false;
  }

  /**
   * Initialize the agent
   * Called once before execute(). Use for setup tasks like:
   * - Ensuring required MCP servers are available
   * - Loading configuration
   * - Validating prerequisites
   *
   * Subclasses can override to perform custom initialization
   */
  async initialize() {
    if (this.initialized) {
      this.log('debug', 'Already initialized');
      return;
    }

    this.log('debug', `Initializing agent: ${this.name}`);

    // Ensure required MCP servers are available
    if (this.tools.length > 0 && this.context.mcpGateway) {
      try {
        await this.context.mcpGateway.initialize(this.tools);
        this.log('debug', `MCP tools initialized: ${this.tools.join(', ')}`);
      } catch (error) {
        this.log('warn', `Failed to initialize MCP tools: ${error.message}`);
        // Continue anyway - some operations may not require all tools
      }
    }

    this.initialized = true;
  }

  /**
   * Execute the agent's task
   * MUST be overridden by subclasses
   *
   * @param {object} input - Task input/parameters
   * @returns {Promise<object>} Structured result (use formatResult())
   *
   * Example input:
   * {
   *   path: '/path/to/project',
   *   options: { depth: 'deep', includeTests: true }
   * }
   *
   * Example output (via formatResult):
   * {
   *   agent: 'discovery',
   *   timestamp: '2025-10-22T...',
   *   data: { projectType: 'python', files: [...] },
   *   metadata: { duration: 1500 }
   * }
   */
  async execute(input) {
    throw new Error(`${this.name} agent must implement execute() method`);
  }

  /**
   * Cleanup resources after execution
   * Called after execute() completes (success or failure)
   *
   * Use for:
   * - Closing file handles
   * - Clearing temporary data
   * - Resetting state
   *
   * Subclasses can override for custom cleanup
   */
  async cleanup() {
    this.log('debug', `Cleaning up agent: ${this.name}`);
    // Default: no cleanup needed
  }

  /**
   * Call an MCP tool
   * Convenience method for calling tools via MCP Gateway
   *
   * @param {string} mcpName - MCP server name (e.g., 'filesystem')
   * @param {string} toolName - Tool name (e.g., 'read_file')
   * @param {object} args - Tool arguments
   * @returns {Promise<any>} Tool result
   *
   * Example:
   * const content = await this.callTool('filesystem', 'read_file', {
   *   path: '/path/to/file.txt'
   * });
   */
  async callTool(mcpName, toolName, args = {}) {
    if (!this.context.mcpGateway) {
      throw new Error('MCP Gateway not available in context');
    }

    if (!this.initialized) {
      throw new Error('Agent must be initialized before calling tools');
    }

    this.log('debug', `Calling tool: ${mcpName}:${toolName}`);

    try {
      const result = await this.context.mcpGateway.callTool(mcpName, toolName, args);
      return result;
    } catch (error) {
      this.log('error', `Tool call failed (${mcpName}:${toolName}): ${error.message}`);
      throw error;
    }
  }

  /**
   * Log a message with agent context
   * Automatically prefixes messages with [AgentName]
   *
   * @param {string} level - Log level (debug, verbose, info, warn, error)
   * @param {string} message - Log message
   */
  log(level, message) {
    if (!this.context.logger) {
      return;
    }

    const levels = ['debug', 'verbose', 'info', 'success', 'warn', 'error'];
    if (!levels.includes(level)) {
      level = 'info';
    }

    this.context.logger[level](`[${this.name}] ${message}`);
  }

  /**
   * Format result in standard structure
   * Ensures all agents return consistent, concise output
   *
   * @param {object} data - Core result data (concise, no verbose context)
   * @param {object} metadata - Optional metadata (duration, resources used, etc.)
   * @returns {object} Formatted result
   *
   * Example:
   * return this.formatResult(
   *   { projectType: 'python', files: 42 },
   *   { duration: 1500, toolsCalled: ['filesystem:list_directory'] }
   * );
   */
  formatResult(data, metadata = {}) {
    return {
      agent: this.name,
      timestamp: new Date().toISOString(),
      data,
      metadata
    };
  }

  /**
   * Validate input parameters
   * Helper method for input validation
   *
   * @param {object} input - Input to validate
   * @param {string[]} requiredFields - Required field names
   * @throws {Error} If validation fails
   *
   * Example:
   * this.validateInput(input, ['path', 'projectType']);
   */
  validateInput(input, requiredFields = []) {
    if (!input || typeof input !== 'object') {
      throw new Error(`${this.name}: Input must be an object`);
    }

    for (const field of requiredFields) {
      if (!(field in input)) {
        throw new Error(`${this.name}: Missing required field '${field}'`);
      }
    }
  }

  /**
   * Get agent information
   * Returns metadata about the agent
   *
   * @returns {object} Agent info
   */
  getInfo() {
    return {
      name: this.name,
      tools: this.tools,
      skills: this.skills,
      initialized: this.initialized
    };
  }

  /**
   * Check if agent is ready to execute
   * @returns {boolean} True if initialized and ready
   */
  isReady() {
    return this.initialized;
  }

  /**
   * Get list of required MCP tools
   * @returns {string[]} Tool names
   */
  getRequiredTools() {
    return [...this.tools];
  }

  /**
   * Measure execution time
   * Helper for tracking operation duration
   *
   * @returns {object} Timer object with stop() method
   *
   * Example:
   * const timer = this.startTimer();
   * // ... do work ...
   * const duration = timer.stop();
   * return this.formatResult(data, { duration });
   */
  startTimer() {
    const startTime = Date.now();
    return {
      stop: () => Date.now() - startTime
    };
  }

  /**
   * Handle errors gracefully
   * Wraps errors in agent context
   *
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @returns {Error} Wrapped error
   */
  wrapError(error, operation) {
    const message = `${this.name} failed during ${operation}: ${error.message}`;
    const wrappedError = new Error(message);
    wrappedError.originalError = error;
    wrappedError.agent = this.name;
    wrappedError.operation = operation;
    return wrappedError;
  }
}

module.exports = { BaseAgent };
