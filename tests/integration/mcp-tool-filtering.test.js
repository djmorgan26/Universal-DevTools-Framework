const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { execSync } = require('child_process');
const { MCPGateway } = require('../../src/core/mcp-gateway');
const { ConfigManager } = require('../../src/core/config-manager');
const { Logger } = require('../../src/core/logger');

describe('MCP Tool Filtering', () => {
  let gateway;
  let config;
  let logger;
  let testRepoDir;

  beforeAll(async () => {
    // Create temp directory for test repository
    testRepoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-filter-test-'));

    // Initialize git repository
    execSync('git init', { cwd: testRepoDir });
    execSync('git config user.email "test@example.com"', { cwd: testRepoDir });
    execSync('git config user.name "Test User"', { cwd: testRepoDir });

    // Create initial commit
    await fs.writeFile(path.join(testRepoDir, 'README.md'), '# Test\n');
    execSync('git add README.md', { cwd: testRepoDir });
    execSync('git commit -m "Initial"', { cwd: testRepoDir });
  });

  afterAll(async () => {
    await fs.rm(testRepoDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Create custom config with tool filtering
    logger = new Logger({ level: 'error' }); // Suppress logs in tests

    // Create config with allowed tools
    const customConfig = {
      profile: 'test',
      version: '1.0.0',
      mcp: {
        enabled: true,
        autoStart: true,
        servers: {
          git: {
            enabled: true,
            type: 'built-in',
            path: 'built-in',
            allowedTools: ['git_status', 'git_log'] // Only these two tools allowed
          }
        }
      }
    };

    config = {
      get: (key) => {
        const keys = key.split('.');
        let value = customConfig;
        for (const k of keys) {
          value = value?.[k];
        }
        return value;
      }
    };

    gateway = new MCPGateway(config, logger);
  });

  afterEach(async () => {
    if (gateway) {
      await gateway.shutdown();
    }
  });

  describe('allowed tools', () => {
    it('should allow calling git_status (in allowedTools)', async () => {
      await gateway.initialize(['git']);

      const result = await gateway.callTool('git', 'git_status', {
        workingDir: testRepoDir
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
    });

    it('should allow calling git_log (in allowedTools)', async () => {
      await gateway.initialize(['git']);

      const result = await gateway.callTool('git', 'git_log', {
        workingDir: testRepoDir,
        maxCount: 5
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
    });
  });

  describe('blocked tools', () => {
    it('should block calling git_diff (not in allowedTools)', async () => {
      await gateway.initialize(['git']);

      await expect(
        gateway.callTool('git', 'git_diff', {
          workingDir: testRepoDir
        })
      ).rejects.toThrow(/not allowed/);
    });

    it('should block calling git_branch (not in allowedTools)', async () => {
      await gateway.initialize(['git']);

      await expect(
        gateway.callTool('git', 'git_branch', {
          workingDir: testRepoDir
        })
      ).rejects.toThrow(/not allowed/);
    });

    it('should block calling git_show (not in allowedTools)', async () => {
      await gateway.initialize(['git']);

      await expect(
        gateway.callTool('git', 'git_show', {
          workingDir: testRepoDir,
          commit: 'HEAD'
        })
      ).rejects.toThrow(/not allowed/);
    });

    it('should provide helpful error message with allowed tools list', async () => {
      await gateway.initialize(['git']);

      try {
        await gateway.callTool('git', 'git_diff', {
          workingDir: testRepoDir
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('git_diff');
        expect(error.message).toContain('not allowed');
        expect(error.message).toContain('git_status');
        expect(error.message).toContain('git_log');
      }
    });
  });

  describe('no filtering (all tools allowed)', () => {
    beforeEach(async () => {
      // Create config without allowedTools restriction
      const customConfig = {
        profile: 'test',
        version: '1.0.0',
        mcp: {
          enabled: true,
          autoStart: true,
          servers: {
            git: {
              enabled: true,
              type: 'built-in',
              path: 'built-in'
              // No allowedTools - all tools should be allowed
            }
          }
        }
      };

      config = {
        get: (key) => {
          const keys = key.split('.');
          let value = customConfig;
          for (const k of keys) {
            value = value?.[k];
          }
          return value;
        }
      };

      if (gateway) {
        await gateway.shutdown();
      }

      gateway = new MCPGateway(config, logger);
    });

    it('should allow all tools when allowedTools is not specified', async () => {
      await gateway.initialize(['git']);

      // All these should work
      await expect(
        gateway.callTool('git', 'git_status', { workingDir: testRepoDir })
      ).resolves.toBeDefined();

      await expect(
        gateway.callTool('git', 'git_log', { workingDir: testRepoDir, maxCount: 1 })
      ).resolves.toBeDefined();

      await expect(
        gateway.callTool('git', 'git_diff', { workingDir: testRepoDir })
      ).resolves.toBeDefined();

      await expect(
        gateway.callTool('git', 'git_branch', { workingDir: testRepoDir })
      ).resolves.toBeDefined();
    });
  });

  describe('empty allowedTools array', () => {
    beforeEach(async () => {
      // Create config with empty allowedTools array
      const customConfig = {
        profile: 'test',
        version: '1.0.0',
        mcp: {
          enabled: true,
          autoStart: true,
          servers: {
            git: {
              enabled: true,
              type: 'built-in',
              path: 'built-in',
              allowedTools: [] // Empty array - all tools allowed
            }
          }
        }
      };

      config = {
        get: (key) => {
          const keys = key.split('.');
          let value = customConfig;
          for (const k of keys) {
            value = value?.[k];
          }
          return value;
        }
      };

      if (gateway) {
        await gateway.shutdown();
      }

      gateway = new MCPGateway(config, logger);
    });

    it('should allow all tools when allowedTools is empty array', async () => {
      await gateway.initialize(['git']);

      // Should work since empty array means no restriction
      await expect(
        gateway.callTool('git', 'git_status', { workingDir: testRepoDir })
      ).resolves.toBeDefined();
    });
  });
});
