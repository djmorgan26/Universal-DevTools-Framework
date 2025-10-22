const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Unified Logger with Monitoring Capabilities
 *
 * Features:
 * - Multiple log levels (debug, verbose, info, warn, error)
 * - Colored console output
 * - Structured logging (JSON format support)
 * - Metrics collection (counters, gauges, histograms)
 * - Performance tracking
 * - Log file rotation
 * - Context-aware logging
 * - Health monitoring integration
 *
 * Best Practices:
 * - Singleton pattern for unified logging across application
 * - Structured logs for machine parsing
 * - Contextual metadata for tracing
 * - Performance metrics collection
 * - Error tracking and aggregation
 */
class Logger {
  constructor(options = {}) {
    // Basic configuration
    this.level = options.level || 'info';
    this.silent = options.silent || false;
    this.enableMetrics = options.enableMetrics !== false;
    this.enableFileLogging = options.enableFileLogging || false;
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.structuredLogging = options.structuredLogging || false;
    this.context = options.context || {};

    // Log levels with numeric priorities
    this.levels = {
      debug: 0,
      verbose: 1,
      info: 2,
      success: 2,
      warn: 3,
      error: 4
    };

    // Metrics storage
    this.metrics = {
      counters: new Map(),      // Incrementing values
      gauges: new Map(),        // Current values
      histograms: new Map(),    // Value distributions
      timers: new Map()         // Performance timers
    };

    // Error tracking
    this.errors = [];
    this.maxErrorHistory = 100;

    // Performance tracking
    this.performanceMetrics = {
      startTime: Date.now(),
      operations: new Map()
    };

    // Health status
    this.healthChecks = new Map();

    // Setup file logging if enabled
    if (this.enableFileLogging) {
      this.setupFileLogging();
    }

    // Log initialization
    this.info('Logger initialized', {
      level: this.level,
      metricsEnabled: this.enableMetrics,
      fileLogging: this.enableFileLogging,
      structuredLogging: this.structuredLogging
    });
  }

  /**
   * Setup file logging with rotation
   */
  setupFileLogging() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().split('T')[0];
      this.logFilePath = path.join(this.logDir, `app-${timestamp}.log`);
      this.errorLogPath = path.join(this.logDir, `error-${timestamp}.log`);
      this.metricsLogPath = path.join(this.logDir, `metrics-${timestamp}.json`);

