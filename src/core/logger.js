const chalk = require('chalk');

/**
 * Logger
 *
 * Provides consistent logging across the framework
 * Supports multiple log levels with colored output
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.silent = options.silent || false;

    this.levels = {
      debug: 0,
      verbose: 1,
      info: 2,
      warn: 3,
      error: 4
    };
  }

  setLevel(level) {
    this.level = level;
  }

  shouldLog(level) {
    if (this.silent) return false;
    return this.levels[level] >= this.levels[this.level];
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray('[DEBUG]'), message, ...args);
    }
  }

  verbose(message, ...args) {
    if (this.shouldLog('verbose')) {
      console.log(chalk.cyan('[VERBOSE]'), message, ...args);
    }
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(chalk.blue('[INFO]'), message, ...args);
    }
  }

  success(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(chalk.green('[SUCCESS]'), message, ...args);
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow('[WARN]'), message, ...args);
    }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(chalk.red('[ERROR]'), message, ...args);
    }
  }
}

module.exports = { Logger };
