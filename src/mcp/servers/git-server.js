#!/usr/bin/env node

/**
 * Git MCP Server
 *
 * Provides Git operations via MCP protocol:
 * - git_status: Get working tree status
 * - git_diff: Show changes (staged/unstaged/between commits)
 * - git_log: Show commit history with filtering
 * - git_branch: List, create, delete branches
 * - git_show: Show commit details
 * - git_blame: Show line-by-line authorship
 * - git_remote: List remote repositories
 * - git_config: Read git config values
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');
const path = require('path');

const execFileAsync = promisify(execFile);

class GitMCPServer {
  constructor() {
    this.tools = [
      {
        name: 'git_status',
        description: 'Get the status of the working tree (modified, staged, untracked files)',
        inputSchema: {
          type: 'object',
          properties: {
            workingDir: {
              type: 'string',
              description: 'Working directory (git repository path)'
            }
          },
          required: ['workingDir']
        }
      },
      {
        name: 'git_diff',
        description: 'Show changes between commits, commit and working tree, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            workingDir: {
              type: 'string',
              description: 'Working directory (git repository path)'
            },
            staged: {
              type: 'boolean',
              description: 'Show staged changes only'
            },
            commit: {
              type: 'string',
              description: 'Compare with specific commit'
            },
            file: {
              type: 'string',
              description: 'Show diff for specific file only'
            }
          },
          required: ['workingDir']
        }
      },
      {
        name: 'git_log',
        description: 'Show commit history with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            workingDir: {
              type: 'string',
              description: 'Working directory (git repository path)'
            },
            maxCount: {
              type: 'number',
              description: 'Maximum number of commits to show',
              default: 10
            },
            since: {
              type: 'string',
              description: 'Show commits since date (e.g., "2 weeks ago")'
            },
            author: {
              type: 'string',
              description: 'Filter by author name'
            },
            file: {
              type: 'string',
              description: 'Show commits affecting specific file'
            }
          },
          required: ['workingDir']
        }
      },
      {
        name: 'git_branch',
        description: 'List, show, or get information about branches',
        inputSchema: {
          type: 'object',
          properties: {
            workingDir: {
              type: 'string',
              description: 'Working directory (git repository path)'
            },
            all: {
              type: 'boolean',
              description: 'List all branches (including remote)'
            }
          },
          required: ['workingDir']
        }
      },
      {
        name: 'git_show',
        description: 'Show details of a specific commit',
        inputSchema: {
          type: 'object',
          properties: {
            workingDir: {
              type: 'string',
              description: 'Working directory (git repository path)'
            },
            commit: {
              type: 'string',
              description: 'Commit SHA or reference (e.g., HEAD, HEAD~1)',
              default: 'HEAD'
            }
          },
          required: ['workingDir']
        }
      },
      {
        name: 'git_blame',
        description: 'Show line-by-line authorship of a file',
        inputSchema: {
          type: 'object',
          properties: {
            workingDir: {
              type: 'string',
              description: 'Working directory (git repository path)'
            },
            file: {
              type: 'string',
              description: 'File to show blame for'
            },
            startLine: {
              type: 'number',
              description: 'Start line number'
            },
            endLine: {
              type: 'number',
              description: 'End line number'
            }
          },
          required: ['workingDir', 'file']
        }
      },
      {
        name: 'git_remote',
        description: 'List remote repositories',
        inputSchema: {
          type: 'object',
          properties: {
            workingDir: {
              type: 'string',
              description: 'Working directory (git repository path)'
            },
            verbose: {
              type: 'boolean',
              description: 'Show URLs for remotes'
            }
          },
          required: ['workingDir']
        }
      },
      {
        name: 'git_config',
        description: 'Read git configuration values',
        inputSchema: {
          type: 'object',
          properties: {
            workingDir: {
              type: 'string',
              description: 'Working directory (git repository path)'
            },
            key: {
              type: 'string',
              description: 'Configuration key (e.g., user.name, user.email)'
            }
          },
          required: ['workingDir', 'key']
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
          name: 'git-mcp-server',
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

    try {
      switch (name) {
        case 'git_status':
          result = await this.gitStatus(args);
          break;

        case 'git_diff':
          result = await this.gitDiff(args);
          break;

        case 'git_log':
          result = await this.gitLog(args);
          break;

        case 'git_branch':
          result = await this.gitBranch(args);
          break;

        case 'git_show':
          result = await this.gitShow(args);
          break;

        case 'git_blame':
          result = await this.gitBlame(args);
          break;

        case 'git_remote':
          result = await this.gitRemote(args);
          break;

        case 'git_config':
          result = await this.gitConfig(args);
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
    } catch (error) {
      return this.createErrorResponse(id, -32603, 'Tool execution failed', error.message);
    }
  }

  /**
   * Validate and sanitize working directory
   */
  validateWorkingDir(workingDir) {
    if (!workingDir) {
      throw new Error('workingDir is required');
    }

    // Resolve to absolute path
    const absPath = path.resolve(workingDir);

    // Basic validation - don't allow parent directory traversal in suspicious patterns
    if (absPath.includes('..')) {
      throw new Error('Invalid working directory path');
    }

    return absPath;
  }

  /**
   * Execute git command safely
   */
  async execGit(workingDir, args, options = {}) {
    const validatedDir = this.validateWorkingDir(workingDir);

    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd: validatedDir,
        maxBuffer: 1024 * 1024 * 10, // 10MB
        timeout: 30000, // 30 seconds
        ...options
      });

      return { stdout, stderr };
    } catch (error) {
      // Git error - extract useful message
      throw new Error(error.stderr || error.message);
    }
  }

  async gitStatus(args) {
    const { workingDir } = args;
    const { stdout } = await this.execGit(workingDir, ['status', '--porcelain', '--branch']);

    return {
      type: 'text',
      text: stdout
    };
  }

  async gitDiff(args) {
    const { workingDir, staged, commit, file } = args;
    const gitArgs = ['diff'];

    if (staged) {
      gitArgs.push('--cached');
    }

    if (commit) {
      gitArgs.push(commit);
    }

    if (file) {
      gitArgs.push('--', file);
    }

    const { stdout } = await this.execGit(workingDir, gitArgs);

    return {
      type: 'text',
      text: stdout || 'No changes'
    };
  }

  async gitLog(args) {
    const { workingDir, maxCount = 10, since, author, file } = args;
    const gitArgs = ['log', `--max-count=${maxCount}`, '--pretty=format:%H|%an|%ae|%ad|%s', '--date=iso'];

    if (since) {
      gitArgs.push(`--since=${since}`);
    }

    if (author) {
      gitArgs.push(`--author=${author}`);
    }

    if (file) {
      gitArgs.push('--', file);
    }

    const { stdout } = await this.execGit(workingDir, gitArgs);

    // Parse output into structured format
    const commits = stdout.split('\n').filter(line => line).map(line => {
      const [hash, authorName, authorEmail, date, message] = line.split('|');
      return { hash, authorName, authorEmail, date, message };
    });

    return {
      type: 'text',
      text: JSON.stringify(commits, null, 2)
    };
  }

  async gitBranch(args) {
    const { workingDir, all } = args;
    const gitArgs = ['branch'];

    if (all) {
      gitArgs.push('--all');
    }

    const { stdout } = await this.execGit(workingDir, gitArgs);

    return {
      type: 'text',
      text: stdout
    };
  }

  async gitShow(args) {
    const { workingDir, commit = 'HEAD' } = args;
    const { stdout } = await this.execGit(workingDir, ['show', commit, '--stat']);

    return {
      type: 'text',
      text: stdout
    };
  }

  async gitBlame(args) {
    const { workingDir, file, startLine, endLine } = args;
    const gitArgs = ['blame'];

    if (startLine && endLine) {
      gitArgs.push(`-L${startLine},${endLine}`);
    }

    gitArgs.push(file);

    const { stdout } = await this.execGit(workingDir, gitArgs);

    return {
      type: 'text',
      text: stdout
    };
  }

  async gitRemote(args) {
    const { workingDir, verbose } = args;
    const gitArgs = ['remote'];

    if (verbose) {
      gitArgs.push('-v');
    }

    const { stdout } = await this.execGit(workingDir, gitArgs);

    return {
      type: 'text',
      text: stdout || 'No remotes configured'
    };
  }

  async gitConfig(args) {
    const { workingDir, key } = args;
    const { stdout } = await this.execGit(workingDir, ['config', '--get', key]);

    return {
      type: 'text',
      text: stdout.trim()
    };
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
const server = new GitMCPServer();
server.start();
