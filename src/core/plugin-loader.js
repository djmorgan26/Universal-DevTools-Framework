const fs = require('fs-extra');
const path = require('path');
const { Logger } = require('./logger');

/**
 * Plugin Loader
 *
 * Discovers and loads plugins from src/plugins/ directory
 * Validates plugin interface before registration
 * Caches loaded plugins for performance
 */
class PluginLoader {
  constructor() {
    this.logger = new Logger();
    this.plugins = new Map();
    this.pluginsDir = path.join(__dirname, '../plugins');
  }

  /**
   * Load all plugins from plugins directory
   * @returns {Promise<Array>} Array of loaded plugin objects
   */
  async loadAll() {
    // Check if plugins directory exists
    if (!await fs.pathExists(this.pluginsDir)) {
      this.logger.debug('No plugins directory found');
      return [];
    }

    const pluginDirs = await fs.readdir(this.pluginsDir);
    const plugins = [];

    for (const dir of pluginDirs) {
      const pluginPath = path.join(this.pluginsDir, dir);
      const stat = await fs.stat(pluginPath);

      if (stat.isDirectory()) {
        try {
          const plugin = await this.load(dir);
          plugins.push(plugin);
        } catch (error) {
          this.logger.warn(`Failed to load plugin '${dir}': ${error.message}`);
        }
      }
    }

    return plugins;
  }

  /**
   * Load specific plugin by name
   * @param {string} name Plugin name (directory name)
   * @returns {Promise<Object>} Loaded plugin object
   */
  async load(name) {
    // Check cache
    if (this.plugins.has(name)) {
      return this.plugins.get(name);
    }

    const pluginPath = path.join(this.pluginsDir, name);
    const indexPath = path.join(pluginPath, 'index.js');

    if (!await fs.pathExists(indexPath)) {
      throw new Error(`Plugin '${name}' missing index.js`);
    }

    // Load plugin module
    const plugin = require(indexPath);

    // Validate plugin interface
    this.validate(name, plugin);

    // Cache and return
    this.plugins.set(name, plugin);
    this.logger.debug(`Loaded plugin: ${name} v${plugin.version}`);

    return plugin;
  }

  /**
   * Validate plugin implements required interface
   * @param {string} name Plugin name
   * @param {Object} plugin Plugin object
   * @throws {Error} If validation fails
   */
  validate(name, plugin) {
    // Required fields
    if (!plugin.name) {
      throw new Error(`Plugin '${name}' missing 'name' field`);
    }

    if (!plugin.version) {
      throw new Error(`Plugin '${name}' missing 'version' field`);
    }

    if (!plugin.commands || typeof plugin.commands !== 'object') {
      throw new Error(`Plugin '${name}' missing 'commands' object`);
    }

    // Validate each command
    for (const [cmdName, cmd] of Object.entries(plugin.commands)) {
      if (typeof cmd.execute !== 'function') {
        throw new Error(
          `Plugin '${name}' command '${cmdName}' missing execute function`
        );
      }
    }

    this.logger.debug(`Plugin '${name}' validated successfully`);
  }

  /**
   * Get loaded plugin by name
   * @param {string} name Plugin name
   * @returns {Object|null} Plugin object or null if not loaded
   */
  get(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Check if plugin is loaded
   * @param {string} name Plugin name
   * @returns {boolean} True if loaded
   */
  has(name) {
    return this.plugins.has(name);
  }
}

module.exports = { PluginLoader };
