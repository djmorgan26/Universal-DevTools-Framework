const path = require('path');
const { StdioConnection } = require('./mcp-stdio-connection');

/**
 * MCP Server Manager - Manages lifecycle of MCP servers
 *
 * Responsibilities:
 * - Spawn MCP server processes
 * - Maintain connections (stdio/WebSocket)
 * - Handle server crashes with auto-restart
 * - Monitor server health
 * - Route tool calls to appropriate servers
 */
class MCPServerManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.servers = new Map(); // mcpName -> ServerInstance
    this.connections = new Map(); // mcpName -> Connection
    this.processes = new Map(); // mcpName -> ChildProcess
    this.retryCount = new Map(); // mcpName -> number
    this.maxRetries = 3;
  }

  /**
   * Start an MCP server by name
   * @param {string} mcpName - Server name (e.g., 'filesystem')
   */
  async startServer(mcpName) {
    // Check if already running
    if (this.isRunning(mcpName)) {
      this.logger.debug(`MCP server '${mcpName}' already running`);
      return;
    }

    // Get server configuration
    const serverConfig = this.config.get(`mcp.servers.${mcpName}`);

    if (!serverConfig) {
      throw new Error(`MCP server '${mcpName}' not configured`);
    }

    if (!serverConfig.enabled) {
      throw new Error(`MCP server '${mcpName}' is disabled in configuration`);
    }

    this.logger.debug(`Starting MCP server '${mcpName}'...`);

    try {
      // Determine server type and spawn accordingly
      const serverType = serverConfig.type || 'built-in';
      let serverProcess;
      let serverPath;

      if (serverType === 'built-in') {
        // Built-in server: resolve path and spawn with node
        serverPath = serverConfig.path === 'built-in'
          ? this.resolveBuiltInServer(mcpName)
          : serverConfig.path;
        serverProcess = await this.spawnBuiltInServer(serverPath, serverConfig.args || []);
      } else if (serverType === 'external') {
        // External server: use custom command (e.g., npx, docker)
        serverPath = `${serverConfig.command} ${serverConfig.args.join(' ')}`;
        serverProcess = await this.spawnExternalServer(serverConfig);
      } else {
        throw new Error(`Unknown server type '${serverType}' for '${mcpName}'`);
      }

      // Create connection (stdio-based JSON-RPC)
      const connection = await this.createConnection(serverProcess);

      // Setup error handlers
      this.setupErrorHandlers(mcpName, serverProcess, connection);

      // Store references
      this.processes.set(mcpName, serverProcess);
      this.connections.set(mcpName, connection);
      this.servers.set(mcpName, {
        name: mcpName,
        path: serverPath,
        config: serverConfig,
        startedAt: Date.now(),
        pid: serverProcess.pid
      });

      // Reset retry count on successful start
      this.retryCount.set(mcpName, 0);

      this.logger.debug(`MCP server '${mcpName}' started (PID: ${serverProcess.pid})`);
    } catch (error) {
      this.logger.error(`Failed to start MCP server '${mcpName}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop an MCP server
   * @param {string} mcpName - Server name
   */
  async stopServer(mcpName) {
    if (!this.isRunning(mcpName)) {
      this.logger.debug(`MCP server '${mcpName}' not running`);
      return;
    }

    this.logger.debug(`Stopping MCP server '${mcpName}'...`);

    const connection = this.connections.get(mcpName);
    const serverProcess = this.processes.get(mcpName);

    try {
      // Close connection gracefully
      if (connection) {
        await connection.close();
      }

      // Kill process
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    } catch (error) {
      this.logger.warn(`Error stopping MCP server '${mcpName}': ${error.message}`);
    } finally {
      // Cleanup references
      this.connections.delete(mcpName);
      this.processes.delete(mcpName);
      this.servers.delete(mcpName);
      this.logger.debug(`MCP server '${mcpName}' stopped`);
    }
  }

  /**
   * Stop all running MCP servers
   */
  async stopAll() {
    const serverNames = Array.from(this.servers.keys());

    this.logger.debug(`Stopping ${serverNames.length} MCP server(s)...`);

    const stopPromises = serverNames.map(name => this.stopServer(name));
    await Promise.allSettled(stopPromises);

    this.logger.debug('All MCP servers stopped');
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

    try {
      // Send JSON-RPC request to call tool
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      });

      return response.content || response.result;
    } catch (error) {
      this.logger.error(`Tool call failed (${mcpName}:${toolName}): ${error.message}`);
      throw error;
    }
  }

  /**
   * List tools available on a server
   * @param {string} mcpName - Server name
   * @returns {Promise<Array>} List of tools
   */
  async listTools(mcpName) {
    const connection = this.connections.get(mcpName);

    if (!connection) {
      return [];
    }

    try {
      const response = await connection.request({
        method: 'tools/list',
        params: {}
      });

      return response.tools || [];
    } catch (error) {
      this.logger.warn(`Failed to list tools for ${mcpName}: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if a server is running
   * @param {string} mcpName - Server name
   * @returns {boolean} True if running
   */
  isRunning(mcpName) {
    const serverProcess = this.processes.get(mcpName);
    return serverProcess && !serverProcess.killed;
  }

  /**
   * Get list of running servers
   * @returns {string[]} Array of server names
   */
  getRunningServers() {
    return Array.from(this.servers.keys());
  }

  /**
   * Get status of all servers
   * @returns {object} Status map
   */
  getStatus() {
    const status = {};

    for (const [name, server] of this.servers.entries()) {
      const serverProcess = this.processes.get(name);
      const uptime = Date.now() - server.startedAt;

      status[name] = {
        running: this.isRunning(name),
        pid: server.pid,
        uptime: uptime,
        retries: this.retryCount.get(name) || 0
      };
    }

    return status;
  }

  /**
   * Resolve path to built-in MCP server
   * @param {string} mcpName - Server name
   * @returns {string} Server path
   * @private
   */
  resolveBuiltInServer(mcpName) {
    return path.join(__dirname, '../mcp/servers', `${mcpName}-server.js`);
  }

  /**
   * Spawn a built-in MCP server process
   * @param {string} serverPath - Path to server executable
   * @param {string[]} args - Server arguments
   * @returns {Promise<ChildProcess>} Server process
   * @private
   */
  async spawnBuiltInServer(serverPath, args = []) {
    const { spawn } = require('child_process');

    // Spawn as Node.js process
    const serverProcess = spawn('node', [serverPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production'
      }
    });

    return serverProcess;
  }

  /**
   * Spawn an external MCP server process (e.g., via npx, docker)
   * @param {object} serverConfig - Server configuration
   * @returns {Promise<ChildProcess>} Server process
   * @private
   */
  async spawnExternalServer(serverConfig) {
    const { spawn } = require('child_process');

    if (!serverConfig.command) {
      throw new Error('External server requires "command" field in configuration');
    }

    if (!serverConfig.args || !Array.isArray(serverConfig.args)) {
      throw new Error('External server requires "args" array in configuration');
    }

    // Interpolate environment variables in env config
    const serverEnv = this.interpolateEnvVars(serverConfig.env || {});

    // Merge with process env
    const env = {
      ...process.env,
      ...serverEnv
    };

    // Spawn external command
    this.logger.debug(`Spawning external server: ${serverConfig.command} ${serverConfig.args.join(' ')}`);

    const serverProcess = spawn(serverConfig.command, serverConfig.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      cwd: serverConfig.workingDir || process.cwd()
    });

    return serverProcess;
  }

  /**
   * Interpolate environment variables from config (e.g., ${GITHUB_TOKEN} -> process.env.GITHUB_TOKEN)
   * @param {object} envConfig - Environment variable config
   * @returns {object} Interpolated environment variables
   * @private
   */
  interpolateEnvVars(envConfig) {
    const result = {};

    for (const [key, value] of Object.entries(envConfig)) {
      // Check for ${VAR} pattern
      const match = /^\$\{([A-Z_][A-Z0-9_]*)\}$/.exec(value);

      if (match) {
        const envVarName = match[1];
        const envValue = process.env[envVarName];

        if (!envValue) {
          this.logger.warn(`Environment variable ${envVarName} not set for MCP server`);
        }

        result[key] = envValue || '';
      } else {
        // Literal value
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Create a connection to MCP server
   * @param {ChildProcess} serverProcess - Server process
   * @returns {Promise<StdioConnection>} Connection instance
   * @private
   */
  async createConnection(serverProcess) {
    const connection = new StdioConnection(
      serverProcess.stdin,
      serverProcess.stdout,
      this.logger
    );

    await connection.initialize();

    return connection;
  }

  /**
   * Setup error handlers for server process
   * @param {string} mcpName - Server name
   * @param {ChildProcess} serverProcess - Server process
   * @param {StdioConnection} connection - Connection instance
   * @private
   */
  setupErrorHandlers(mcpName, serverProcess, connection) {
    // Handle process errors
    serverProcess.on('error', (error) => {
      this.logger.error(`MCP server '${mcpName}' process error: ${error.message}`);
      this.handleServerFailure(mcpName);
    });

    // Handle process exit
    serverProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        this.logger.warn(`MCP server '${mcpName}' exited with code ${code}`);
        this.handleServerFailure(mcpName);
      }
    });

    // Handle stderr output
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        this.logger.debug(`MCP server '${mcpName}' stderr: ${data.toString().trim()}`);
      });
    }

    // Handle connection errors
    connection.on('error', (error) => {
      this.logger.error(`MCP server '${mcpName}' connection error: ${error.message}`);
    });
  }

  /**
   * Handle server failure with retry logic
   * @param {string} mcpName - Server name
   * @private
   */
  async handleServerFailure(mcpName) {
    const retries = this.retryCount.get(mcpName) || 0;

    // Cleanup failed server
    await this.stopServer(mcpName);

    // Attempt restart if under retry limit
    if (retries < this.maxRetries) {
      this.logger.warn(`Attempting to restart MCP server '${mcpName}' (retry ${retries + 1}/${this.maxRetries})...`);
      this.retryCount.set(mcpName, retries + 1);

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, retries), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        await this.startServer(mcpName);
        this.logger.info(`MCP server '${mcpName}' restarted successfully`);
      } catch (error) {
        this.logger.error(`Failed to restart MCP server '${mcpName}': ${error.message}`);
      }
    } else {
      this.logger.error(`MCP server '${mcpName}' failed after ${this.maxRetries} retries`);
    }
  }
}

module.exports = { MCPServerManager };
