const { Logger } = require('./logger');

/**
 * Registry Manager
 *
 * Generates registry configurations based on active profile
 * Supports: pip (Python), npm (Node.js), Docker registries
 */
class RegistryManager {
  constructor(configManager) {
    this.config = configManager;
    this.logger = new Logger();
  }

  /**
   * Generate pip.conf content for Python
   * @returns {string|null} pip.conf content or null if using defaults
   */
  generatePipConfig() {
    const registryType = this.config.get('python.registryType');

    if (registryType === 'public') {
      return null; // Use PyPI defaults
    }

    const indexUrl = this.config.get('python.indexUrl');
    const trustedHost = this.config.get('python.trustedHost');
    const extraIndexUrl = this.config.get('python.extraIndexUrl');

    let config = '[global]\n';
    config += `index-url = ${indexUrl}\n`;

    if (trustedHost) {
      config += `trusted-host = ${trustedHost}\n`;
    }

    if (extraIndexUrl) {
      config += `extra-index-url = ${extraIndexUrl}\n`;
    }

    config += '\n[install]\n';
    if (trustedHost) {
      config += `trusted-host = ${trustedHost}\n`;
    }

    return config;
  }

  /**
   * Generate environment variables for Python registry
   * @returns {Object} Environment variables
   */
  generatePipEnvVars() {
    const registryType = this.config.get('python.registryType');

    if (registryType === 'public') {
      return {};
    }

    return {
      PIP_INDEX_URL: this.config.get('python.indexUrl'),
      PIP_TRUSTED_HOST: this.config.get('python.trustedHost'),
      PIP_EXTRA_INDEX_URL: this.config.get('python.extraIndexUrl') || ''
    };
  }

  /**
   * Generate .npmrc content for Node.js
   * @returns {string|null} .npmrc content or null if using defaults
   */
  generateNpmConfig() {
    const registryType = this.config.get('node.registryType');

    if (registryType === 'public') {
      return null; // Use npm defaults
    }

    const registry = this.config.get('node.registry');

    let config = `registry=${registry}\n`;

    // Add authentication if configured
    const authToken = this.config.get('node.authToken');
    if (authToken) {
      const registryUrl = new URL(registry);
      config += `//${registryUrl.host}/:_authToken=${authToken}\n`;
    }

    return config;
  }

  /**
   * Test connection to registry
   * @param {string} type Registry type ('python' | 'node' | 'docker')
   * @returns {Promise<boolean>} True if reachable
   */
  async testConnection(type) {
    try {
      if (type === 'python') {
        const indexUrl = this.config.get('python.indexUrl');
        const response = await fetch(indexUrl);
        return response.ok;
      } else if (type === 'node') {
        const registry = this.config.get('node.registry');
        const response = await fetch(registry);
        return response.ok;
      }

      return false;
    } catch (error) {
      this.logger.debug(`Registry test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get registry info for display
   * @param {string} type Registry type
   * @returns {Object} Registry information
   */
  getRegistryInfo(type) {
    const registryType = this.config.get(`${type}.registryType`);

    if (registryType === 'public') {
      return {
        type: 'public',
        description: `Public ${type} registry`,
        url: type === 'python' ? 'https://pypi.org' : 'https://registry.npmjs.org'
      };
    }

    return {
      type: 'custom',
      description: `Custom ${type} registry`,
      url: this.config.get(`${type}.${type === 'python' ? 'indexUrl' : 'registry'}`)
    };
  }
}

module.exports = { RegistryManager };
