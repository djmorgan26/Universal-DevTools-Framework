#!/usr/bin/env node

/**
 * Filesystem MCP Server
 *
 * Provides file system operations via MCP protocol:
 * - read_file: Read file contents
 * - write_file: Write to file
 * - list_directory: List directory contents
 * - file_exists: Check if file exists
 * - get_file_stats: Get file statistics
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class FilesystemMCPServer {
  constructor() {
    this.tools = [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to write'
            },
            content: {
              type: 'string',
              description: 'Content to write to the file'
            }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'file_exists',
        description: 'Check if a file or directory exists',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to check'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'get_file_stats',
        description: 'Get file statistics (size, modified time, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file'
            }
          },
          required: ['path']
        }
      }
    ];

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  start() {
    // Listen for JSON-RPC requests on stdin
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        this.sendResponse(response);
      } catch (error) {
        this.sendError(null, -32700, 'Parse error', error.message);
      }
    });

    // Handle errors
    this.rl.on('error', (error) => {
      console.error('Readline error:', error);
    });

    process.on('SIGINT', () => {
      this.rl.close();
      process.exit(0);
    });
  }

  async handleRequest(request) {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id, params);

        case 'tools/list':
          return this.handleToolsList(id);

        case 'tools/call':
          return await this.handleToolCall(id, params);

        default:
          return this.createErrorResponse(id, -32601, 'Method not found');
      }
    } catch (error) {
      return this.createErrorResponse(id, -32603, 'Internal error', error.message);
    }
  }

  handleInitialize(id, params) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'filesystem-mcp-server',
          version: '1.0.0'
        }
      }
    };
  }

  handleToolsList(id) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: this.tools
      }
    };
  }

  async handleToolCall(id, params) {
    const { name, arguments: args } = params;

    let result;

    switch (name) {
      case 'read_file':
        result = await this.readFile(args.path);
        break;

      case 'write_file':
        result = await this.writeFile(args.path, args.content);
        break;

      case 'list_directory':
        result = await this.listDirectory(args.path);
        break;

      case 'file_exists':
        result = await this.fileExists(args.path);
        break;

      case 'get_file_stats':
        result = await this.getFileStats(args.path);
        break;

      default:
        return this.createErrorResponse(id, -32602, 'Unknown tool', `Tool '${name}' not found`);
    }

    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: result
      }
    };
  }

  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        type: 'text',
        text: content
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return {
        type: 'text',
        text: `Successfully wrote to ${filePath}`
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async listDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, entry.name)
      }));

      return {
        type: 'text',
        text: JSON.stringify(items, null, 2)
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return {
        type: 'text',
        text: 'true'
      };
    } catch {
      return {
        type: 'text',
        text: 'false'
      };
    }
  }

  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        type: 'text',
        text: JSON.stringify({
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString()
        }, null, 2)
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }

  createErrorResponse(id, code, message, data = null) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    };

    if (data) {
      response.error.data = data;
    }

    return response;
  }

  sendResponse(response) {
    console.log(JSON.stringify(response));
  }

  sendError(id, code, message, data) {
    this.sendResponse(this.createErrorResponse(id, code, message, data));
  }
}

// Start the server
const server = new FilesystemMCPServer();
server.start();