      // Create log streams
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
      this.errorStream = fs.createWriteStream(this.errorLogPath, { flags: 'a' });

    } catch (error) {
      console.error('Failed to setup file logging:', error.message);
    }
  }

  /**
   * Set logging context (e.g., requestId, userId, sessionId)
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Create a child logger with additional context
   */
  child(context) {
    return new Logger({
      level: this.level,
      silent: this.silent,
      enableMetrics: this.enableMetrics,
      enableFileLogging: false, // Child doesn't create new files
      structuredLogging: this.structuredLogging,
      context: { ...this.context, ...context }
    });
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.level = level;
      this.debug(`Log level changed to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Check if message should be logged
   */
  shouldLog(level) {
    if (this.silent) return false;
    return this.levels[level] >= this.levels[this.level];
  }

  /**
   * Format log entry
   */
  formatLogEntry(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    const hostname = os.hostname();

    const entry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      pid,
      hostname,
      context: this.context,
      ...meta
    };

    if (this.structuredLogging) {
      return JSON.stringify(entry);
    }

    return `[${timestamp}] [${level.toUpperCase()}] [PID:${pid}] ${message}`;
  }

  /**
   * Write to log file
   */
  writeToFile(level, message, meta = {}) {
    if (!this.enableFileLogging) return;

    const logEntry = this.formatLogEntry(level, message, meta) + '\n';

    try {
      if (this.logStream) {
        this.logStream.write(logEntry);
      }

      // Also write errors to separate error log
      if (level === 'error' && this.errorStream) {
        this.errorStream.write(logEntry);
      }
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Core logging method
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    // Increment metrics
    if (this.enableMetrics) {
      this.incrementCounter(`log.${level}`);
    }

    // Track errors
    if (level === 'error') {
      this.trackError(message, meta);
    }

    // Write to file
    this.writeToFile(level, message, meta);

    // Return formatted entry for further processing
    return this.formatLogEntry(level, message, meta);
  }

  /**
   * Debug level logging
   */
  debug(message, meta = {}) {
    this.log('debug', message, meta);
    if (this.shouldLog('debug')) {
      const formatted = typeof message === 'string' ? message : JSON.stringify(message);
      console.log(chalk.gray('[DEBUG]'), formatted, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  /**
   * Verbose level logging
   */
  verbose(message, meta = {}) {
    this.log('verbose', message, meta);
    if (this.shouldLog('verbose')) {
      const formatted = typeof message === 'string' ? message : JSON.stringify(message);
      console.log(chalk.cyan('[VERBOSE]'), formatted, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  /**
   * Info level logging
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
    if (this.shouldLog('info')) {
      const formatted = typeof message === 'string' ? message : JSON.stringify(message);
      console.log(chalk.blue('[INFO]'), formatted, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  /**
   * Success level logging
   */
  success(message, meta = {}) {
    this.log('success', message, meta);
    if (this.shouldLog('info')) {
      const formatted = typeof message === 'string' ? message : JSON.stringify(message);
      console.log(chalk.green('[SUCCESS]'), formatted, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  /**
   * Warning level logging
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
    if (this.shouldLog('warn')) {
      const formatted = typeof message === 'string' ? message : JSON.stringify(message);
      console.warn(chalk.yellow('[WARN]'), formatted, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  /**
   * Error level logging
   */
  error(message, meta = {}) {
    this.log('error', message, meta);
    if (this.shouldLog('error')) {
      const formatted = typeof message === 'string' ? message : JSON.stringify(message);
      console.error(chalk.red('[ERROR]'), formatted, meta && Object.keys(meta).length > 0 ? meta : '');
    }
  }

  // ============================================================================
  // METRICS COLLECTION
  // ============================================================================

  /**
   * Increment a counter metric
   */
  incrementCounter(name, value = 1) {
    if (!this.enableMetrics) return;

    const current = this.metrics.counters.get(name) || 0;
    this.metrics.counters.set(name, current + value);
  }

  /**
   * Set a gauge metric (current value)
   */
  setGauge(name, value) {
    if (!this.enableMetrics) return;

    this.metrics.gauges.set(name, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Record a value in a histogram
   */
  recordHistogram(name, value) {
    if (!this.enableMetrics) return;

    if (!this.metrics.histograms.has(name)) {
      this.metrics.histograms.set(name, []);
    }

    const histogram = this.metrics.histograms.get(name);
    histogram.push({
      value,
      timestamp: Date.now()
    });

    // Keep only last 1000 values
    if (histogram.length > 1000) {
      histogram.shift();
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(name) {
    if (!this.enableMetrics) return () => 0;

    const startTime = Date.now();
    this.metrics.timers.set(name, startTime);

    return () => {
      const duration = Date.now() - startTime;
      this.recordHistogram(`timer.${name}`, duration);
      this.metrics.timers.delete(name);
      return duration;
    };
  }

  /**
   * Track operation performance
   */
  trackOperation(name, fn) {
    const timer = this.startTimer(name);

    try {
      const result = fn();

      // Handle promises
      if (result && typeof result.then === 'function') {
        return result
          .then((value) => {
            const duration = timer();
            this.debug(`Operation ${name} completed in ${duration}ms`);
            return value;
          })
          .catch((error) => {
            timer();
            this.error(`Operation ${name} failed`, { error: error.message });
            throw error;
          });
      }

      // Handle synchronous functions
      const duration = timer();
      this.debug(`Operation ${name} completed in ${duration}ms`);
      return result;
    } catch (error) {
      timer();
      this.error(`Operation ${name} failed`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics() {
    const metrics = {
      counters: Object.fromEntries(this.metrics.counters),
      gauges: Object.fromEntries(this.metrics.gauges),
      histograms: {},
      uptime: Date.now() - this.performanceMetrics.startTime,
      timestamp: new Date().toISOString()
    };

    // Calculate histogram statistics
    for (const [name, values] of this.metrics.histograms.entries()) {
      if (values.length > 0) {
        const sorted = values.map(v => v.value).sort((a, b) => a - b);
        metrics.histograms[name] = {
          count: values.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)]
        };
      }
    }

    return metrics;
  }

  /**
   * Export metrics to file
   */
  exportMetrics() {
    if (!this.enableFileLogging) return;

    const metrics = this.getMetrics();

    try {
      fs.writeFileSync(
        this.metricsLogPath,
        JSON.stringify(metrics, null, 2)
      );
      this.debug('Metrics exported', { path: this.metricsLogPath });
    } catch (error) {
      this.error('Failed to export metrics', { error: error.message });
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics.counters.clear();
    this.metrics.gauges.clear();
    this.metrics.histograms.clear();
    this.metrics.timers.clear();
    this.performanceMetrics.startTime = Date.now();
    this.info('Metrics reset');
  }

  // ============================================================================
  // ERROR TRACKING
  // ============================================================================

  /**
   * Track error for aggregation
   */
  trackError(message, meta = {}) {
    const error = {
      message,
      timestamp: Date.now(),
      context: this.context,
      ...meta
    };

    this.errors.push(error);

    // Keep only recent errors
    if (this.errors.length > this.maxErrorHistory) {
      this.errors.shift();
    }

    this.incrementCounter('errors.total');
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      total: this.errors.length,
      recent: this.errors.slice(-10),
      byType: this.errors.reduce((acc, err) => {
        const type = err.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  /**
   * Register a health check
   */
  registerHealthCheck(name, checkFn) {
    this.healthChecks.set(name, checkFn);
    this.debug(`Health check registered: ${name}`);
  }

  /**
   * Run all health checks
   */
  async checkHealth() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.performanceMetrics.startTime,
      checks: {}
    };

    for (const [name, checkFn] of this.healthChecks.entries()) {
      try {
        const result = await checkFn();
        results.checks[name] = {
          status: result ? 'pass' : 'fail',
          ...result
        };

        if (!result || result.status === 'fail') {
          results.status = 'degraded';
        }
      } catch (error) {
        results.checks[name] = {
          status: 'error',
          error: error.message
        };
        results.status = 'unhealthy';
      }
    }

    return results;
  }

  // ============================================================================
  // SYSTEM INFORMATION
  // ============================================================================

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      hostname: os.hostname()
    };
  }

  /**
   * Log system information
   */
  logSystemInfo() {
    const info = this.getSystemInfo();
    this.info('System Information', info);
    return info;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.info('Logger shutting down...');

    // Export final metrics
    if (this.enableMetrics && this.enableFileLogging) {
      this.exportMetrics();
    }

    // Close log streams
    if (this.logStream) {
      this.logStream.end();
    }
    if (this.errorStream) {
      this.errorStream.end();
    }

    this.info('Logger shutdown complete');
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton logger instance
 */
function getLogger(options) {
  if (!instance) {
    instance = new Logger(options);
  }
  return instance;
}

/**
 * Initialize logger with configuration
 */
function initLogger(options) {
  instance = new Logger(options);
  return instance;
}

module.exports = {
  Logger,
  getLogger,
  initLogger
};
