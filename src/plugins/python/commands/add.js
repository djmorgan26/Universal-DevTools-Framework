const chalk = require('chalk');
const ora = require('ora');
const { VenvManager } = require('../utils/venv-manager');
const { PipManager } = require('../utils/pip-manager');

class AddCommand {
  constructor() {
    this.description = 'Add package to project and update requirements.txt';
    this.arguments = '<package>';
    this.options = [
      {
        flags: '--version <version>',
        description: 'Install specific version (e.g., --version 2.0.0)'
      },
      {
        flags: '--upgrade',
        description: 'Upgrade package if already installed'
      },
      {
        flags: '--dev',
        description: 'Add as development dependency (future feature)'
      }
    ];
  }

  async execute(context, packageName, options) {
    const { logger } = context;

    if (!packageName) {
      throw new Error('Package name required. Usage: devtools python add <package>');
    }

    logger.info(chalk.cyan(`\n📦 Adding ${packageName}\n`));

    try {
      // Check venv exists
      const venvManager = new VenvManager('python3', logger);

      if (!await venvManager.exists()) {
        throw new Error(
          'Virtual environment not found. Run "devtools python init" first.'
        );
      }

      // Check if already installed
      const pipManager = new PipManager(venvManager, logger);
      const isInstalled = await pipManager.isInstalled(packageName);

      if (isInstalled && !options.upgrade) {
        const existingInfo = await pipManager.show(packageName);
        console.log(chalk.yellow(`⚠ ${packageName} is already installed (${existingInfo.Version})`));
        console.log(chalk.dim('Use --upgrade to update to latest version\n'));
        return;
      }

      // Show what we're doing
      const spinner = ora('Preparing installation...').start();

      if (options.version) {
        spinner.text = `Installing ${packageName}==${options.version}...`;
      } else if (options.upgrade) {
        spinner.text = `Upgrading ${packageName}...`;
      } else {
        spinner.text = `Installing ${packageName}...`;
      }

      spinner.stop();

      // Install package
      await pipManager.installPackage(packageName, {
        version: options.version,
        upgrade: options.upgrade
      });

      // Get installed version
      const info = await pipManager.show(packageName);

      // Success
      console.log(chalk.green(`\n✅ ${packageName} installed successfully!`));
      console.log(chalk.dim(`   Version: ${info.Version}`));
      console.log(chalk.dim(`   Location: ${info.Location}`));
      console.log(chalk.dim('   requirements.txt has been updated\n'));

      // Show dependencies if any
      if (info.Requires && info.Requires !== '') {
        console.log(chalk.cyan(`Dependencies: ${info.Requires}\n`));
      }

    } catch (error) {
      logger.error(chalk.red(`\n❌ Failed to add ${packageName}: ${error.message}\n`));
      throw error;
    }
  }
}

module.exports = { AddCommand };
