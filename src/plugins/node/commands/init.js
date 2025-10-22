const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const { NpmManager } = require('../utils/npm-manager');
const { RegistryManager } = require('../../../core/registry-manager');

/**
 * Node.js Project Initialization Command
 *
 * Creates a new Node.js project with:
 * - package.json with sensible defaults
 * - Template files (basic, express, or react)
 * - Registry configuration (.npmrc)
 * - Standard files (.gitignore, README.md, .env.example)
 * - AI assistant instructions (.copilot-instructions.md)
 * - Automatic dependency installation
 */
class InitCommand {
  constructor() {
    this.description = 'Initialize new Node.js project with package.json and dependencies';
    this.options = [
      {
        flags: '-t, --template <type>',
        description: 'Project template: basic (simple Node.js app), express (REST API), or react (React app)',
        defaultValue: 'basic'
      },
      {
        flags: '--skip-install',
        description: 'Skip installing dependencies from package.json',
        defaultValue: false
      },
      {
        flags: '--name <name>',
        description: 'Project name (defaults to directory name)'
      }
    ];
  }

  /**
   * Execute the initialization
   */
  async execute(context, options) {
    const { logger, config } = context;
    const { template, skipInstall, name } = options;

    logger.info('Initializing Node.js project...');

    try {
      // 1. Check prerequisites
      await this.checkPrerequisites(logger);

      // 2. Initialize package.json
      const npmManager = new NpmManager(logger);
      await this.initializePackageJson(npmManager, name, template, logger);

      // 3. Configure registry
      const registryManager = new RegistryManager(config);
      await this.configureRegistry(registryManager, logger);

      // 4. Copy template files
      await this.copyTemplate(template, logger);

      // 5. Copy AI skills
      await this.copySkills(logger);

      // 6. Create standard files
      await this.createStandardFiles(logger);

      // 7. Install dependencies
      if (!skipInstall) {
        await npmManager.install();
      } else {
        logger.info('Skipped dependency installation (--skip-install)');
      }

      // Success message
      logger.info('');
      logger.info('✅ Node.js project initialized successfully!');
      logger.info('');
      logger.info('Next steps:');
      logger.info('  1. npm start                 # Start the application');
      logger.info('  2. npm test                  # Run tests');
      logger.info(`  3. devtools node add <pkg>   # Add dependencies`);
      logger.info('');

    } catch (error) {
      logger.error(`Failed to initialize Node.js project: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check that Node.js and npm are available
   */
  async checkPrerequisites(logger) {
    const spinner = ora('Checking prerequisites...').start();

    try {
      const { execa } = await import('execa');

      // Check Node.js
      try {
        const { stdout: nodeVersion } = await execa('node', ['--version']);
        spinner.text = `Node.js ${nodeVersion} found`;
      } catch (error) {
        spinner.fail('Node.js not found');
        throw new Error('Node.js is required but not found in PATH');
      }

      // Check npm
      try {
        const { stdout: npmVersion } = await execa('npm', ['--version']);
        spinner.succeed(`Prerequisites OK (Node.js, npm ${npmVersion})`);
      } catch (error) {
        spinner.fail('npm not found');
        throw new Error('npm is required but not found in PATH');
      }

    } catch (error) {
      spinner.fail('Prerequisites check failed');
      throw error;
    }
  }

  /**
   * Initialize package.json with template-specific configuration
   */
  async initializePackageJson(npmManager, name, template, logger) {
    const spinner = ora('Creating package.json...').start();

    try {
      const projectName = name || path.basename(process.cwd());

      const templateConfigs = {
        basic: {
          name: projectName,
          description: 'A basic Node.js application',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            test: 'jest',
            dev: 'nodemon index.js'
          },
          dependencies: {},
          devDependencies: {
            nodemon: '^3.0.1',
            jest: '^29.7.0'
          }
        },
        express: {
          name: projectName,
          description: 'Express REST API application',
          main: 'src/server.js',
          scripts: {
            start: 'node src/server.js',
            dev: 'nodemon src/server.js',
            test: 'jest'
          },
          dependencies: {
            express: '^4.18.2',
            dotenv: '^16.3.1',
            cors: '^2.8.5'
          },
          devDependencies: {
            nodemon: '^3.0.1',
            jest: '^29.7.0',
            supertest: '^6.3.3'
          }
        },
        react: {
          name: projectName,
          description: 'React application',
          main: 'src/index.js',
          scripts: {
            start: 'react-scripts start',
            build: 'react-scripts build',
            test: 'react-scripts test',
            eject: 'react-scripts eject'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
            'react-scripts': '^5.0.1'
          },
          devDependencies: {}
        }
      };

      const config = templateConfigs[template] || templateConfigs.basic;
      await npmManager.initialize(config);

      spinner.succeed('package.json created');
    } catch (error) {
      spinner.fail('Failed to create package.json');
      throw error;
    }
  }

  /**
   * Configure npm registry
   */
  async configureRegistry(registryManager, logger) {
    const spinner = ora('Configuring npm registry...').start();

    try {
      const registryConfig = registryManager.generateNpmConfig();

      if (registryConfig) {
        const npmrcPath = path.join(process.cwd(), '.npmrc');
        await fs.writeFile(npmrcPath, registryConfig);
        spinner.succeed('npm registry configured (.npmrc created)');
      } else {
        spinner.info('Using default npm registry');
      }
    } catch (error) {
      spinner.fail('Failed to configure registry');
      throw error;
    }
  }

  /**
   * Copy template files to project directory
   */
  async copyTemplate(template, logger) {
    const spinner = ora(`Copying ${template} template...`).start();

    try {
      const templateDir = path.join(__dirname, '../templates', template);

      if (!await fs.pathExists(templateDir)) {
        spinner.fail(`Template '${template}' not found`);
        throw new Error(`Template '${template}' not found at ${templateDir}`);
      }

      const files = await fs.readdir(templateDir);
      for (const file of files) {
        const srcPath = path.join(templateDir, file);
        const destPath = path.join(process.cwd(), file);

        await fs.copy(srcPath, destPath, { overwrite: false });
      }

      spinner.succeed(`${template} template files created`);
    } catch (error) {
      spinner.fail('Failed to copy template');
      throw error;
    }
  }

  /**
   * Copy AI assistant instructions
   */
  async copySkills(logger) {
    const spinner = ora('Installing AI assistant instructions...').start();

    try {
      const skillsSource = path.join(__dirname, '../skills/node-standards.md');
      const skillsDest = path.join(process.cwd(), '.copilot-instructions.md');

      if (await fs.pathExists(skillsSource)) {
        await fs.copy(skillsSource, skillsDest);
        spinner.succeed('AI assistant instructions installed (.copilot-instructions.md)');
      } else {
        spinner.info('No AI skills file found (optional)');
      }
    } catch (error) {
      spinner.warn('Failed to copy AI instructions (non-critical)');
    }
  }

  /**
   * Create standard project files
   */
  async createStandardFiles(logger) {
    const spinner = ora('Creating standard files...').start();

    try {
      // .gitignore
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (!await fs.pathExists(gitignorePath)) {
        const gitignoreContent = `# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment
.env
.env.local
.env.*.local

# Build output
dist/
build/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/
`;
        await fs.writeFile(gitignorePath, gitignoreContent);
      }

      // .env.example
      const envExamplePath = path.join(process.cwd(), '.env.example');
      if (!await fs.pathExists(envExamplePath)) {
        const envContent = `# Environment Configuration
NODE_ENV=development
PORT=3000

# Add your environment variables here
# API_KEY=your_api_key_here
`;
        await fs.writeFile(envExamplePath, envContent);
      }

      // README.md (if it doesn't exist)
      const readmePath = path.join(process.cwd(), 'README.md');
      if (!await fs.pathExists(readmePath)) {
        const projectName = path.basename(process.cwd());
        const readmeContent = `# ${projectName}

Node.js project created with DevTools Framework.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Start production server
npm start
\`\`\`

## Project Structure

- \`src/\` - Application source code
- \`tests/\` - Test files
- \`.env.example\` - Environment variable template

## Development

This project uses:
- Node.js for runtime
- npm for package management
- Jest for testing

## License

ISC
`;
        await fs.writeFile(readmePath, readmeContent);
      }

      spinner.succeed('Standard files created (.gitignore, .env.example, README.md)');
    } catch (error) {
      spinner.fail('Failed to create standard files');
      throw error;
    }
  }
}

module.exports = { InitCommand };
