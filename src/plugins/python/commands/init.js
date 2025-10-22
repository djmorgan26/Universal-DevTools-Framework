const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { VenvManager } = require('../utils/venv-manager');
const { PipManager } = require('../utils/pip-manager');
const { RegistryManager } = require('../../../core/registry-manager');

class InitCommand {
  constructor() {
    this.description = 'Initialize new Python project with virtual environment';
    this.options = [
      {
        flags: '-t, --template <type>',
        description: 'Project template: basic (simple script) or fastapi (API)',
        defaultValue: 'basic'
      },
      {
        flags: '--skip-install',
        description: 'Skip installing dependencies from requirements.txt'
      },
      {
        flags: '--python <path>',
        description: 'Python executable (python3, python3.11, etc.)',
        defaultValue: 'python3'
      }
    ];
  }

  async execute(context, options) {
    const { logger, config } = context;
    const { template, skipInstall, python } = options;

    logger.info(chalk.blue.bold('\n🐍 Python Project Initialization\n'));

    try {
      // Step 1: Prerequisites check
      await this.checkPrerequisites(python, logger);

      // Step 2: Create virtual environment
      const venvManager = new VenvManager(python, logger);
      await venvManager.create('venv');

      // Step 3: Configure registry
      const registryManager = new RegistryManager(config);
      await this.configureRegistry(venvManager, registryManager, logger);

      // Step 4: Copy template files
      await this.copyTemplate(template, logger);

      // Step 5: Copy AI skills
      await this.copySkills(logger);

      // Step 6: Create standard files
      await this.createStandardFiles(logger);

      // Step 7: Install dependencies
      if (!skipInstall) {
        const pipManager = new PipManager(venvManager, logger);
        await pipManager.install();
      }

      // Success message
      this.printSuccess(template, venvManager, logger);

    } catch (error) {
      logger.error(chalk.red(`\n❌ Initialization failed: ${error.message}`));

      if (context.options.debug) {
        logger.error(error.stack);
      }

      throw error;
    }
  }

  async checkPrerequisites(pythonPath, logger) {
    const spinner = ora('Checking prerequisites...').start();

    try {
      const { execa } = await import('execa');

      // Check Python installation
      const { stdout: version } = await execa(pythonPath, ['--version']);
      const versionMatch = version.match(/Python (\d+\.\d+\.\d+)/);

      if (!versionMatch) {
        throw new Error('Could not determine Python version');
      }

      const [major, minor] = versionMatch[1].split('.').map(Number);

      if (major < 3 || (major === 3 && minor < 8)) {
        throw new Error(`Python 3.8+ required, found ${versionMatch[1]}`);
      }

      spinner.succeed(chalk.green(`✓ Python ${versionMatch[1]} found`));

      // Check pip
      const pipSpinner = ora('Checking pip...').start();
      await execa(pythonPath, ['-m', 'pip', '--version']);
      pipSpinner.succeed(chalk.green('✓ pip available'));

      // Check venv module
      const venvSpinner = ora('Checking venv module...').start();
      await execa(pythonPath, ['-m', 'venv', '--help']);
      venvSpinner.succeed(chalk.green('✓ venv module available'));

    } catch (error) {
      spinner.fail(chalk.red('✗ Prerequisites check failed'));

      if (error.message.includes('not found') || error.code === 'ENOENT') {
        throw new Error(
          'Python not found. Install Python 3.8+ from:\n' +
          '  - macOS: brew install python\n' +
          '  - Windows: https://python.org/downloads\n' +
          '  - Linux: sudo apt install python3 python3-venv python3-pip'
        );
      }

      throw error;
    }
  }

  async configureRegistry(venvManager, registryManager, logger) {
    const spinner = ora('Configuring package registry...').start();

    try {
      const pipConfig = registryManager.generatePipConfig();

      if (pipConfig) {
        // Custom registry - write pip.conf
        const pipConfPath = path.join('venv', 'pip.conf');
        await fs.writeFile(pipConfPath, pipConfig);

        // Also write for Windows
        const pipIniPath = path.join('venv', 'pip.ini');
        await fs.writeFile(pipIniPath, pipConfig);

        spinner.succeed(chalk.green('✓ Custom registry configured'));
      } else {
        // Public PyPI - no config needed
        spinner.succeed(chalk.green('✓ Using public PyPI'));
      }

      // Modify activation script with environment variables
      const envVars = registryManager.generatePipEnvVars();
      if (Object.keys(envVars).length > 0) {
        await venvManager.addEnvVars(envVars);
        logger.debug('Environment variables added to activation script');
      }

      // Test registry connectivity
      const registryInfo = registryManager.getRegistryInfo('python');
      if (registryInfo.type === 'custom') {
        const testSpinner = ora('Testing registry connection...').start();
        const reachable = await registryManager.testConnection('python');

        if (reachable) {
          testSpinner.succeed(chalk.green('✓ Registry reachable'));
        } else {
          testSpinner.warn(chalk.yellow('⚠ Registry unreachable (will use cache)'));
        }
      }

    } catch (error) {
      spinner.fail(chalk.red('✗ Registry configuration failed'));
      throw error;
    }
  }

