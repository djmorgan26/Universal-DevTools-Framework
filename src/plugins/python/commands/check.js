const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { VenvManager } = require('../utils/venv-manager');
const { PipManager } = require('../utils/pip-manager');

class CheckCommand {
  constructor() {
    this.description = 'Verify Python environment and project configuration';
    this.options = [
      {
        flags: '--verbose',
        description: 'Show detailed information about each check'
      }
    ];
  }

  async execute(context, options) {
    const { logger } = context;

    console.log(chalk.cyan('\n🔍 Python Environment Check\n'));

    const checks = [
      this.checkVenv(logger, options.verbose),
      this.checkPython(logger, options.verbose),
      this.checkPip(logger, options.verbose),
      this.checkRequirements(logger, options.verbose),
      this.checkSkills(logger),
      this.checkGitignore(logger),
      this.checkEnv(logger)
    ];

    const results = await Promise.allSettled(checks);

    console.log(); // Blank line

    // Count results
    const passed = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Summary
    if (failed === 0) {
      console.log(chalk.green.bold('✅ All checks passed!'));
      console.log(chalk.dim(`   ${passed} checks completed successfully\n`));
    } else {
      console.log(chalk.yellow.bold('⚠️  Some checks failed'));
      console.log(chalk.dim(`   ${passed} passed, ${failed} failed\n`));
      console.log(chalk.dim('Run with --verbose for more details\n'));
    }
  }

  async checkVenv(logger, verbose) {
    const venvManager = new VenvManager('python3', logger);

    if (await venvManager.exists()) {
      const info = await venvManager.getInfo();
      console.log(chalk.green('✓'), 'Virtual environment exists');

      if (verbose) {
        console.log(chalk.dim(`  Path: ${info.path}`));
        console.log(chalk.dim(`  Python: ${info.pythonVersion}`));
        console.log(chalk.dim(`  pip: ${info.pipVersion}`));
      } else {
        console.log(chalk.dim(`  Python ${info.pythonVersion}, pip ${info.pipVersion}`));
      }
    } else {
      console.log(chalk.red('✗'), 'Virtual environment not found');
      console.log(chalk.dim('  Run: devtools python init'));
      throw new Error('venv missing');
    }
  }

  async checkPython(logger, verbose) {
    const venvManager = new VenvManager('python3', logger);

    if (await venvManager.exists()) {
      const pythonPath = venvManager.getPythonPath();

      if (await fs.pathExists(pythonPath)) {
        console.log(chalk.green('✓'), 'Python executable found');

        if (verbose) {
          console.log(chalk.dim(`  Location: ${pythonPath}`));
        }
      } else {
        console.log(chalk.red('✗'), 'Python executable not found in venv');
        throw new Error('python missing');
      }
    }
  }

  async checkPip(logger, verbose) {
    const venvManager = new VenvManager('python3', logger);

    if (await venvManager.exists()) {
      const pipPath = venvManager.getPipPath();

      if (await fs.pathExists(pipPath)) {
        console.log(chalk.green('✓'), 'pip executable found');

        if (verbose) {
          console.log(chalk.dim(`  Location: ${pipPath}`));
        }
      } else {
        console.log(chalk.red('✗'), 'pip executable not found in venv');
        throw new Error('pip missing');
      }
    }
  }

  async checkRequirements(logger, verbose) {
    const reqPath = path.join(process.cwd(), 'requirements.txt');

    if (await fs.pathExists(reqPath)) {
      const content = await fs.readFile(reqPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      console.log(chalk.green('✓'), 'requirements.txt exists');
      console.log(chalk.dim(`  ${lines.length} packages listed`));

      if (verbose && lines.length > 0) {
        console.log(chalk.dim('  Packages:'));
        lines.slice(0, 5).forEach(line => {
          console.log(chalk.dim(`    - ${line.trim()}`));
        });
        if (lines.length > 5) {
          console.log(chalk.dim(`    ... and ${lines.length - 5} more`));
        }
      }
    } else {
      console.log(chalk.yellow('⚠'), 'requirements.txt not found');
      console.log(chalk.dim('  Consider creating one'));
    }
  }

  async checkSkills(logger) {
    const skillsPath = path.join(process.cwd(), '.copilot-instructions.md');

    if (await fs.pathExists(skillsPath)) {
      const content = await fs.readFile(skillsPath, 'utf8');
      const lines = content.split('\n').length;

      console.log(chalk.green('✓'), 'AI instructions installed');
      console.log(chalk.dim('  Copilot/Cursor/Claude will use project standards'));
    } else {
      console.log(chalk.yellow('⚠'), 'AI instructions not found');
      console.log(chalk.dim('  AI assistants may not have full context'));
    }
  }

  async checkGitignore(logger) {
    const gitignorePath = path.join(process.cwd(), '.gitignore');

    if (await fs.pathExists(gitignorePath)) {
      const content = await fs.readFile(gitignorePath, 'utf8');

      const hasVenv = content.includes('venv/');
      const hasPycache = content.includes('__pycache__');
      const hasEnv = content.includes('.env');

      if (hasVenv && hasPycache && hasEnv) {
        console.log(chalk.green('✓'), '.gitignore configured correctly');
      } else {
        console.log(chalk.yellow('⚠'), '.gitignore exists but may be incomplete');
        if (!hasVenv) console.log(chalk.dim('  Missing: venv/'));
        if (!hasPycache) console.log(chalk.dim('  Missing: __pycache__/'));
        if (!hasEnv) console.log(chalk.dim('  Missing: .env'));
      }
    } else {
      console.log(chalk.yellow('⚠'), '.gitignore not found');
      console.log(chalk.dim('  Create one to avoid committing venv/'));
    }
  }

  async checkEnv(logger) {
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');

    const hasEnv = await fs.pathExists(envPath);
    const hasEnvExample = await fs.pathExists(envExamplePath);

    if (hasEnvExample) {
      if (hasEnv) {
        console.log(chalk.green('✓'), 'Environment configuration set up');
        console.log(chalk.dim('  .env and .env.example both exist'));
      } else {
        console.log(chalk.yellow('⚠'), '.env.example exists but .env does not');
        console.log(chalk.dim('  Copy: cp .env.example .env'));
      }
    } else {
      if (hasEnv) {
        console.log(chalk.yellow('⚠'), '.env exists but .env.example does not');
        console.log(chalk.dim('  Consider creating .env.example for team'));
      } else {
        console.log(chalk.dim('ℹ'), 'No environment files found (optional)');
      }
    }
  }
}

module.exports = { CheckCommand };
