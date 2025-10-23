const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { spawn, execSync } = require('child_process');
const { StdioConnection } = require('../../src/core/mcp-stdio-connection');

describe('Git MCP Server Integration', () => {
  let serverProcess;
  let connection;
  let testRepoDir;

  beforeAll(async () => {
    // Create temp directory for test repository
    testRepoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-mcp-test-'));

    // Initialize git repository
    execSync('git init', { cwd: testRepoDir });
    execSync('git config user.email "test@example.com"', { cwd: testRepoDir });
    execSync('git config user.name "Test User"', { cwd: testRepoDir });

    // Create initial commit
    await fs.writeFile(path.join(testRepoDir, 'README.md'), '# Test Repository\n');
    execSync('git add README.md', { cwd: testRepoDir });
    execSync('git commit -m "Initial commit"', { cwd: testRepoDir });
  });

  afterAll(async () => {
    // Cleanup temp directory
    await fs.rm(testRepoDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Start the git MCP server
    const serverPath = path.join(__dirname, '../../src/mcp/servers/git-server.js');

    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Create connection
    connection = new StdioConnection(
      serverProcess.stdin,
      serverProcess.stdout,
      null // No logger for tests
    );

    await connection.initialize();
  });

  afterEach(async () => {
    if (connection) {
      await connection.close();
    }
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  describe('initialize', () => {
    it('should respond to initialize request', async () => {
      expect(connection.initialized).toBe(true);
    });
  });

  describe('tools/list', () => {
    it('should list available git tools', async () => {
      const response = await connection.request({
        method: 'tools/list',
        params: {}
      });

      expect(response.tools).toBeDefined();
      expect(Array.isArray(response.tools)).toBe(true);
      expect(response.tools.length).toBeGreaterThan(0);

      // Check for expected tools
      const toolNames = response.tools.map(t => t.name);
      expect(toolNames).toContain('git_status');
      expect(toolNames).toContain('git_diff');
      expect(toolNames).toContain('git_log');
      expect(toolNames).toContain('git_branch');
      expect(toolNames).toContain('git_show');
      expect(toolNames).toContain('git_blame');
      expect(toolNames).toContain('git_remote');
      expect(toolNames).toContain('git_config');
    });

    it('should include tool schemas', async () => {
      const response = await connection.request({
        method: 'tools/list',
        params: {}
      });

      const statusTool = response.tools.find(t => t.name === 'git_status');
      expect(statusTool).toBeDefined();
      expect(statusTool.description).toBeDefined();
      expect(statusTool.inputSchema).toBeDefined();
      expect(statusTool.inputSchema.type).toBe('object');
      expect(statusTool.inputSchema.required).toContain('workingDir');
    });
  });

  describe('git_status', () => {
    it('should return clean status for clean repo', async () => {
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_status',
          arguments: { workingDir: testRepoDir }
        }
      });

      expect(response.content).toBeDefined();
      expect(response.content.type).toBe('text');
      expect(response.content.text).toContain('##');
    });

    it('should detect modified files', async () => {
      // Modify a file
      await fs.writeFile(path.join(testRepoDir, 'README.md'), '# Modified\n');

      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_status',
          arguments: { workingDir: testRepoDir }
        }
      });

      expect(response.content.text).toContain('README.md');

      // Restore file
      await fs.writeFile(path.join(testRepoDir, 'README.md'), '# Test Repository\n');
      execSync('git checkout README.md', { cwd: testRepoDir });
    });

    it('should handle non-git directory', async () => {
      const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'non-git-'));

      await expect(connection.request({
        method: 'tools/call',
        params: {
          name: 'git_status',
          arguments: { workingDir: nonGitDir }
        }
      })).rejects.toThrow();

      await fs.rm(nonGitDir, { recursive: true, force: true });
    });
  });

  describe('git_log', () => {
    it('should return commit history', async () => {
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_log',
          arguments: {
            workingDir: testRepoDir,
            maxCount: 5
          }
        }
      });

      expect(response.content.type).toBe('text');
      const commits = JSON.parse(response.content.text);
      expect(Array.isArray(commits)).toBe(true);
      expect(commits.length).toBeGreaterThan(0);

      const firstCommit = commits[0];
      expect(firstCommit.hash).toBeDefined();
      expect(firstCommit.authorName).toBe('Test User');
      expect(firstCommit.message).toBe('Initial commit');
    });

    it('should filter by max count', async () => {
      // Create a few more commits
      for (let i = 1; i <= 3; i++) {
        await fs.writeFile(path.join(testRepoDir, `file${i}.txt`), `Content ${i}\n`);
        execSync(`git add file${i}.txt`, { cwd: testRepoDir });
        execSync(`git commit -m "Commit ${i}"`, { cwd: testRepoDir });
      }

      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_log',
          arguments: {
            workingDir: testRepoDir,
            maxCount: 2
          }
        }
      });

      const commits = JSON.parse(response.content.text);
      expect(commits.length).toBeLessThanOrEqual(2);
    });
  });

  describe('git_diff', () => {
    it('should return empty diff for clean repo', async () => {
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_diff',
          arguments: { workingDir: testRepoDir }
        }
      });

      expect(response.content.type).toBe('text');
      expect(response.content.text).toBe('No changes');
    });

    it('should show unstaged changes', async () => {
      // Modify a file
      await fs.writeFile(path.join(testRepoDir, 'README.md'), '# Modified Content\n');

      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_diff',
          arguments: { workingDir: testRepoDir }
        }
      });

      expect(response.content.text).toContain('README.md');
      expect(response.content.text).toContain('Modified Content');

      // Restore
      execSync('git checkout README.md', { cwd: testRepoDir });
    });

    it('should show staged changes', async () => {
      // Create and stage a new file
      await fs.writeFile(path.join(testRepoDir, 'newfile.txt'), 'New content\n');
      execSync('git add newfile.txt', { cwd: testRepoDir });

      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_diff',
          arguments: {
            workingDir: testRepoDir,
            staged: true
          }
        }
      });

      expect(response.content.text).toContain('newfile.txt');
      expect(response.content.text).toContain('New content');

      // Cleanup
      execSync('git reset HEAD newfile.txt', { cwd: testRepoDir });
      await fs.unlink(path.join(testRepoDir, 'newfile.txt'));
    });
  });

  describe('git_branch', () => {
    it('should list current branch', async () => {
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_branch',
          arguments: { workingDir: testRepoDir }
        }
      });

      expect(response.content.type).toBe('text');
      expect(response.content.text).toContain('*');
    });
  });

  describe('git_show', () => {
    it('should show latest commit details', async () => {
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_show',
          arguments: {
            workingDir: testRepoDir,
            commit: 'HEAD'
          }
        }
      });

      expect(response.content.type).toBe('text');
      expect(response.content.text).toBeTruthy();
    });
  });

  describe('git_blame', () => {
    it('should show authorship for file', async () => {
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_blame',
          arguments: {
            workingDir: testRepoDir,
            file: 'README.md'
          }
        }
      });

      expect(response.content.type).toBe('text');
      expect(response.content.text).toContain('Test User');
    });
  });

  describe('git_remote', () => {
    it('should return no remotes for local repo', async () => {
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_remote',
          arguments: { workingDir: testRepoDir }
        }
      });

      expect(response.content.type).toBe('text');
      expect(response.content.text).toBe('No remotes configured');
    });
  });

  describe('git_config', () => {
    it('should read config values', async () => {
      const response = await connection.request({
        method: 'tools/call',
        params: {
          name: 'git_config',
          arguments: {
            workingDir: testRepoDir,
            key: 'user.name'
          }
        }
      });

      expect(response.content.type).toBe('text');
      expect(response.content.text).toBe('Test User');
    });
  });

  describe('error handling', () => {
    it('should return error for unknown tool', async () => {
      await expect(connection.request({
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      })).rejects.toThrow();
    });

    it('should validate workingDir parameter', async () => {
      await expect(connection.request({
        method: 'tools/call',
        params: {
          name: 'git_status',
          arguments: { workingDir: null }
        }
      })).rejects.toThrow();
    });
  });
});
