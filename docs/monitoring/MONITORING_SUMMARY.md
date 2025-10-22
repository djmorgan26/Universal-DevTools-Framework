# Monitoring System Summary

## Overview

The Universal DevTools Framework now includes enterprise-grade monitoring capabilities with a unified logger that provides comprehensive observability throughout the entire application.

## Key Features

### ✅ Unified Logging
- **Single Logger Instance**: One logger used across all components via singleton pattern
- **Multiple Log Levels**: debug, verbose, info, success, warn, error
- **Colored Console Output**: Beautiful, readable terminal output
- **Contextual Logging**: Child loggers with request/operation context
- **Structured Logging**: Optional JSON format for machine parsing

### ✅ Metrics Collection
- **Counters**: Track incrementing values (API calls, errors, etc.)
- **Gauges**: Monitor current values (connections, queue size, etc.)
- **Histograms**: Analyze value distributions with percentiles (P50, P95, P99)
- **Automatic Collection**: Metrics collected on log events, operations, and health checks

### ✅ Performance Tracking
- **Operation Timing**: Automatic duration tracking with `startTimer()` and `trackOperation()`
- **Performance Histograms**: Statistical analysis of operation durations
- **Component Instrumentation**: Auto-instrument MCP Gateway and Orchestrator
- **Low Overhead**: Non-blocking metrics collection

### ✅ Health Monitoring
- **Default Health Checks**: Memory usage, event loop lag, process uptime
- **Custom Health Checks**: Register domain-specific health checks
- **Periodic Checks**: Automated health monitoring at configurable intervals
- **Status Reporting**: Healthy, degraded, or unhealthy states

### ✅ Error Tracking
- **Automatic Tracking**: Errors logged at error level are tracked
- **Error History**: Last 100 errors stored
- **Error Statistics**: Total count, recent errors, errors by type
- **Contextual Information**: Full error context for debugging

### ✅ File Logging (Optional)
- **Log Files**: Daily rotated logs (`logs/app-YYYY-MM-DD.log`)
- **Error Logs**: Separate error log file
- **Metrics Export**: JSON metrics export on shutdown
- **Structured Format**: JSON logs for log aggregation systems

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      CLI (Entry Point)                    │
│  - Initializes unified logger (singleton)                │
│  - Starts monitoring manager                             │
│  - Registers components for monitoring                   │
└────────────────┬─────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌───────────────┐  ┌──────────────────┐
│    Logger     │  │    Monitoring    │
│  (Singleton)  │◄─┤     Manager      │
└───────┬───────┘  └─────────┬────────┘
        │                    │
        │ provides           │ monitors & instruments
        │                    │
        ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│           All Application Components                      │
│  - MCP Gateway (instrumented for tool call metrics)      │
│  - Orchestrator (instrumented for agent metrics)         │
│  - Agents (use logger for contextual logging)            │
│  - Plugins (use logger from context)                     │
└──────────────────────────────────────────────────────────┘
```

## Configuration

### Quick Setup

```json
{
  "logging": {
    "level": "info",
    "enableMetrics": true,
    "enableFileLogging": false,
    "structuredLogging": false
  },
  "monitoring": {
    "enabled": true,
    "metricsInterval": 60000,
    "healthCheckInterval": 30000
  }
}
```

### Production Setup

```json
{
  "logging": {
    "level": "info",
    "enableMetrics": true,
    "enableFileLogging": true,
    "structuredLogging": true,
    "logDir": "./logs"
  },
  "monitoring": {
    "enabled": true,
    "metricsInterval": 60000,
    "healthCheckInterval": 30000,
    "exportMetricsOnShutdown": true
  }
}
```

## Usage Examples

### Basic Logging

```javascript
const { getLogger } = require('./core/logger');
const logger = getLogger();

logger.info('Application started');
logger.warn('Low memory', { heapUsed: '85%' });
logger.error('Database connection failed', { error: err.message });
```

### Performance Tracking

```javascript
// Automatic timing and error handling
const result = await logger.trackOperation('fetchUser', async () => {
  return await db.users.findOne({ id: userId });
});
```

### Metrics Collection

```javascript
logger.incrementCounter('api.requests');
logger.setGauge('server.connections', 42);
logger.recordHistogram('response.time', 125);
```

### Health Checks

```javascript
logger.registerHealthCheck('database', async () => {
  const connected = await db.ping();
  return { status: connected ? 'pass' : 'fail' };
});
```

## CLI Commands

### Monitor Status
```bash
devtools monitor status
```
Shows monitoring configuration and status.

### View Metrics
```bash
devtools monitor metrics        # Pretty format
devtools monitor metrics --json # JSON format
```
Displays all collected metrics with statistics.

### Check Health
```bash
devtools monitor health         # Pretty format
devtools monitor health --json  # JSON format
```
Runs all health checks and displays results.

### View Errors
```bash
devtools monitor errors
```
Shows error statistics and recent errors.

### Export Metrics
```bash
devtools monitor export
```
Exports metrics to JSON file.

## Example Output

### Monitor Status
```
📊 Monitoring Status

