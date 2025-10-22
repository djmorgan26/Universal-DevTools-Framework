const fs = require('fs-extra');
const path = require('path');

/**
 * Pip Manager
 *
 * Handles pip operations within virtual environment
 */
class PipManager {
  constructor(venvManager, logger) {
    this.venv = venvManager;
    this.logger = logger;
  }

  /**
   * Install packages from requirements.txt
   */
  async install() {
    const reqPath = path.join(process.cwd(), 'requirements.txt');

    if (!await fs.pathExists(reqPath)) {
      this.logger.warn('requirements.txt not found, skipping install');
      return;
    }

    this.logger.info('Installing dependencies...');

    const pipPath = this.venv.getPipPath();
    const { execa } = await import('execa');

    try {
      await execa(pipPath, ['install', '-r', 'requirements.txt'], {
        stdio: 'inherit' // Show pip output
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
    const pipPath = this.venv.getPipPath();
    const args = ['install'];

    if (options.upgrade) {
      args.push('--upgrade');
    }

    if (options.version) {
      args.push(`${packageName}==${options.version}`);
    } else {
      args.push(packageName);
    }

    this.logger.info(`Installing ${packageName}...`);

    const { execa } = await import('execa');

    try {
      await execa(pipPath, args, {
        stdio: 'inherit'
      });

      this.logger.info(`${packageName} installed successfully`);

      // Update requirements.txt
      await this.updateRequirements();

    } catch (error) {
      throw new Error(`Failed to install ${packageName}: ${error.message}`);
    }
  }

  /**
   * Uninstall a package
   * @param {string} packageName Package to uninstall
   */
  async uninstallPackage(packageName) {
    const pipPath = this.venv.getPipPath();

    this.logger.info(`Uninstalling ${packageName}...`);

    const { execa } = await import('execa');

    try {
      await execa(pipPath, ['uninstall', '-y', packageName], {
        stdio: 'inherit'
      });

      this.logger.info(`${packageName} uninstalled successfully`);

      // Update requirements.txt
      await this.updateRequirements();

    } catch (error) {
      throw new Error(`Failed to uninstall ${packageName}: ${error.message}`);
    }
  }

  /**
   * Update requirements.txt with current packages
   */
  async updateRequirements() {
    const pipPath = this.venv.getPipPath();

    const { execa } = await import('execa');

    try {
      const { stdout } = await execa(pipPath, ['freeze']);

      const reqPath = path.join(process.cwd(), 'requirements.txt');
      await fs.writeFile(reqPath, stdout);

      this.logger.debug('requirements.txt updated');

    } catch (error) {
      this.logger.warn(`Could not update requirements.txt: ${error.message}`);
    }
  }

  /**
   * List installed packages
   * @returns {Promise<Array>}
   */
  async list() {
    const pipPath = this.venv.getPipPath();
    const { execa } = await import('execa');

    const { stdout } = await execa(pipPath, ['list', '--format=json']);
    return JSON.parse(stdout);
  }

  /**
   * Check if package is installed
   * @param {string} packageName Package name
   * @returns {Promise<boolean>}
   */
  async isInstalled(packageName) {
    const packages = await this.list();
    return packages.some(pkg => pkg.name.toLowerCase() === packageName.toLowerCase());
  }

  /**
   * Get package info
   * @param {string} packageName Package name
   * @returns {Promise<Object>}
   */
  async show(packageName) {
    const pipPath = this.venv.getPipPath();
    const { execa } = await import('execa');

    try {
      const { stdout } = await execa(pipPath, ['show', packageName]);

      // Parse pip show output
      const info = {};
      stdout.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          info[key.trim()] = valueParts.join(':').trim();
        }
      });

      return info;

    } catch (error) {
      throw new Error(`Package '${packageName}' not found`);
    }
  }
}

module.exports = { PipManager };
