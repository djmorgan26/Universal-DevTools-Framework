/**
 * Monitoring Manager - Centralized monitoring and observability
 *
 * Features:
 * - Performance monitoring
 * - Resource usage tracking
 * - Health checks
 * - Metrics aggregation
 * - Periodic metrics export
 *
 * Best Practices:
 * - Non-blocking metrics collection
 * - Automatic health check scheduling
 * - Resource-aware monitoring (low overhead)
 * - Graceful degradation
 */
class MonitoringManager {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
    this.enabled = config.get('monitoring.enabled') !== false;
    this.metricsInterval = config.get('monitoring.metricsInterval') || 60000; // 1 minute
    this.healthCheckInterval = config.get('monitoring.healthCheckInterval') || 30000; // 30 seconds

    this.intervals = [];
    this.components = new Map(); // Track registered components
    this.started = false;

    // Register default health checks
    this.registerDefaultHealthChecks();

    this.logger.debug('Monitoring Manager initialized', {
      enabled: this.enabled,
      metricsInterval: this.metricsInterval,
      healthCheckInterval: this.healthCheckInterval
    });
  }

  /**
   * Register default health checks
   */
  registerDefaultHealthChecks() {
    // Memory usage check
    this.logger.registerHealthCheck('memory', () => {
      const usage = process.memoryUsage();
      const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

      return {
        status: heapUsedPercent < 90 ? 'pass' : 'fail',
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        heapUsedPercent: heapUsedPercent.toFixed(2),
        rss: usage.rss,
        external: usage.external
      };
    });

    // Event loop lag check
    this.logger.registerHealthCheck('eventLoop', () => {
      const start = Date.now();
      return new Promise((resolve) => {
        setImmediate(() => {
          const lag = Date.now() - start;
          resolve({
            status: lag < 100 ? 'pass' : 'fail',
            lag,
            message: lag < 100 ? 'Healthy' : 'Event loop lagging'
          });
        });
      });
    });

    // Process uptime check
    this.logger.registerHealthCheck('uptime', () => {
      const uptime = process.uptime();
      return {
        status: 'pass',
        uptime,
        uptimeFormatted: this.formatUptime(uptime)
      };
    });
  }

  /**
   * Register a component for monitoring
   */
  registerComponent(name, component) {
    this.components.set(name, component);
    this.logger.debug(`Component registered for monitoring: ${name}`);

    // Instrument component methods if needed
    this.instrumentComponent(name, component);
  }

  /**
   * Instrument component methods for automatic monitoring
   */
  instrumentComponent(name, component) {
    // Track MCP operations
    if (name === 'mcpGateway' && component.callTool) {
      const original = component.callTool.bind(component);
      component.callTool = async (...args) => {
        const timer = this.logger.startTimer(`mcp.callTool.${args[0]}`);
        try {
          const result = await original(...args);
          timer();
          this.logger.incrementCounter('mcp.operations.success');
          return result;
        } catch (error) {
          timer();
          this.logger.incrementCounter('mcp.operations.error');
          throw error;
        }
      };
    }

    // Track agent operations
    if (name === 'orchestrator' && component.execute) {
      const original = component.execute.bind(component);
      component.execute = async (...args) => {
        const timer = this.logger.startTimer('orchestrator.execute');
        try {
          const result = await original(...args);
          timer();
          this.logger.incrementCounter('agent.executions.success');
          return result;
        } catch (error) {
          timer();
          this.logger.incrementCounter('agent.executions.error');
          throw error;
        }
      };
    }
  }

  /**
   * Start periodic monitoring
   */
  start() {
    if (!this.enabled || this.started) {
      return;
    }

    this.logger.info('Starting monitoring...');

    // Periodic metrics collection
    const metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.metricsInterval);
    this.intervals.push(metricsInterval);

    // Periodic health checks
    const healthInterval = setInterval(async () => {
      await this.runHealthChecks();
    }, this.healthCheckInterval);
    this.intervals.push(healthInterval);

    this.started = true;
    this.logger.info('Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.started) return;

    this.logger.info('Stopping monitoring...');

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    this.started = false;
    this.logger.info('Monitoring stopped');
  }

  /**
   * Collect system and application metrics
   */
  collectMetrics() {
    try {
      // Memory metrics
      const memUsage = process.memoryUsage();
      this.logger.setGauge('system.memory.heapUsed', memUsage.heapUsed);
      this.logger.setGauge('system.memory.heapTotal', memUsage.heapTotal);
      this.logger.setGauge('system.memory.rss', memUsage.rss);
      this.logger.setGauge('system.memory.external', memUsage.external);

      // CPU metrics
      const cpuUsage = process.cpuUsage();
      this.logger.setGauge('system.cpu.user', cpuUsage.user);
      this.logger.setGauge('system.cpu.system', cpuUsage.system);

      // Component-specific metrics
      for (const [name, component] of this.components.entries()) {
        if (component.getStatus) {
          const status = component.getStatus();
          this.logger.setGauge(`component.${name}.status`, JSON.stringify(status));
        }

        if (component.getMetrics) {
          const metrics = component.getMetrics();
          for (const [key, value] of Object.entries(metrics)) {
            this.logger.setGauge(`component.${name}.${key}`, value);
          }
        }
      }

      this.logger.debug('Metrics collected');
    } catch (error) {
      this.logger.error('Failed to collect metrics', { error: error.message });
    }
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    try {
      const health = await this.logger.checkHealth();

      // Log health status
      if (health.status === 'healthy') {
        this.logger.debug('Health check passed', { status: health.status });
      } else if (health.status === 'degraded') {
        this.logger.warn('Health check degraded', { status: health.status, checks: health.checks });
      } else {
        this.logger.error('Health check failed', { status: health.status, checks: health.checks });
      }

      // Set health gauge
      this.logger.setGauge('system.health', health.status);

      return health;
    } catch (error) {
      this.logger.error('Failed to run health checks', { error: error.message });
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      started: this.started,
      metricsInterval: this.metricsInterval,
      healthCheckInterval: this.healthCheckInterval,
      componentsMonitored: Array.from(this.components.keys())
    };
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return this.logger.getMetrics();
  }

  /**
   * Get health status
   */
  async getHealth() {
    return await this.logger.checkHealth();
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return this.logger.getErrorStats();
  }

  /**
   * Export metrics to file
   */
  exportMetrics() {
    this.logger.exportMetrics();
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('Monitoring Manager shutting down...');

    this.stop();

    // Export final metrics if configured
    if (this.config.get('monitoring.exportMetricsOnShutdown')) {
      this.exportMetrics();
    }

    this.logger.info('Monitoring Manager shutdown complete');
  }
}

module.exports = { MonitoringManager };
