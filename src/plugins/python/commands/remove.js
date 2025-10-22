const chalk = require('chalk');
const ora = require('ora');
const { VenvManager } = require('../utils/venv-manager');
const { PipManager } = require('../utils/pip-manager');

class RemoveCommand {
  constructor() {
    this.description = 'Remove package from project and update requirements.txt';
    this.arguments = '<package>';
    this.options = [];
  }

  async execute(context, packageName, options) {
    const { logger } = context;

    if (!packageName) {
      throw new Error('Package name required. Usage: devtools python remove <package>');
    }

    logger.info(chalk.cyan(`\n🗑️  Removing ${packageName}\n`));

    try {
      // Check venv exists
      const venvManager = new VenvManager('python3', logger);

      if (!await venvManager.exists()) {
        throw new Error(
          'Virtual environment not found. Run "devtools python init" first.'
        );
      }

      // Check if package is installed
      const pipManager = new PipManager(venvManager, logger);
      const isInstalled = await pipManager.isInstalled(packageName);

      if (!isInstalled) {
        console.log(chalk.yellow(`⚠ ${packageName} is not installed\n`));
        return;
      }

      // Get info before removal
      const info = await pipManager.show(packageName);
      console.log(chalk.dim(`Removing ${packageName} ${info.Version}...\n`));

      // Check for dependents
      const allPackages = await pipManager.list();
      const dependents = allPackages.filter(pkg => {
        // This is a simplified check - in production you'd want to parse dependency tree
        return false; // TODO: Implement proper dependency checking
      });

      if (dependents.length > 0) {
        console.log(chalk.yellow('⚠ Warning: Other packages may depend on this\n'));
      }

      // Uninstall
      const spinner = ora(`Uninstalling ${packageName}...`).start();
      spinner.stop();

      await pipManager.uninstallPackage(packageName);

      // Success
      console.log(chalk.green(`\n✅ ${packageName} removed successfully!`));
      console.log(chalk.dim('   requirements.txt has been updated\n'));

    } catch (error) {
      logger.error(chalk.red(`\n❌ Failed to remove ${packageName}: ${error.message}\n`));
      throw error;
    }
  }
}

module.exports = { RemoveCommand };
