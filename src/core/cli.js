const { Command } = require('commander');
const chalk = require('chalk');
const { Logger } = require('./logger');
const { ConfigManager } = require('./config-manager');
const { PluginLoader } = require('./plugin-loader');
const path = require('path');
const fs = require('fs-extra');

class CLI {
  constructor() {
    this.program = new Command();
    this.logger = new Logger();
    this.config = new ConfigManager();
    this.pluginLoader = new PluginLoader();
    this.mcpGateway = null;
  }

  async run(argv) {
    // Get package version
    const packageJson = await fs.readJSON(path.join(__dirname, '../../package.json'));

    // Setup program metadata
    this.program
      .name('devtools')
      .description('Universal development tools framework')
      .version(packageJson.version)
      .option('-v, --verbose', 'Enable verbose logging')
      .option('--debug', 'Enable debug mode')
      .option('--profile <name>', 'Use specific config profile')
      .option('--dry-run', 'Show what would happen without doing it');

    // Load configuration
    await this.config.load();

    // Apply profile if specified
    const options = this.program.opts();
    if (options.profile) {
      await this.config.useProfile(options.profile);
    }

    // Set logger level
    if (options.debug) {
      this.logger.setLevel('debug');
    } else if (options.verbose) {
      this.logger.setLevel('verbose');
    }

    // Register global commands
    this.registerGlobalCommands();

    // Load and register plugins
    await this.loadPlugins();

    // Parse and execute
    await this.program.parseAsync(argv);
  }

  async loadPlugins() {
    const plugins = await this.pluginLoader.loadAll();

    for (const plugin of plugins) {
      this.logger.debug(`Loading plugin: ${plugin.name}`);

      // Create command for this plugin
      const pluginCmd = this.program
        .command(plugin.name)
        .description(plugin.description || `${plugin.name} plugin commands`);

      // Register plugin's commands
      for (const [cmdName, cmdHandler] of Object.entries(plugin.commands)) {
        // Build command with arguments if specified
        const cmdSignature = cmdHandler.arguments
          ? `${cmdName} ${cmdHandler.arguments}`
          : cmdName;

        const subCmd = pluginCmd.command(cmdSignature);

        // Add command-specific options if provided
        if (cmdHandler.options) {
          cmdHandler.options.forEach(opt => {
            subCmd.option(opt.flags, opt.description, opt.defaultValue);
          });
        }

        // Set description
        if (cmdHandler.description) {
          subCmd.description(cmdHandler.description);
        }

        // Set action handler with context injection
        subCmd.action(async (...args) => {
          const context = {
            logger: this.logger,
            config: this.config,
            mcpGateway: this.mcpGateway,
            options: this.program.opts()
          };

          await cmdHandler.execute(context, ...args);
        });
      }
    }
  }

  registerGlobalCommands() {
    // Config commands
    const configCmd = this.program
      .command('config')
      .description('Manage configuration');

    configCmd
      .command('list')
      .description('List available profiles')
      .action(async () => {
        const profiles = await this.config.listProfiles();
        console.log(chalk.cyan('Available profiles:'));
        profiles.forEach(p => {
          const active = p === this.config.activeProfile ? chalk.green('(active)') : '';
          console.log(`  - ${p} ${active}`);
        });
      });

    configCmd
      .command('show [profile]')
      .description('Show profile configuration')
      .action(async (profile) => {
        const config = await this.config.getProfile(profile || this.config.activeProfile);
        console.log(chalk.cyan(`Profile: ${profile || this.config.activeProfile}`));
        console.log(JSON.stringify(config, null, 2));
      });

    configCmd
      .command('create <name>')
      .description('Create new profile')
      .option('--from <template>', 'Create from template')
      .action(async (name, options) => {
        await this.config.createProfile(name, options.from);
        console.log(chalk.green(`✓ Profile '${name}' created`));
      });

    configCmd
      .command('use <profile>')
      .description('Set active profile')
      .action(async (profile) => {
        await this.config.useProfile(profile);
        console.log(chalk.green(`✓ Now using profile '${profile}'`));
      });

    configCmd
      .command('set <key> <value>')
      .description('Set configuration value')
      .action(async (key, value) => {
        await this.config.set(key, value);
        console.log(chalk.green(`✓ ${key} = ${value}`));
      });

    // Doctor command (system check)
    this.program
      .command('doctor')
      .description('Check system configuration')
      .action(async () => {
        console.log(chalk.cyan('🔍 Running system diagnostics...\n'));

        const checks = [
          this.checkNode(),
          this.checkPython(),
          this.checkGit(),
          this.config.validate()
        ];

        const results = await Promise.allSettled(checks);

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            console.log(chalk.green('✓'), result.value);
          } else {
            console.log(chalk.red('✗'), result.reason.message);
          }
        });
      });
  }

  async checkNode() {
    return `Node.js ${process.version}`;
  }

  async checkPython() {
    const { execa } = await import('execa');
    try {
      const { stdout } = await execa('python3', ['--version']);
      return `${stdout}`;
    } catch {
      try {
        const { stdout } = await execa('python', ['--version']);
        return `${stdout}`;
      } catch {
        throw new Error('Python not found');
      }
    }
  }

  async checkGit() {
    const { execa } = await import('execa');
    try {
      const { stdout } = await execa('git', ['--version']);
      return `${stdout}`;
    } catch {
      throw new Error('Git not found');
    }
  }
}

module.exports = { CLI };
