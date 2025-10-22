const ora = require('ora');
const { NpmManager } = require('../utils/npm-manager');

/**
 * Remove Package Command
 *
 * Uninstalls a package and updates package.json
 */
class RemoveCommand {
  constructor() {
    this.description = 'Remove package from project and update package.json';
    this.arguments = '<package>';
  }

  async execute(context, packageName, options) {
    const { logger } = context;

    if (!packageName) {
      logger.error('Package name is required');
      logger.info('Usage: devtools node remove <package>');
      return;
    }

    logger.info(`Removing ${packageName}...`);

    try {
      // Check if package.json exists
      const fs = require('fs-extra');
      const path = require('path');
      const packageJsonPath = path.join(process.cwd(), 'package.json');

      if (!await fs.pathExists(packageJsonPath)) {
        logger.error('package.json not found. Run "devtools node init" first.');
        return;
      }

      // Check if package is installed
      const npmManager = new NpmManager(logger);
      const isInstalled = await npmManager.isInstalled(packageName);

      if (!isInstalled) {
        logger.warn(`${packageName} is not installed in this project`);
        return;
      }

      // Uninstall package
      await npmManager.uninstallPackage(packageName);

      logger.info('');
      logger.info(`✅ ${packageName} removed successfully!`);
      logger.info('');

    } catch (error) {
      logger.error(`Failed to remove ${packageName}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { RemoveCommand };