Enabled: Yes
Running: Yes
Metrics Interval: 60000ms
Health Check Interval: 30000ms
Components Monitored: mcpGateway
```

### Health Check
```
🏥 Health Status

Status: HEALTHY
Uptime: 125.45s

Health Checks:
  ✓ memory: pass
    heapUsedPercent: 45.20
    heapUsed: 52428800
    heapTotal: 104857600
  ✓ eventLoop: pass
    lag: 2
    message: Healthy
  ✓ uptime: pass
    uptime: 125
    uptimeFormatted: 2m 5s
```

### Metrics
```
📈 Metrics

Uptime: 125.45s

Counters:
  log.info: 42
  mcp.operations.success: 15
  agent.executions.success: 5

Histograms (Performance):
  timer.mcp.callTool.filesystem:
    Count: 15
    Min: 2ms
    Max: 45ms
    Mean: 12.35ms
    P95: 38ms
```

## Best Practices

### 1. Always Use the Singleton Logger
```javascript
// ✓ Good
const { getLogger } = require('./core/logger');
const logger = getLogger();

// ✗ Bad
const { Logger } = require('./core/logger');
const logger = new Logger(); // Creates separate instance!
```

### 2. Add Context for Tracing
```javascript
const requestLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456'
});
```

### 3. Track Performance
```javascript
const result = await logger.trackOperation('operation', async () => {
  // Your code here
});
```

### 4. Use Structured Metadata
```javascript
logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: Date.now()
});
```

## Automatic Instrumentation

The Monitoring Manager automatically instruments registered components:

### MCP Gateway
- Tracks tool call success/failure rates
- Measures tool call performance
- Records per-server metrics

### Orchestrator
- Tracks agent execution success/failure
- Measures agent execution time
- Records workflow performance

## System Requirements

- Node.js v14+ (for optional chaining and nullish coalescing)
- File write permissions for log directory (if file logging enabled)

## Performance Impact

The monitoring system is designed for minimal overhead:

- **Metrics Collection**: < 1ms per operation
- **Health Checks**: Run async, non-blocking
- **File Logging**: Async write streams
- **Memory**: ~5-10MB for typical workloads

## Graceful Shutdown

The system handles graceful shutdown:

1. Stop periodic monitoring
2. Shutdown MCP Gateway
3. Export final metrics (if configured)
4. Close log file streams
5. Exit cleanly

## Integration

The monitoring system is automatically initialized by the CLI:

```javascript
// In cli.js
const logger = initLogger(loggerConfig);
const monitoring = new MonitoringManager(logger, config);
monitoring.start();
monitoring.registerComponent('mcpGateway', mcpGateway);
```

All components receive the logger via context:

```javascript
const context = {
  logger: this.logger,    // Singleton logger instance
  config: this.config,
  mcpGateway: this.mcpGateway,
  options: this.program.opts()
};
```

## Future Enhancements

Potential additions for enhanced monitoring:

- [ ] Prometheus metrics endpoint
- [ ] OpenTelemetry integration
- [ ] Distributed tracing support
- [ ] Real-time dashboards
- [ ] Alert thresholds and notifications
- [ ] Log aggregation (ELK, Splunk integration)
- [ ] APM integration (New Relic, Datadog)

## Documentation

For detailed documentation, see:

- **[Complete Monitoring Guide](./docs/MONITORING.md)** - Full documentation with examples
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture overview
- **[Configuration](./docs/CONFIGURATION.md)** - Configuration management

## Summary

✅ **Enterprise-grade monitoring** with unified logging
✅ **Rich metrics** (counters, gauges, histograms)
✅ **Health monitoring** with automatic checks
✅ **Performance tracking** with automatic instrumentation
✅ **Error tracking** and aggregation
✅ **Production-ready** with file logging and graceful shutdown
✅ **Low overhead** design for production use
✅ **Comprehensive CLI** for monitoring operations

The monitoring system provides complete observability into your application, making it easy to identify performance bottlenecks, track errors, and ensure system health in production environments.
