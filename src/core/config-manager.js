const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const Ajv = require('ajv');
const { Logger } = require('./logger');

/**
 * Configuration Manager
 *
 * Manages configuration hierarchy:
 * 1. CLI flags (highest priority)
 * 2. Environment variables
 * 3. Project config (.devtools/config.json in cwd)
 * 4. User config (~/.devtools/config.json)
 * 5. Active profile
 * 6. Default values (lowest priority)
 */
class ConfigManager {
  constructor() {
    this.logger = new Logger();
    this.ajv = new Ajv();

    // Paths
    this.userConfigDir = path.join(os.homedir(), '.devtools');
    this.userConfigFile = path.join(this.userConfigDir, 'config.json');
    this.projectConfigFile = path.join(process.cwd(), '.devtools', 'config.json');
    this.profilesDir = path.join(__dirname, '../config/profiles');
    this.schemaPath = path.join(__dirname, '../config/schema.json');

    // State
    this.userConfig = {};
    this.projectConfig = {};
    this.activeProfile = 'default';
    this.profileData = {};
    this.cliOverrides = {};
    this.schema = null;
  }

  /**
   * Load all configuration sources
   */
  async load() {
    // Load schema for validation
    this.schema = await fs.readJSON(this.schemaPath);

    // Load user config
    await this.loadUserConfig();

    // Load project config if exists
    await this.loadProjectConfig();

    // Determine active profile
    this.activeProfile =
      this.cliOverrides.profile ||
      process.env.DEVTOOLS_PROFILE ||
      this.projectConfig.profile ||
      this.userConfig.profile ||
      'default';

    // Load active profile
    await this.loadProfile(this.activeProfile);

    this.logger.debug(`Configuration loaded. Active profile: ${this.activeProfile}`);
  }

  async loadUserConfig() {
    if (await fs.pathExists(this.userConfigFile)) {
      try {
        this.userConfig = await fs.readJSON(this.userConfigFile);
        this.logger.debug('User config loaded');
      } catch (error) {
        this.logger.warn(`Failed to load user config: ${error.message}`);
      }
    } else {
      this.logger.debug('No user config found');
    }
  }

  async loadProjectConfig() {
    if (await fs.pathExists(this.projectConfigFile)) {
      try {
        this.projectConfig = await fs.readJSON(this.projectConfigFile);
        this.logger.debug('Project config loaded');
      } catch (error) {
        this.logger.warn(`Failed to load project config: ${error.message}`);
      }
    } else {
      this.logger.debug('No project config found');
    }
  }

  async loadProfile(name) {
    const profilePath = path.join(this.profilesDir, `${name}.json`);

    if (!await fs.pathExists(profilePath)) {
      throw new Error(`Profile '${name}' not found`);
    }

    this.profileData = await fs.readJSON(profilePath);

    // Validate profile
    const valid = this.ajv.validate(this.schema, this.profileData);
    if (!valid) {
      throw new Error(`Profile '${name}' validation failed: ${this.ajv.errorsText()}`);
    }

    // Substitute environment variables in profile
    this.profileData = this.substituteEnvVars(this.profileData);

    this.logger.debug(`Profile '${name}' loaded`);
  }

  /**
   * Get configuration value with precedence
   * @param {string} key Dot-notation key (e.g., 'python.indexUrl')
   * @returns {*} Configuration value
   */
  get(key) {
    // 1. CLI overrides
    if (this.hasKey(this.cliOverrides, key)) {
      return this.getKey(this.cliOverrides, key);
    }

    // 2. Environment variables
    const envKey = `DEVTOOLS_${key.replace(/\./g, '_').toUpperCase()}`;
    if (process.env[envKey]) {
      return process.env[envKey];
    }

    // 3. Project config
    if (this.hasKey(this.projectConfig, key)) {
      return this.getKey(this.projectConfig, key);
    }

    // 4. User config
    if (this.hasKey(this.userConfig, key)) {
      return this.getKey(this.userConfig, key);
    }

    // 5. Active profile
    if (this.hasKey(this.profileData, key)) {
      return this.getKey(this.profileData, key);
    }

    // 6. Not found
    return undefined;
  }

