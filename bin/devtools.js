#!/usr/bin/env node

/**
 * DevTools Framework CLI Entry Point
 *
 * This is the main entry point when users run: npx devtools or devtools (if installed globally)
 *
 * Responsibilities:
 * 1. Check Node.js version compatibility
 * 2. Load and initialize core CLI
 * 3. Handle uncaught errors gracefully
 * 4. Provide helpful error messages
 */

const semver = require('semver');
const chalk = require('chalk');
const { CLI } = require('../src/core/cli');

// Check Node.js version
const requiredVersion = '18.0.0';
if (!semver.satisfies(process.version, `>=${requiredVersion}`)) {
  console.error(
    chalk.red(`Error: DevTools requires Node.js ${requiredVersion} or higher.`)
  );
  console.error(chalk.red(`Current version: ${process.version}`));
  console.error(
    chalk.yellow('\nPlease upgrade Node.js: https://nodejs.org/')
  );
  process.exit(1);
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ Uncaught Exception:'));
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n❌ Unhandled Promise Rejection:'));
  console.error(reason);
  process.exit(1);
});

// Initialize and run CLI
async function main() {
  try {
    const cli = new CLI();
    await cli.run(process.argv);
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal Error:'));
    console.error(error.message);

    if (process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(error.stack);
    } else {
      console.error(chalk.dim('\nRun with DEBUG=1 for more details'));
    }

    process.exit(1);
  }
}

main();
