const { Command } = require('commander');
const chalk = require('chalk');
const { initLogger, getLogger } = require('./logger');
const { ConfigManager } = require('./config-manager');
const { PluginLoader } = require('./plugin-loader');
const { MCPGateway } = require('./mcp-gateway');
const { MonitoringManager } = require('./monitoring-manager');
const path = require('path');
const fs = require('fs-extra');

class CLI {
  constructor() {
    this.program = new Command();
    this.config = new ConfigManager();
    this.pluginLoader = new PluginLoader();
    this.logger = null;
    this.mcpGateway = null;
    this.monitoring = null;
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

    // Initialize unified logger with config
    const loggerConfig = this.config.get('logging') || {};
    this.logger = initLogger({
      level: options.debug ? 'debug' : (options.verbose ? 'verbose' : loggerConfig.level),
      enableMetrics: loggerConfig.enableMetrics !== false,
      enableFileLogging: loggerConfig.enableFileLogging || false,
      structuredLogging: loggerConfig.structuredLogging || false,
      logDir: loggerConfig.logDir || './logs'
    });

    this.logger.info('Universal DevTools Framework starting...', {
      version: packageJson.version,
      nodeVersion: process.version,
      platform: process.platform
    });

    // Initialize Monitoring Manager
    this.monitoring = new MonitoringManager(this.logger, this.config);
    this.monitoring.start();

    // Initialize MCP Gateway
    try {
      this.mcpGateway = new MCPGateway(this.config, this.logger);
      this.monitoring.registerComponent('mcpGateway', this.mcpGateway);
      // Gateway will be initialized with required MCPs when plugins load
    } catch (error) {
      this.logger.warn(`Failed to create MCP Gateway: ${error.message}`);
    }

    // Register global commands
    this.registerGlobalCommands();

    // Load and register plugins
    await this.loadPlugins();

    // Setup cleanup handlers
    this.setupCleanupHandlers();

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

    // Monitoring commands
    const monitorCmd = this.program
      .command('monitor')
      .description('View monitoring and metrics');

    monitorCmd
      .command('status')
      .description('Show monitoring status')
      .action(async () => {
        if (!this.monitoring) {
          console.log(chalk.yellow('Monitoring not enabled'));
          return;
        }

        const status = this.monitoring.getStatus();
        console.log(chalk.cyan('\n📊 Monitoring Status\n'));
        console.log(chalk.blue('Enabled:'), status.enabled ? chalk.green('Yes') : chalk.red('No'));
        console.log(chalk.blue('Running:'), status.started ? chalk.green('Yes') : chalk.red('No'));
        console.log(chalk.blue('Metrics Interval:'), `${status.metricsInterval}ms`);
        console.log(chalk.blue('Health Check Interval:'), `${status.healthCheckInterval}ms`);
        console.log(chalk.blue('Components Monitored:'), status.componentsMonitored.join(', ') || 'None');
      });

    monitorCmd
      .command('metrics')
      .description('Show collected metrics')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        if (!this.monitoring) {
          console.log(chalk.yellow('Monitoring not enabled'));
          return;
        }

        const metrics = this.monitoring.getMetrics();

        if (options.json) {
          console.log(JSON.stringify(metrics, null, 2));
          return;
        }

        console.log(chalk.cyan('\n📈 Metrics\n'));
        console.log(chalk.blue('Uptime:'), `${(metrics.uptime / 1000).toFixed(2)}s`);

        if (Object.keys(metrics.counters).length > 0) {
          console.log(chalk.blue('\nCounters:'));
          for (const [key, value] of Object.entries(metrics.counters)) {
            console.log(`  ${key}: ${value}`);
          }
        }

        if (Object.keys(metrics.gauges).length > 0) {
          console.log(chalk.blue('\nGauges:'));
          for (const [key, value] of Object.entries(metrics.gauges)) {
            const val = typeof value === 'object' ? value.value : value;
            console.log(`  ${key}: ${val}`);
          }
        }

        if (Object.keys(metrics.histograms).length > 0) {
          console.log(chalk.blue('\nHistograms (Performance):'));
          for (const [key, stats] of Object.entries(metrics.histograms)) {
            console.log(`  ${key}:`);
            console.log(`    Count: ${stats.count}`);
            console.log(`    Min: ${stats.min}ms`);
            console.log(`    Max: ${stats.max}ms`);
            console.log(`    Mean: ${stats.mean.toFixed(2)}ms`);
            console.log(`    P50: ${stats.p50}ms`);
            console.log(`    P95: ${stats.p95}ms`);
            console.log(`    P99: ${stats.p99}ms`);
          }
        }
      });

    monitorCmd
      .command('health')
      .description('Run health checks')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        if (!this.monitoring) {
          console.log(chalk.yellow('Monitoring not enabled'));
          return;
        }

        const health = await this.monitoring.getHealth();

        if (options.json) {
          console.log(JSON.stringify(health, null, 2));
          return;
        }

        console.log(chalk.cyan('\n🏥 Health Status\n'));

        const statusColor = health.status === 'healthy' ? 'green'
          : health.status === 'degraded' ? 'yellow' : 'red';
        console.log(chalk.blue('Status:'), chalk[statusColor](health.status.toUpperCase()));
        console.log(chalk.blue('Uptime:'), `${(health.uptime / 1000).toFixed(2)}s`);
        console.log(chalk.blue('Timestamp:'), health.timestamp);

        console.log(chalk.blue('\nHealth Checks:'));
        for (const [name, result] of Object.entries(health.checks)) {
          const icon = result.status === 'pass' ? chalk.green('✓')
            : result.status === 'fail' ? chalk.yellow('⚠') : chalk.red('✗');
          console.log(`  ${icon} ${name}:`, result.status);

          if (result.message) {
            console.log(`    ${result.message}`);
          }

          // Show additional details
          const details = { ...result };
          delete details.status;
          delete details.message;
          if (Object.keys(details).length > 0) {
            for (const [key, value] of Object.entries(details)) {
              console.log(`    ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
            }
          }
        }
      });

    monitorCmd
      .command('errors')
      .description('Show error statistics')
      .action(async () => {
        if (!this.monitoring) {
          console.log(chalk.yellow('Monitoring not enabled'));
          return;
        }

        const errorStats = this.monitoring.getErrorStats();

        console.log(chalk.cyan('\n⚠️  Error Statistics\n'));
        console.log(chalk.blue('Total Errors:'), errorStats.total);

        if (errorStats.total > 0) {
          console.log(chalk.blue('\nRecent Errors:'));
          errorStats.recent.forEach((err, index) => {
            console.log(`  ${index + 1}. ${err.message}`);
            if (err.type) {
              console.log(`     Type: ${err.type}`);
            }
            console.log(`     Time: ${new Date(err.timestamp).toISOString()}`);
          });
        }

        if (Object.keys(errorStats.byType).length > 0) {
          console.log(chalk.blue('\nErrors by Type:'));
          for (const [type, count] of Object.entries(errorStats.byType)) {
            console.log(`  ${type}: ${count}`);
          }
        }
      });

    monitorCmd
      .command('export')
      .description('Export metrics to file')
      .action(async () => {
        if (!this.monitoring) {
          console.log(chalk.yellow('Monitoring not enabled'));
          return;
        }

        this.monitoring.exportMetrics();
        console.log(chalk.green('✓ Metrics exported'));
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

  setupCleanupHandlers() {
    // Cleanup on exit
    const cleanup = async () => {
      this.logger.info('Shutting down gracefully...');

      // Stop monitoring
      if (this.monitoring) {
        try {
          await this.monitoring.shutdown();
        } catch (error) {
          this.logger.debug(`Error during monitoring shutdown: ${error.message}`);
        }
      }

      // Shutdown MCP Gateway
      if (this.mcpGateway) {
        try {
          await this.mcpGateway.shutdown();
        } catch (error) {
          this.logger.debug(`Error during MCP Gateway shutdown: ${error.message}`);
        }
      }

      // Shutdown logger (exports metrics, closes streams)
      if (this.logger) {
        try {
          await this.logger.shutdown();
        } catch (error) {
          console.error(`Error during logger shutdown: ${error.message}`);
        }
      }
    };

    // Handle various exit scenarios
    process.on('exit', () => {
      // Synchronous cleanup only
      console.log('Process exiting');
    });

    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, cleaning up...');
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, cleaning up...');
      await cleanup();
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      if (this.logger) {
        this.logger.error(`Uncaught exception: ${error.message}`, {
          stack: error.stack
        });
      } else {
        console.error(`Uncaught exception: ${error.message}`);
      }
      await cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      if (this.logger) {
        this.logger.error(`Unhandled rejection: ${reason}`);
      } else {
        console.error(`Unhandled rejection: ${reason}`);
      }
      await cleanup();
      process.exit(1);
    });
  }
}

module.exports = { CLI };
