const { MCPServerManager } = require('./mcp-server-manager');
const { MCPCache } = require('./mcp-cache');

/**
 * MCP Gateway - Central coordinator for all MCP server interactions
 *
 * Responsibilities:
 * - Start/stop MCP servers based on plugin requirements
 * - Route tool requests to appropriate MCP servers
 * - Maintain connection pool for active servers
 * - Handle server failures with automatic retry
 * - Cache responses for identical requests
 */
class MCPGateway {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.serverManager = new MCPServerManager(config, logger);
    this.cache = new MCPCache();
    this.initialized = false;
  }

  /**
   * Initialize the gateway and start required MCP servers
   * @param {string[]} requiredMCPs - List of MCP server names needed
   */
  async initialize(requiredMCPs = []) {
    if (this.initialized) {
      this.logger.debug('MCP Gateway already initialized');
      return;
    }

    // Check if MCP is enabled in config
    const mcpEnabled = this.config.get('mcp.enabled');
    if (!mcpEnabled) {
      this.logger.debug('MCP disabled in configuration');
      return;
    }

    this.logger.verbose('Initializing MCP Gateway...');

    try {
      // Get list of all configured servers
      const configuredServers = this.config.get('mcp.servers') || {};

      // Determine which servers to start
      const serversToStart = requiredMCPs.length > 0
        ? requiredMCPs.filter(name => configuredServers[name]?.enabled)
        : Object.keys(configuredServers).filter(name => configuredServers[name]?.enabled);

      // Start servers in parallel for better performance
      const autoStart = this.config.get('mcp.autoStart');
      if (autoStart && serversToStart.length > 0) {
        this.logger.verbose(`Starting ${serversToStart.length} MCP server(s)...`);

        const startPromises = serversToStart.map(async (serverName) => {
          try {
            await this.serverManager.startServer(serverName);
            this.logger.debug(`MCP server '${serverName}' started successfully`);
          } catch (error) {
            this.logger.warn(`Failed to start MCP server '${serverName}': ${error.message}`);
          }
        });

        await Promise.allSettled(startPromises);
      }

      this.initialized = true;
      this.logger.verbose('MCP Gateway initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize MCP Gateway: ${error.message}`);
      throw error;
    }
  }

  /**
   * Call a tool on an MCP server
   * @param {string} mcpName - MCP server name (e.g., 'filesystem')
   * @param {string} toolName - Tool to call (e.g., 'read_file')
   * @param {object} args - Tool arguments
   * @returns {Promise<any>} Tool response
   */
  async callTool(mcpName, toolName, args = {}) {
    if (!this.initialized) {
      throw new Error('MCP Gateway not initialized. Call initialize() first.');
    }

    // Generate cache key
    const cacheKey = this.cache.generateKey(mcpName, toolName, args);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      this.logger.debug(`Cache hit for ${mcpName}:${toolName}`);
      return this.cache.get(cacheKey);
    }

    // Ensure server is running
    if (!this.serverManager.isRunning(mcpName)) {
      this.logger.debug(`Starting MCP server '${mcpName}' on demand...`);
      await this.serverManager.startServer(mcpName);
    }

    // Call the tool
    try {
      this.logger.debug(`Calling tool ${mcpName}:${toolName}`);
      const result = await this.serverManager.callTool(mcpName, toolName, args);

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      this.logger.error(`Failed to call tool ${mcpName}:${toolName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * List available tools from all active MCP servers
   * @returns {Promise<object>} Map of mcpName -> tools[]
   */
  async listTools() {
    if (!this.initialized) {
      throw new Error('MCP Gateway not initialized');
    }

    const toolsMap = {};
    const runningServers = this.serverManager.getRunningServers();

    for (const serverName of runningServers) {
      try {
        const tools = await this.serverManager.listTools(serverName);
        toolsMap[serverName] = tools;
      } catch (error) {
        this.logger.warn(`Failed to list tools for ${serverName}: ${error.message}`);
        toolsMap[serverName] = [];
      }
    }

    return toolsMap;
  }

  /**
   * List all running MCP servers
   * @returns {string[]} Array of running server names
   */
  getRunningServers() {
    return this.serverManager.getRunningServers();
  }

  /**
   * Check if a specific MCP server is running
   * @param {string} mcpName - Server name
   * @returns {boolean} True if running
   */
  isServerRunning(mcpName) {
    return this.serverManager.isRunning(mcpName);
  }

  /**
   * Get health status of MCP servers
   * @returns {object} Status of each server
   */
  getStatus() {
    return this.serverManager.getStatus();
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.debug('MCP Gateway cache cleared');
  }

  /**
   * Gracefully shutdown all MCP servers
   */
  async shutdown() {
    this.logger.verbose('Shutting down MCP Gateway...');

    try {
      await this.serverManager.stopAll();
      this.cache.clear();
      this.initialized = false;
      this.logger.verbose('MCP Gateway shut down successfully');
    } catch (error) {
      this.logger.error(`Error during MCP Gateway shutdown: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restart a specific MCP server
   * @param {string} mcpName - Server name
   */
  async restartServer(mcpName) {
    this.logger.verbose(`Restarting MCP server '${mcpName}'...`);
    await this.serverManager.stopServer(mcpName);
    await this.serverManager.startServer(mcpName);
    this.logger.verbose(`MCP server '${mcpName}' restarted`);
  }
}

module.exports = { MCPGateway };