  async copyTemplate(template, logger) {
    const spinner = ora(`Copying ${template} template...`).start();

    try {
      const templateDir = path.join(__dirname, '../templates', template);

      if (!await fs.pathExists(templateDir)) {
        throw new Error(`Template '${template}' not found`);
      }

      // Copy all files from template
      await fs.copy(templateDir, process.cwd(), {
        overwrite: false,
        errorOnExist: false
      });

      // Copy requirements.txt from templates root
      const reqSrc = path.join(__dirname, '../templates/requirements.txt');
      const reqDest = path.join(process.cwd(), 'requirements.txt');

      if (!await fs.pathExists(reqDest)) {
        await fs.copy(reqSrc, reqDest);
      }

      spinner.succeed(chalk.green(`✓ ${template} template created`));

    } catch (error) {
      spinner.fail(chalk.red('✗ Template copy failed'));
      throw error;
    }
  }

  async copySkills(logger) {
    const spinner = ora('Installing AI assistant instructions...').start();

    try {
      const skillsPath = path.join(__dirname, '../skills/python-standards.md');
      const destPath = path.join(process.cwd(), '.copilot-instructions.md');

      if (await fs.pathExists(skillsPath)) {
        await fs.copy(skillsPath, destPath);
        spinner.succeed(chalk.green('✓ AI instructions installed'));
      } else {
        spinner.info(chalk.yellow('⚠ AI instructions not available (optional)'));
      }

    } catch (error) {
      spinner.warn(chalk.yellow('⚠ Skills installation skipped'));
      logger.debug(`Skills error: ${error.message}`);
    }
  }

  async createStandardFiles(logger) {
    const spinner = ora('Creating standard files...').start();

    try {
      // .gitignore
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (!await fs.pathExists(gitignorePath)) {
        const gitignoreContent = `# Python
venv/
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Environment
.env
.venv
env/
ENV/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# Logs
*.log
`;
        await fs.writeFile(gitignorePath, gitignoreContent);
      }

      // .env.example
      const envExamplePath = path.join(process.cwd(), '.env.example');
      if (!await fs.pathExists(envExamplePath)) {
        const envContent = `# Application Settings
APP_NAME=My Python App
APP_ENV=development
DEBUG=true

# Add your environment variables here
`;
        await fs.writeFile(envExamplePath, envContent);
      }

      // README.md (if doesn't exist)
      const readmePath = path.join(process.cwd(), 'README.md');
      if (!await fs.pathExists(readmePath)) {
        const readmeContent = `# Python Project

## Setup

\`\`\`bash
# Activate virtual environment
source venv/bin/activate  # macOS/Linux
venv\\Scripts\\activate     # Windows

# Install dependencies
pip install -r requirements.txt
\`\`\`

## Development

\`\`\`bash
# Run application
python main.py

# Run tests
pytest
\`\`\`

## Project Structure

- \`venv/\` - Virtual environment
- \`requirements.txt\` - Python dependencies
- \`.env.example\` - Example environment variables
`;
        await fs.writeFile(readmePath, readmeContent);
      }

      spinner.succeed(chalk.green('✓ Standard files created'));

    } catch (error) {
      spinner.fail(chalk.red('✗ Failed to create standard files'));
      throw error;
    }
  }

  printSuccess(template, venvManager, logger) {
    const activateCmd = venvManager.getActivateCommand();

    console.log(chalk.green.bold('\n✅ Python project initialized successfully!\n'));
    console.log(chalk.white('Next steps:\n'));
    console.log(chalk.cyan('  1. Activate virtual environment:'));
    console.log(chalk.yellow(`     ${activateCmd}\n`));
    console.log(chalk.cyan('  2. Start coding!'));

    if (template === 'fastapi') {
      console.log(chalk.yellow('     uvicorn app.main:app --reload\n'));
    } else {
      console.log(chalk.yellow('     python main.py\n'));
    }

    console.log(chalk.dim('Your AI assistant (Copilot/Cursor/Claude) will automatically:'));
    console.log(chalk.dim('  • Use the virtual environment'));
    console.log(chalk.dim('  • Install packages from configured registry'));
    console.log(chalk.dim('  • Follow Python best practices\n'));
  }
}

module.exports = { InitCommand };
