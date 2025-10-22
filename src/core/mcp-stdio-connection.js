const EventEmitter = require('events');
const readline = require('readline');

/**
 * StdioConnection - JSON-RPC connection over stdio streams
 *
 * Implements JSON-RPC 2.0 protocol for MCP server communication
 * Handles bidirectional message passing over stdin/stdout
 */
class StdioConnection extends EventEmitter {
  constructor(stdin, stdout, logger) {
    super();
    this.stdin = stdin;
    this.stdout = stdout;
    this.logger = logger;
    this.requestId = 0;
    this.pendingRequests = new Map(); // id -> { resolve, reject, timeout }
    this.initialized = false;
    this.defaultTimeout = 30000; // 30 seconds

    // Setup readline interface for line-by-line reading
    this.rl = readline.createInterface({
      input: this.stdout,
      crlfDelay: Infinity
    });
  }

  /**
   * Initialize the connection
   */
  async initialize() {
    // Setup line reader
    this.rl.on('line', (line) => {
      this.handleMessage(line);
    });

    // Setup error handlers
    this.stdout.on('error', (error) => {
      this.emit('error', error);
    });

    this.stdin.on('error', (error) => {
      this.emit('error', error);
    });

    // Send initialize request
    await this.sendInitialize();

    this.initialized = true;
  }

  /**
   * Send initialize request to MCP server
   * @private
   */
  async sendInitialize() {
    try {
      const response = await this.request({
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'universal-devtools-framework',
            version: '1.0.0'
          }
        }
      });

      this.logger?.debug('MCP server initialized', response);
    } catch (error) {
      // Initialize might not be required for all servers
      this.logger?.debug('Initialize request not supported, continuing anyway');
    }
  }

  /**
   * Send a JSON-RPC request and wait for response
   * @param {object} request - Request object { method, params }
   * @param {number} timeout - Request timeout in ms
   * @returns {Promise<any>} Response result
   */
  async request(request, timeout = this.defaultTimeout) {
    if (!this.stdin || !this.stdout) {
      throw new Error('Connection not available');
    }

    const id = ++this.requestId;

    const jsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method: request.method,
      params: request.params || {}
    };

    // Create promise for response
    const responsePromise = new Promise((resolve, reject) => {
      // Setup timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle
      });
    });

    // Send request
    this.send(jsonRpcRequest);

    return responsePromise;
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   * @param {object} notification - Notification object { method, params }
   */
  notify(notification) {
    const jsonRpcNotification = {
      jsonrpc: '2.0',
      method: notification.method,
      params: notification.params || {}
    };

    this.send(jsonRpcNotification);
  }

  /**
   * Send raw JSON-RPC message
   * @param {object} message - JSON-RPC message
   * @private
   */
  send(message) {
    const json = JSON.stringify(message);
    this.stdin.write(json + '\n');
  }

  /**
   * Handle incoming message from server
   * @param {string} line - JSON line from server
   * @private
   */
  handleMessage(line) {
    if (!line.trim()) {
      return;
    }

    try {
      const message = JSON.parse(line);

      // Handle response
      if (message.id !== undefined && this.pendingRequests.has(message.id)) {
        this.handleResponse(message);
      }
      // Handle notification from server
      else if (message.method) {
        this.handleNotification(message);
      }
      // Unknown message
      else {
        this.logger?.warn('Received unknown message format:', message);
      }
    } catch (error) {
      this.logger?.error('Failed to parse JSON-RPC message:', error.message);
      this.logger?.debug('Raw message:', line);
    }
  }

  /**
   * Handle JSON-RPC response
   * @param {object} message - Response message
   * @private
   */
  handleResponse(message) {
    const pending = this.pendingRequests.get(message.id);

    if (!pending) {
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);

    // Handle error response
    if (message.error) {
      pending.reject(new Error(message.error.message || 'Unknown error'));
      return;
    }

    // Handle success response
    pending.resolve(message.result);
  }

  /**
   * Handle JSON-RPC notification from server
   * @param {object} message - Notification message
   * @private
   */
  handleNotification(message) {
    this.emit('notification', {
      method: message.method,
      params: message.params
    });

    // Emit specific event for the notification method
    this.emit(message.method, message.params);
  }

  /**
   * Close the connection
   */
  async close() {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    // Close readline interface
    if (this.rl) {
      this.rl.close();
    }

    // Close streams
    if (this.stdin && !this.stdin.destroyed) {
      this.stdin.end();
    }

    this.initialized = false;
    this.emit('close');
  }

  /**
   * Check if connection is alive
   * @returns {boolean} True if connection is alive
   */
  isAlive() {
    return this.initialized &&
           this.stdin && !this.stdin.destroyed &&
           this.stdout && !this.stdout.destroyed;
  }
}

module.exports = { StdioConnection };
