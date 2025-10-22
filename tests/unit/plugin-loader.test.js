const { PluginLoader } = require('../../src/core/plugin-loader');
const path = require('path');

describe('PluginLoader', () => {
  let pluginLoader;

  beforeEach(() => {
    pluginLoader = new PluginLoader();
  });

  describe('loadAll()', () => {
    it('should load all plugins from plugins directory', async () => {
      const plugins = await pluginLoader.loadAll();

      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBeGreaterThan(0);

      // Should load python plugin
      const pythonPlugin = plugins.find(p => p.name === 'python');
      expect(pythonPlugin).toBeDefined();
    });

    it('should cache loaded plugins', async () => {
      const plugins1 = await pluginLoader.loadAll();
      const plugins2 = await pluginLoader.loadAll();

      expect(plugins1).toEqual(plugins2);
    });
  });

  describe('validate()', () => {
    it('should validate plugin with required fields', () => {
      const validPlugin = {
        name: 'test',
        version: '1.0.0',
        commands: {
          init: {
            execute: async () => {}
          }
        }
      };

      expect(() => {
        pluginLoader.validate('test', validPlugin);
      }).not.toThrow();
    });

    it('should throw error for plugin missing name', () => {
      const invalidPlugin = {
        version: '1.0.0',
        commands: {}
      };

      expect(() => {
        pluginLoader.validate('test', invalidPlugin);
      }).toThrow("Plugin 'test' missing 'name' field");
    });

    it('should throw error for plugin missing version', () => {
      const invalidPlugin = {
        name: 'test',
        commands: {}
      };

      expect(() => {
        pluginLoader.validate('test', invalidPlugin);
      }).toThrow("Plugin 'test' missing 'version' field");
    });

    it('should throw error for plugin missing commands', () => {
      const invalidPlugin = {
        name: 'test',
        version: '1.0.0'
      };

      expect(() => {
        pluginLoader.validate('test', invalidPlugin);
      }).toThrow("Plugin 'test' missing 'commands' object");
    });

    it('should throw error for command missing execute function', () => {
      const invalidPlugin = {
        name: 'test',
        version: '1.0.0',
        commands: {
          init: {}
        }
      };

      expect(() => {
        pluginLoader.validate('test', invalidPlugin);
      }).toThrow("Plugin 'test' command 'init' missing execute function");
    });
  });

  describe('get()', () => {
    it('should return loaded plugin', async () => {
      await pluginLoader.loadAll();

      const pythonPlugin = pluginLoader.get('python');

      expect(pythonPlugin).toBeDefined();
      expect(pythonPlugin.name).toBe('python');
    });

    it('should return null for non-existent plugin', () => {
      const plugin = pluginLoader.get('nonexistent');

      expect(plugin).toBeNull();
    });
  });

  describe('has()', () => {
    it('should return true for loaded plugin', async () => {
      await pluginLoader.loadAll();

      expect(pluginLoader.has('python')).toBe(true);
    });

    it('should return false for non-existent plugin', () => {
      expect(pluginLoader.has('nonexistent')).toBe(false);
    });
  });
});
