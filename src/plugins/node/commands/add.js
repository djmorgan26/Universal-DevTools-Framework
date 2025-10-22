const ora = require('ora');
const { NpmManager } = require('../utils/npm-manager');

/**
 * Add Package Command
 *
 * Installs a package and updates package.json
 */
class AddCommand {
  constructor() {
    this.description = 'Add package to project and update package.json';
    this.arguments = '<package>';
    this.options = [
      {
        flags: '--version <version>',
        description: 'Install specific version (e.g., --version 2.0.0)'
      },
      {
        flags: '--dev',
        description: 'Add to devDependencies instead of dependencies'
      },
      {
        flags: '--exact',
        description: 'Save exact version instead of using semver range'
      }
    ];
  }

  async execute(context, packageName, options) {
    const { logger } = context;
    const { version, dev, exact } = options;

    if (!packageName) {
      logger.error('Package name is required');
      logger.info('Usage: devtools node add <package> [options]');
      return;
    }

    logger.info(`Adding ${packageName}...`);

    try {
      // Check if package.json exists
      const fs = require('fs-extra');
      const path = require('path');
      const packageJsonPath = path.join(process.cwd(), 'package.json');

      if (!await fs.pathExists(packageJsonPath)) {
        logger.error('package.json not found. Run "devtools node init" first.');
        return;
      }

      // Install package
      const npmManager = new NpmManager(logger);
      await npmManager.installPackage(packageName, {
        version,
        dev,
        exact
      });

      logger.info('');
      logger.info(`✅ ${packageName} installed successfully!`);
      logger.info('');

    } catch (error) {
      logger.error(`Failed to add ${packageName}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { AddCommand };
