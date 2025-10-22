# Monitoring and Observability

The Universal DevTools Framework includes comprehensive monitoring capabilities built on a unified logging system with metrics collection, performance tracking, and health monitoring.

## Overview

The monitoring system provides:

- **Unified Logging**: Single logger instance across the entire application
- **Metrics Collection**: Counters, gauges, and histograms for performance tracking
- **Health Checks**: Automated system health monitoring
- **Performance Tracking**: Operation timing and performance metrics
- **Error Tracking**: Aggregated error statistics and history
- **Structured Logging**: Machine-parseable JSON logs (optional)
- **File Logging**: Persistent logs with automatic rotation

## Architecture

```
┌─────────────┐
│     CLI     │
└──────┬──────┘
       │ initializes
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────────┐
│   Logger    │◄─┤  Monitoring     │
│ (Singleton) │  │    Manager      │
└──────┬──────┘  └────────┬────────┘
       │                  │
       │ provides         │ monitors
       │                  │
       ▼                  ▼
┌──────────────────────────────────┐
│     Application Components       │
│  (MCP Gateway, Agents, Plugins)  │
└──────────────────────────────────┘
```

## Configuration

### Logger Configuration

Configure logging in `config/default.json`:

```json
{
  "logging": {
    "level": "info",
    "enableMetrics": true,
    "enableFileLogging": false,
    "structuredLogging": false,
    "logDir": "./logs"
  }
}
```

**Options:**

- `level`: Log level (`debug`, `verbose`, `info`, `warn`, `error`)
- `enableMetrics`: Enable metrics collection (default: `true`)
- `enableFileLogging`: Write logs to files (default: `false`)
- `structuredLogging`: Output JSON format (default: `false`)
- `logDir`: Directory for log files (default: `./logs`)

### Monitoring Configuration

```json
{
  "monitoring": {
    "enabled": true,
    "metricsInterval": 60000,
    "healthCheckInterval": 30000,
    "exportMetricsOnShutdown": true
  }
}
```

**Options:**

- `enabled`: Enable monitoring manager (default: `true`)
- `metricsInterval`: How often to collect metrics in ms (default: `60000`)
- `healthCheckInterval`: How often to run health checks in ms (default: `30000`)
- `exportMetricsOnShutdown`: Export metrics on graceful shutdown (default: `true`)

## Using the Logger

### Basic Logging

```javascript
const { getLogger } = require('./core/logger');

const logger = getLogger();

// Log levels
logger.debug('Debug information');
logger.verbose('Verbose output');
logger.info('General information');
logger.success('Success message');
logger.warn('Warning message');
logger.error('Error message');
```

### Structured Logging with Metadata

```javascript
logger.info('User login', {
  userId: '12345',
  ip: '192.168.1.1',
  timestamp: Date.now()
});

logger.error('Database connection failed', {
  error: error.message,
  host: 'localhost',
  port: 5432
});
```

### Contextual Logging

Create child loggers with context for tracing:

```javascript
// Parent logger
const logger = getLogger();

// Child logger with context
const requestLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456'
});

// All logs from this logger include the context
requestLogger.info('Processing request');
// Output includes: requestId: 'req-123', userId: 'user-456'
```

## Metrics Collection

### Counter Metrics

Counters increment over time:

```javascript
logger.incrementCounter('api.requests');
logger.incrementCounter('api.errors', 1);
logger.incrementCounter('db.queries', 5);
```

### Gauge Metrics

Gauges represent current values:

```javascript
logger.setGauge('server.connections', 42);
logger.setGauge('queue.size', 150);
logger.setGauge('cache.hitRate', 0.85);
```

### Histogram Metrics

Histograms track value distributions:

```javascript
logger.recordHistogram('request.duration', 45);
logger.recordHistogram('db.queryTime', 120);
```

### Performance Timing

Track operation duration automatically:

```javascript
// Manual timing
const timer = logger.startTimer('my-operation');
// ... do work ...
const duration = timer(); // Returns duration in ms

// Automatic timing with trackOperation
const result = await logger.trackOperation('fetchUser', async () => {
  return await db.users.findOne({ id: userId });
});
// Automatically logs duration and handles errors
```

## Performance Tracking

The logger provides built-in performance tracking:

```javascript
// Wrap async operations
const data = await logger.trackOperation('loadData', async () => {
  return await fetchDataFromAPI();
});

// Wrap sync operations
const result = logger.trackOperation('processData', () => {
  return processLargeDataset(data);
});
```

**Benefits:**

- Automatic duration tracking
- Error handling and logging
- Metrics collection
- Performance histograms

## Health Monitoring

### Register Health Checks

```javascript
logger.registerHealthCheck('database', async () => {
  try {
    await db.ping();
    return { status: 'pass', responseTime: 5 };
  } catch (error) {
    return { status: 'fail', error: error.message };
  }
});

logger.registerHealthCheck('cache', async () => {
  const connected = await redis.ping();
  return {
    status: connected ? 'pass' : 'fail',
    connected
  };
});
```

