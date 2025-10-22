const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { NpmManager } = require('../utils/npm-manager');

/**
 * Check Environment Command
 *
 * Verifies that the Node.js environment is properly configured:
 * - package.json exists
 * - Node.js and npm are available
 * - node_modules exists (if package.json has dependencies)
 * - .gitignore exists and includes node_modules
 * - AI instructions exist
 * - Environment file exists
 */
class CheckCommand {
  constructor() {
    this.description = 'Verify Node.js environment configuration and setup';
    this.options = [
      {
        flags: '--verbose',
        description: 'Show detailed information about each check'
      }
    ];
  }

  async execute(context, options) {
    const { logger } = context;
    const { verbose } = options;

    logger.info('Checking Node.js environment...');
    logger.info('');

    const checks = [];

    try {
      // 1. Check Node.js and npm versions
      checks.push(await this.checkNodeNpm(verbose));

      // 2. Check package.json
      checks.push(await this.checkPackageJson(verbose));

      // 3. Check node_modules
      checks.push(await this.checkNodeModules(verbose));

      // 4. Check .gitignore
      checks.push(await this.checkGitignore(verbose));

      // 5. Check AI instructions
      checks.push(await this.checkAIInstructions(verbose));

      // 6. Check environment file
      checks.push(await this.checkEnvFile(verbose));

      // Summary
      logger.info('');
      logger.info('───────────────────────────────────────');
      const passed = checks.filter(c => c.status === 'ok').length;
      const warnings = checks.filter(c => c.status === 'warn').length;
      const failed = checks.filter(c => c.status === 'error').length;

      logger.info(`Total checks: ${checks.length}`);
      logger.info(`${chalk.green('✓')} Passed: ${passed}`);
      if (warnings > 0) logger.info(`${chalk.yellow('⚠')} Warnings: ${warnings}`);
      if (failed > 0) logger.info(`${chalk.red('✗')} Failed: ${failed}`);

      if (failed === 0 && warnings === 0) {
        logger.info('');
        logger.info(chalk.green('✅ All checks passed! Your Node.js environment is properly configured.'));
      } else if (failed === 0) {
        logger.info('');
        logger.info(chalk.yellow('⚠️  Environment is functional but has some warnings.'));
      } else {
        logger.info('');
        logger.info(chalk.red('❌ Some checks failed. Please review the issues above.'));
      }

    } catch (error) {
      logger.error(`Check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check Node.js and npm versions
   */
  async checkNodeNpm(verbose) {
    try {
      const npmManager = new NpmManager({ info: () => {}, error: () => {} });
      const nodeVersion = await npmManager.getNodeVersion();
      const npmVersion = await npmManager.getNpmVersion();

      console.log(chalk.green('✓') + ' Node.js: ' + chalk.cyan(nodeVersion));
      console.log(chalk.green('✓') + ' npm: ' + chalk.cyan(npmVersion));

      if (verbose) {
        console.log(chalk.gray(`  Node.js executable: ${process.execPath}`));
      }

      return { check: 'Node.js/npm', status: 'ok' };
    } catch (error) {
      console.log(chalk.red('✗') + ' Node.js/npm: Not available');
      return { check: 'Node.js/npm', status: 'error', message: error.message };
    }
  }

  /**
   * Check package.json exists and is valid
   */
  async checkPackageJson(verbose) {
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    try {
      if (!await fs.pathExists(packageJsonPath)) {
        console.log(chalk.red('✗') + ' package.json: Not found');
        return { check: 'package.json', status: 'error', message: 'Run "devtools node init" to create' };
      }

      const packageJson = await fs.readJSON(packageJsonPath);
      console.log(chalk.green('✓') + ' package.json: Found');

      if (verbose) {
        console.log(chalk.gray(`  Name: ${packageJson.name || 'Not set'}`));
        console.log(chalk.gray(`  Version: ${packageJson.version || 'Not set'}`));
        const depCount = Object.keys(packageJson.dependencies || {}).length;
        const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
        console.log(chalk.gray(`  Dependencies: ${depCount}, DevDependencies: ${devDepCount}`));
      }

      return { check: 'package.json', status: 'ok' };
    } catch (error) {
      console.log(chalk.red('✗') + ' package.json: Invalid JSON');
      return { check: 'package.json', status: 'error', message: error.message };
    }
  }

  /**
   * Check node_modules directory
   */
  async checkNodeModules(verbose) {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    try {
      const exists = await fs.pathExists(nodeModulesPath);

      if (!exists) {
        // Check if package.json has dependencies
        if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJSON(packageJsonPath);
          const hasDeps = (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) ||
                         (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0);

          if (hasDeps) {
            console.log(chalk.yellow('⚠') + ' node_modules: Not found (run "npm install")');
            return { check: 'node_modules', status: 'warn', message: 'Run npm install' };
          }
        }

        console.log(chalk.gray('○') + ' node_modules: Not needed (no dependencies)');
        return { check: 'node_modules', status: 'ok' };
      }

      console.log(chalk.green('✓') + ' node_modules: Found');

      if (verbose) {
        const items = await fs.readdir(nodeModulesPath);
        const packages = items.filter(item => !item.startsWith('.'));
        console.log(chalk.gray(`  Installed packages: ${packages.length}`));
      }

      return { check: 'node_modules', status: 'ok' };
    } catch (error) {
      console.log(chalk.red('✗') + ' node_modules: Error checking');
      return { check: 'node_modules', status: 'error', message: error.message };
    }
  }

  /**
   * Check .gitignore configuration
   */
  async checkGitignore(verbose) {
    const gitignorePath = path.join(process.cwd(), '.gitignore');

    try {
      if (!await fs.pathExists(gitignorePath)) {
        console.log(chalk.yellow('⚠') + ' .gitignore: Not found');
        return { check: '.gitignore', status: 'warn', message: 'Should exclude node_modules' };
      }

      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      const hasNodeModules = gitignoreContent.includes('node_modules');
      const hasEnv = gitignoreContent.includes('.env');

      if (!hasNodeModules) {
        console.log(chalk.yellow('⚠') + ' .gitignore: Missing node_modules entry');
        return { check: '.gitignore', status: 'warn', message: 'Should include node_modules/' };
      }

      console.log(chalk.green('✓') + ' .gitignore: Properly configured');

      if (verbose) {
        console.log(chalk.gray(`  Ignores node_modules: ${hasNodeModules}`));
        console.log(chalk.gray(`  Ignores .env files: ${hasEnv}`));
      }

      return { check: '.gitignore', status: 'ok' };
    } catch (error) {
      console.log(chalk.yellow('⚠') + ' .gitignore: Error checking');
      return { check: '.gitignore', status: 'warn', message: error.message };
    }
  }

  /**
   * Check AI assistant instructions
   */
  async checkAIInstructions(verbose) {
    const instructionsPath = path.join(process.cwd(), '.copilot-instructions.md');

    try {
      if (!await fs.pathExists(instructionsPath)) {
        console.log(chalk.gray('○') + ' AI instructions: Not found (optional)');
        return { check: 'AI instructions', status: 'ok' };
      }

      const content = await fs.readFile(instructionsPath, 'utf-8');
      console.log(chalk.green('✓') + ' AI instructions: Found (.copilot-instructions.md)');

      if (verbose) {
        const lines = content.split('\n').length;
        console.log(chalk.gray(`  Lines: ${lines}`));
      }

      return { check: 'AI instructions', status: 'ok' };
    } catch (error) {
      console.log(chalk.gray('○') + ' AI instructions: Error checking (optional)');
      return { check: 'AI instructions', status: 'ok' };
    }
  }

  /**
   * Check environment file
   */
  async checkEnvFile(verbose) {
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');

    try {
      const hasEnv = await fs.pathExists(envPath);
      const hasExample = await fs.pathExists(envExamplePath);

      if (!hasEnv && !hasExample) {
        console.log(chalk.gray('○') + ' Environment: No .env files (optional)');
        return { check: 'Environment', status: 'ok' };
      }

      if (hasExample && !hasEnv) {
        console.log(chalk.yellow('⚠') + ' Environment: .env.example found but no .env file');
        if (verbose) {
          console.log(chalk.gray('  Copy .env.example to .env and configure'));
        }
        return { check: 'Environment', status: 'warn', message: 'Copy .env.example to .env' };
      }

      if (hasEnv) {
        console.log(chalk.green('✓') + ' Environment: .env file found');
        if (verbose && hasExample) {
          console.log(chalk.gray('  .env.example also present'));
        }
      } else if (hasExample) {
        console.log(chalk.green('✓') + ' Environment: .env.example found');
      }

      return { check: 'Environment', status: 'ok' };
    } catch (error) {
      console.log(chalk.gray('○') + ' Environment: Error checking (optional)');
      return { check: 'Environment', status: 'ok' };
    }
  }
}

module.exports = { CheckCommand };
