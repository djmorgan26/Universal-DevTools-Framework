const fs = require('fs-extra');
const path = require('path');

/**
 * NPM Manager
 *
 * Handles npm operations
 */
class NpmManager {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Initialize package.json
   * @param {Object} options Project options
   */
  async initialize(options = {}) {
    const packageJson = {
      name: options.name || path.basename(process.cwd()),
      version: '1.0.0',
      description: options.description || '',
      main: options.main || 'index.js',
      scripts: options.scripts || {
        start: 'node index.js',
        test: 'echo "Error: no test specified" && exit 1'
      },
      keywords: [],
      author: '',
      license: 'ISC'
    };

    // Add dependencies if provided
    if (options.dependencies) {
      packageJson.dependencies = options.dependencies;
    }

    // Add devDependencies if provided
    if (options.devDependencies) {
      packageJson.devDependencies = options.devDependencies;
    }

    const packagePath = path.join(process.cwd(), 'package.json');
    await fs.writeJSON(packagePath, packageJson, { spaces: 2 });

    this.logger.debug('package.json created');
  }

  /**
   * Install all dependencies
   */
  async install() {
    const packagePath = path.join(process.cwd(), 'package.json');

    if (!await fs.pathExists(packagePath)) {
      this.logger.warn('package.json not found, skipping install');
      return;
    }

    this.logger.info('Installing dependencies...');

    const { execa } = await import('execa');

    try {
      await execa('npm', ['install'], {
        stdio: 'inherit'
      });

      this.logger.info('Dependencies installed successfully');

    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  /**
   * Install a specific package
   * @param {string} packageName Package to install
   * @param {Object} options Install options
   */
  async installPackage(packageName, options = {}) {
    const args = ['install'];

    if (options.dev) {
      args.push('--save-dev');
    } else {
      args.push('--save');
    }

    if (options.exact) {
      args.push('--save-exact');
    }

    if (options.version) {
      args.push(`${packageName}@${options.version}`);
    } else {
      args.push(packageName);
    }

    this.logger.info(`Installing ${packageName}...`);

    const { execa } = await import('execa');

    try {
      await execa('npm', args, {
        stdio: 'inherit'
      });

      this.logger.info(`${packageName} installed successfully`);

    } catch (error) {
      throw new Error(`Failed to install ${packageName}: ${error.message}`);
    }
  }

  /**
   * Uninstall a package
   * @param {string} packageName Package to uninstall
   */
  async uninstallPackage(packageName) {
    this.logger.info(`Uninstalling ${packageName}...`);

    const { execa } = await import('execa');

    try {
      await execa('npm', ['uninstall', packageName], {
        stdio: 'inherit'
      });

      this.logger.info(`${packageName} uninstalled successfully`);

    } catch (error) {
      throw new Error(`Failed to uninstall ${packageName}: ${error.message}`);
    }
  }

  /**
   * List installed packages
   * @returns {Promise<Object>}
   */
  async list() {
    const { execa } = await import('execa');

    const { stdout } = await execa('npm', ['list', '--json', '--depth=0']);
    return JSON.parse(stdout);
  }

  /**
   * Check if package is installed
   * @param {string} packageName Package name
   * @returns {Promise<boolean>}
   */
  async isInstalled(packageName) {
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    if (!await fs.pathExists(packageJsonPath)) {
      return false;
    }

    const packageJson = await fs.readJSON(packageJsonPath);
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    return packageName in deps || packageName in devDeps;
  }

  /**
   * Get package info
   * @param {string} packageName Package name
   * @returns {Promise<Object>}
   */
  async show(packageName) {
    const { execa } = await import('execa');

    try {
      const { stdout } = await execa('npm', ['view', packageName, '--json']);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Package '${packageName}' not found`);
    }
  }

  /**
   * Check Node.js version
   * @returns {Promise<string>}
   */
  async getNodeVersion() {
    return process.version;
  }

  /**
   * Check npm version
   * @returns {Promise<string>}
   */
  async getNpmVersion() {
    const { execa } = await import('execa');
    const { stdout } = await execa('npm', ['--version']);
    return stdout.trim();
  }
}

module.exports = { NpmManager };