### Run Health Checks

```javascript
const health = await logger.checkHealth();

console.log(health.status); // 'healthy', 'degraded', or 'unhealthy'
console.log(health.checks); // Individual check results
```

### Default Health Checks

The framework includes default health checks:

- **Memory**: Monitors heap usage
- **Event Loop**: Detects event loop lag
- **Uptime**: Tracks process uptime

## Error Tracking

Errors are automatically tracked when logged:

```javascript
logger.error('Operation failed', {
  type: 'DatabaseError',
  operation: 'INSERT',
  table: 'users'
});

// Get error statistics
const errorStats = logger.getErrorStats();
console.log(errorStats.total);      // Total errors
console.log(errorStats.recent);     // Last 10 errors
console.log(errorStats.byType);     // Errors grouped by type
```

## CLI Commands

### View Monitoring Status

```bash
devtools monitor status
```

Output:
```
📊 Monitoring Status

Enabled: Yes
Running: Yes
Metrics Interval: 60000ms
Health Check Interval: 30000ms
Components Monitored: mcpGateway
```

### View Metrics

```bash
# Pretty format
devtools monitor metrics

# JSON format
devtools monitor metrics --json
```

Output:
```
📈 Metrics

Uptime: 125.45s

Counters:
  log.info: 42
  log.error: 3
  mcp.operations.success: 15

Gauges:
  system.memory.heapUsed: 52428800
  system.memory.heapTotal: 104857600

Histograms (Performance):
  timer.mcp.callTool.filesystem:
    Count: 15
    Min: 2ms
    Max: 45ms
    Mean: 12.35ms
    P50: 10ms
    P95: 38ms
    P99: 43ms
```

### Check Health

```bash
# Pretty format
devtools monitor health

# JSON format
devtools monitor health --json
```

Output:
```
🏥 Health Status

Status: HEALTHY
Uptime: 125.45s
Timestamp: 2025-10-22T18:30:00.000Z

Health Checks:
  ✓ memory: pass
    heapUsedPercent: 50.00
    heapUsed: 52428800
    heapTotal: 104857600
  ✓ eventLoop: pass
    lag: 2
    message: Healthy
  ✓ uptime: pass
    uptime: 125
    uptimeFormatted: 2m 5s
```

### View Errors

```bash
devtools monitor errors
```

Output:
```
⚠️  Error Statistics

Total Errors: 5

Recent Errors:
  1. Failed to connect to database
     Type: DatabaseError
     Time: 2025-10-22T18:25:00.000Z
  2. Invalid configuration
     Type: ConfigError
     Time: 2025-10-22T18:20:00.000Z

Errors by Type:
  DatabaseError: 3
  ConfigError: 2
```

### Export Metrics

Export metrics to a JSON file:

```bash
devtools monitor export
```

Creates `logs/metrics-YYYY-MM-DD.json` with full metrics data.

## File Logging

When `enableFileLogging` is enabled, logs are written to:

- `logs/app-YYYY-MM-DD.log` - All logs
- `logs/error-YYYY-MM-DD.log` - Error logs only
- `logs/metrics-YYYY-MM-DD.json` - Exported metrics

### Log Format

**Standard format:**
```
[2025-10-22T18:30:00.000Z] [INFO] [PID:12345] Application started
```

**Structured format (JSON):**
```json
{
  "timestamp": "2025-10-22T18:30:00.000Z",
  "level": "INFO",
  "message": "Application started",
  "pid": 12345,
  "hostname": "localhost",
  "context": {}
}
```

## Monitoring Manager

The Monitoring Manager provides centralized monitoring:

### Component Registration

```javascript
const monitoring = new MonitoringManager(logger, config);

// Register components for monitoring
monitoring.registerComponent('mcpGateway', mcpGateway);
monitoring.registerComponent('orchestrator', orchestrator);

// Start monitoring
monitoring.start();
```

### Automatic Instrumentation

The Monitoring Manager automatically instruments registered components:

- **MCP Gateway**: Tracks tool call performance and success/error rates
- **Orchestrator**: Tracks agent execution performance
- **Custom Components**: Extend with custom instrumentation

### Stop Monitoring

```javascript
// Stop periodic collection
monitoring.stop();

// Graceful shutdown (exports metrics if configured)
await monitoring.shutdown();
```

## Best Practices

### 1. Use the Singleton Logger

Always use `getLogger()` to ensure unified logging:

```javascript
// ✓ Good
const { getLogger } = require('./core/logger');
const logger = getLogger();

// ✗ Bad
const { Logger } = require('./core/logger');
const logger = new Logger(); // Creates separate instance
```

### 2. Add Context for Tracing

Use child loggers for request/operation tracing:

```javascript
const requestLogger = logger.child({
  requestId: generateId(),
  correlationId: headers['x-correlation-id']
});

// All logs include tracing context
requestLogger.info('Processing request');
requestLogger.info('Calling external API');
requestLogger.info('Request complete');
```