  /**
   * Set configuration value
   * @param {string} key Dot-notation key
   * @param {*} value Value to set
   * @param {string} scope Where to save ('user' | 'project' | 'cli')
   */
  async set(key, value, scope = 'user') {
    if (scope === 'cli') {
      this.setKey(this.cliOverrides, key, value);
    } else if (scope === 'project') {
      this.setKey(this.projectConfig, key, value);
      await this.saveProjectConfig();
    } else if (scope === 'user') {
      this.setKey(this.userConfig, key, value);
      await this.saveUserConfig();
    } else {
      throw new Error(`Invalid scope: ${scope}`);
    }
  }

  /**
   * Get value from nested object using dot notation
   * @param {Object} obj Object to search
   * @param {string} key Dot-notation key
   * @returns {*} Value or undefined
   */
  getKey(obj, key) {
    return key.split('.').reduce((o, k) => o?.[k], obj);
  }

  /**
   * Check if key exists in nested object
   * @param {Object} obj Object to search
   * @param {string} key Dot-notation key
   * @returns {boolean} True if exists
   */
  hasKey(obj, key) {
    return this.getKey(obj, key) !== undefined;
  }

  /**
   * Set value in nested object using dot notation
   * @param {Object} obj Object to modify
   * @param {string} key Dot-notation key
   * @param {*} value Value to set
   */
  setKey(obj, key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, k) => {
      if (!o[k]) o[k] = {};
      return o[k];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Substitute ${VAR} patterns with environment variables
   * @param {Object} obj Object to process
   * @returns {Object} Processed object
   */
  substituteEnvVars(obj) {
    const json = JSON.stringify(obj);
    const substituted = json.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
    return JSON.parse(substituted);
  }

  async saveUserConfig() {
    await fs.ensureDir(this.userConfigDir);
    await fs.writeJSON(this.userConfigFile, this.userConfig, { spaces: 2 });
    this.logger.debug('User config saved');
  }

  async saveProjectConfig() {
    await fs.ensureDir(path.dirname(this.projectConfigFile));
    await fs.writeJSON(this.projectConfigFile, this.projectConfig, { spaces: 2 });
    this.logger.debug('Project config saved');
  }

  /**
   * List available profiles
   * @returns {Promise<Array<string>>} Profile names
   */
  async listProfiles() {
    const files = await fs.readdir(this.profilesDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => path.basename(f, '.json'));
  }

  /**
   * Create new profile
   * @param {string} name Profile name
   * @param {string} fromTemplate Template to copy from
   */
  async createProfile(name, fromTemplate = 'custom.template') {
    const templatePath = path.join(this.profilesDir, `${fromTemplate}.json`);
    const newProfilePath = path.join(this.profilesDir, `${name}.json`);

    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template '${fromTemplate}' not found`);
    }

    if (await fs.pathExists(newProfilePath)) {
      throw new Error(`Profile '${name}' already exists`);
    }

    const template = await fs.readJSON(templatePath);
    template.profile = name;

    await fs.writeJSON(newProfilePath, template, { spaces: 2 });
    this.logger.info(`Profile '${name}' created from template '${fromTemplate}'`);
  }

  /**
   * Switch active profile
   * @param {string} name Profile name
   */
  async useProfile(name) {
    await this.loadProfile(name);
    this.activeProfile = name;

    // Save to user config
    this.userConfig.profile = name;
    await this.saveUserConfig();
  }

  /**
   * Get profile data
   * @param {string} name Profile name (defaults to active)
   * @returns {Promise<Object>} Profile data
   */
  async getProfile(name = this.activeProfile) {
    if (name === this.activeProfile) {
      return this.profileData;
    }

    const profilePath = path.join(this.profilesDir, `${name}.json`);
    return await fs.readJSON(profilePath);
  }

  /**
   * Validate current configuration
   * @returns {Promise<string>} Validation result message
   */
  async validate() {
    const valid = this.ajv.validate(this.schema, this.profileData);

    if (valid) {
      return 'Configuration is valid';
    } else {
      throw new Error(`Configuration validation failed: ${this.ajv.errorsText()}`);
    }
  }
}

module.exports = { ConfigManager };
