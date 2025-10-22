const { ConfigManager } = require('../../src/core/config-manager');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

describe('ConfigManager', () => {
  let configManager;
  let tempDir;

  beforeEach(async () => {
    // Create temp directory for test configs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devtools-test-'));

    configManager = new ConfigManager();
    configManager.userConfigDir = tempDir;
    configManager.userConfigFile = path.join(tempDir, 'config.json');
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(tempDir);
  });

  describe('load()', () => {
    it('should load default profile if no user config exists', async () => {
      await configManager.load();

      expect(configManager.activeProfile).toBe('default');
      expect(configManager.profileData).toBeDefined();
      expect(configManager.profileData.profile).toBe('default');
    });

    it('should load user config if it exists', async () => {
      // Create user config
      const userConfig = {
        profile: 'default',
        customKey: 'customValue'
      };

      await fs.writeJSON(configManager.userConfigFile, userConfig);

      await configManager.load();

      expect(configManager.userConfig).toEqual(userConfig);
      expect(configManager.userConfig.customKey).toBe('customValue');
    });
  });

  describe('get()', () => {
    beforeEach(async () => {
      await configManager.load();
    });

    it('should return value from profile', () => {
      const registryType = configManager.get('python.registryType');
      expect(registryType).toBe('public');
    });

    it('should follow precedence: Profile < User < Project < Env < CLI', () => {
      // Profile default
      expect(configManager.get('python.registryType')).toBe('public');

      // User config overrides profile
      configManager.userConfig = { python: { registryType: 'custom' } };
      expect(configManager.get('python.registryType')).toBe('custom');

      // Project config overrides user
      configManager.projectConfig = { python: { registryType: 'artifactory' } };
      expect(configManager.get('python.registryType')).toBe('artifactory');

      // Env var overrides project
      process.env.DEVTOOLS_PYTHON_REGISTRYTYPE = 'public';
      expect(configManager.get('python.registryType')).toBe('public');
      delete process.env.DEVTOOLS_PYTHON_REGISTRYTYPE;

      // CLI overrides everything
      configManager.cliOverrides = { python: { registryType: 'override' } };
      expect(configManager.get('python.registryType')).toBe('override');
    });

    it('should return undefined for non-existent keys', () => {
      expect(configManager.get('nonexistent.key')).toBeUndefined();
    });
  });

  describe('set()', () => {
    beforeEach(async () => {
      await configManager.load();
    });

    it('should set value in user scope', async () => {
      await configManager.set('python.indexUrl', 'https://example.com', 'user');

      expect(configManager.userConfig.python.indexUrl).toBe('https://example.com');
    });

    it('should set value in project scope', async () => {
      await configManager.set('python.indexUrl', 'https://project.com', 'project');

      expect(configManager.projectConfig.python.indexUrl).toBe('https://project.com');
    });

    it('should set value in CLI scope', async () => {
      await configManager.set('python.indexUrl', 'https://cli.com', 'cli');

      expect(configManager.cliOverrides.python.indexUrl).toBe('https://cli.com');
    });
  });

  describe('listProfiles()', () => {
    it('should list available profiles', async () => {
      const profiles = await configManager.listProfiles();

      expect(profiles).toContain('default');
      expect(profiles).toContain('artifactory.template');
      expect(Array.isArray(profiles)).toBe(true);
    });
  });

  describe('substituteEnvVars()', () => {
    it('should substitute environment variables', () => {
      process.env.TEST_VAR = 'test_value';

      const obj = {
        key: '${TEST_VAR}',
        nested: {
          key: '${TEST_VAR}'
        }
      };

      const result = configManager.substituteEnvVars(obj);

      expect(result.key).toBe('test_value');
      expect(result.nested.key).toBe('test_value');

      delete process.env.TEST_VAR;
    });

    it('should leave unmatched variables as-is', () => {
      const obj = {
        key: '${NONEXISTENT_VAR}'
      };

      const result = configManager.substituteEnvVars(obj);

      expect(result.key).toBe('${NONEXISTENT_VAR}');
    });
  });
});