### 3. Use Structured Metadata

Always provide structured metadata for machine parsing:

```javascript
// ✓ Good
logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: Date.now()
});

// ✗ Bad
logger.info(`User ${user.id} created at ${new Date()}`);
```

### 4. Track Performance Metrics

Use `trackOperation` for consistent performance tracking:

```javascript
const result = await logger.trackOperation('db.query', async () => {
  return await db.query('SELECT * FROM users');
});
```

### 5. Register Health Checks

Add health checks for critical dependencies:

```javascript
logger.registerHealthCheck('api', async () => {
  const response = await fetch('https://api.example.com/health');
  return {
    status: response.ok ? 'pass' : 'fail',
    statusCode: response.status
  };
});
```

### 6. Handle Errors Consistently

Always log errors with context:

```javascript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    type: error.name,
    message: error.message,
    stack: error.stack,
    operation: 'riskyOperation'
  });
  throw error;
}
```

### 7. Monitor Production

Enable file logging and metrics export in production:

```json
{
  "logging": {
    "level": "info",
    "enableMetrics": true,
    "enableFileLogging": true,
    "structuredLogging": true
  },
  "monitoring": {
    "enabled": true,
    "exportMetricsOnShutdown": true
  }
}
```

## Integration Examples

### MCP Server Monitoring

```javascript
const { getLogger } = require('./core/logger');
const logger = getLogger();

async function callMCPTool(server, tool, args) {
  return await logger.trackOperation(`mcp.${server}.${tool}`, async () => {
    logger.incrementCounter('mcp.calls');
    logger.incrementCounter(`mcp.calls.${server}`);

    try {
      const result = await mcpGateway.callTool(server, tool, args);
      logger.incrementCounter('mcp.success');
      return result;
    } catch (error) {
      logger.incrementCounter('mcp.error');
      logger.error(`MCP call failed: ${server}:${tool}`, {
        server,
        tool,
        error: error.message
      });
      throw error;
    }
  });
}
```

### Agent Monitoring

```javascript
async function executeAgent(agentName, input) {
  const agentLogger = logger.child({ agent: agentName });

  return await logger.trackOperation(`agent.${agentName}`, async () => {
    agentLogger.info('Agent starting', { input });

    try {
      const result = await agent.execute(input);
      agentLogger.info('Agent completed', { result });
      logger.incrementCounter('agent.success');
      return result;
    } catch (error) {
      agentLogger.error('Agent failed', { error: error.message });
      logger.incrementCounter('agent.error');
      throw error;
    }
  });
}
```

## Troubleshooting

### High Memory Usage

Check memory metrics:

```bash
devtools monitor metrics
```

Look for `system.memory.heapUsed` approaching `system.memory.heapTotal`.

### Event Loop Lag

Check health status:

```bash
devtools monitor health
```

If event loop lag is high (>100ms), review performance histograms to identify slow operations.

### Missing Metrics

Ensure metrics are enabled in configuration:

```json
{
  "logging": {
    "enableMetrics": true
  }
}
```

### Logs Not Writing to File

1. Check file logging is enabled:
   ```json
   {
     "logging": {
       "enableFileLogging": true
     }
   }
   ```

2. Ensure log directory exists and is writable:
   ```bash
   mkdir -p logs
   chmod 755 logs
   ```

3. Check for permission errors in stderr

## Advanced Usage

### Custom Metrics Aggregation

```javascript
const metrics = logger.getMetrics();

// Calculate custom metrics
const errorRate = metrics.counters['mcp.error'] / metrics.counters['mcp.calls'];
const avgResponseTime = metrics.histograms['timer.mcp.callTool'].mean;

logger.setGauge('custom.errorRate', errorRate);
logger.setGauge('custom.avgResponseTime', avgResponseTime);
```

### Periodic Metrics Export

```javascript
setInterval(() => {
  logger.exportMetrics();
}, 300000); // Export every 5 minutes
```

### Custom Health Checks

```javascript
logger.registerHealthCheck('diskSpace', async () => {
  const { stdout } = await exec('df -h /');
  const usage = parseInt(stdout.match(/(\d+)%/)[1]);

  return {
    status: usage < 90 ? 'pass' : 'fail',
    usage: `${usage}%`,
    message: usage < 90 ? 'Sufficient disk space' : 'Low disk space'
  };
});
```

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [MCP Infrastructure](./MCP.md)
- [Agent Framework](./AGENTS.md)
- [Configuration Management](./CONFIGURATION.md)

## Summary

The monitoring system provides enterprise-grade observability:

✓ **Unified Logging** - Single logger across the application
✓ **Rich Metrics** - Counters, gauges, histograms
✓ **Health Monitoring** - Automated health checks
✓ **Performance Tracking** - Operation timing and metrics
✓ **Error Tracking** - Aggregated error statistics
✓ **Production Ready** - File logging, structured logs, graceful shutdown

Use monitoring to gain insights into application behavior, identify performance bottlenecks, and ensure system health in production.
