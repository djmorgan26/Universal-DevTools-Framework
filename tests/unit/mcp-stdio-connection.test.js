const { StdioConnection } = require('../../src/core/mcp-stdio-connection');
const { PassThrough } = require('stream');

describe('StdioConnection', () => {
  let connection;
  let mockStdin;
  let mockStdout;
  let mockLogger;

  beforeEach(() => {
    mockStdin = new PassThrough();
    mockStdout = new PassThrough();
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    connection = new StdioConnection(mockStdin, mockStdout, mockLogger);
  });

  afterEach(async () => {
    if (connection) {
      await connection.close();
    }
  });

  describe('initialization', () => {
    it('should create connection instance', () => {
      expect(connection).toBeDefined();
      expect(connection.stdin).toBe(mockStdin);
      expect(connection.stdout).toBe(mockStdout);
      expect(connection.logger).toBe(mockLogger);
    });

    it('should initialize request ID counter', () => {
      expect(connection.requestId).toBe(0);
    });

    it('should initialize pending requests map', () => {
      expect(connection.pendingRequests).toBeDefined();
      expect(connection.pendingRequests.size).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should send initialize request', async () => {
      // Mock server response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'test-server', version: '1.0.0' }
          }
        };
        mockStdout.write(JSON.stringify(response) + '\n');
      }, 10);

      await connection.initialize();

      expect(connection.initialized).toBe(true);
    });

    it('should handle initialize failure gracefully', async () => {
      // Mock server error response
      setTimeout(() => {
        mockStdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32601, message: 'Method not found' }
        }) + '\n');
      }, 10);

      // Should not throw, just log debug message
      await expect(connection.initialize()).resolves.not.toThrow();
    });
  });

  describe('request', () => {
    beforeEach(async () => {
      // Skip initialize for these tests
      connection.initialized = true;
    });

    it('should send JSON-RPC request', async () => {
      const messages = [];
      mockStdin.on('data', (data) => {
        messages.push(JSON.parse(data.toString()));
      });

      // Mock server response
      setTimeout(() => {
        mockStdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { success: true }
        }) + '\n');
      }, 10);

      await connection.request({
        method: 'test/method',
        params: { foo: 'bar' }
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        jsonrpc: '2.0',
        id: 1,
        method: 'test/method',
        params: { foo: 'bar' }
      });
    });

    it('should increment request ID', async () => {
      const messages = [];
      mockStdin.on('data', (data) => {
        messages.push(JSON.parse(data.toString()));
      });

      // Mock responses
      setTimeout(() => {
        mockStdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }) + '\n');
        mockStdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: {} }) + '\n');
      }, 10);

      await connection.request({ method: 'test1' });
      await connection.request({ method: 'test2' });

      expect(messages[0].id).toBe(1);
      expect(messages[1].id).toBe(2);
    });

    it('should return result from response', async () => {
      setTimeout(() => {
        mockStdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { data: 'test data' }
        }) + '\n');
      }, 10);

      const result = await connection.request({ method: 'test' });
      expect(result).toEqual({ data: 'test data' });
    });

    it('should reject on error response', async () => {
      setTimeout(() => {
        mockStdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32600, message: 'Invalid Request' }
        }) + '\n');
      }, 10);

      await expect(connection.request({ method: 'test' }))
        .rejects.toThrow('Invalid Request');
    });

    it('should timeout if no response', async () => {
      const promise = connection.request({ method: 'test' }, 100);

      await expect(promise).rejects.toThrow('Request timeout after 100ms');
    });

    it('should handle multiple concurrent requests', async () => {
      // Mock responses in different order
      setTimeout(() => {
        mockStdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { value: 'second' } }) + '\n');
        mockStdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { value: 'first' } }) + '\n');
        mockStdout.write(JSON.stringify({ jsonrpc: '2.0', id: 3, result: { value: 'third' } }) + '\n');
      }, 10);

      const [result1, result2, result3] = await Promise.all([
        connection.request({ method: 'test1' }),
        connection.request({ method: 'test2' }),
        connection.request({ method: 'test3' })
      ]);

      expect(result1).toEqual({ value: 'first' });
      expect(result2).toEqual({ value: 'second' });
      expect(result3).toEqual({ value: 'third' });
    });
  });

  describe('notify', () => {
    beforeEach(() => {
      connection.initialized = true;
    });

    it('should send notification without ID', () => {
      const messages = [];
      mockStdin.on('data', (data) => {
        messages.push(JSON.parse(data.toString()));
      });

      connection.notify({
        method: 'notifications/test',
        params: { foo: 'bar' }
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        jsonrpc: '2.0',
        method: 'notifications/test',
        params: { foo: 'bar' }
      });
      expect(messages[0].id).toBeUndefined();
    });
  });

  describe('handleMessage', () => {
    beforeEach(() => {
      connection.initialized = true;
    });

    it('should handle responses for pending requests', async () => {
      const requestPromise = connection.request({ method: 'test' });

      // Simulate response
      connection.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { success: true }
      }));

      const result = await requestPromise;
      expect(result).toEqual({ success: true });
    });

    it('should emit notification events', (done) => {
      connection.on('notification', (notification) => {
        expect(notification).toEqual({
          method: 'server/notification',
          params: { data: 'test' }
        });
        done();
      });

      connection.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        method: 'server/notification',
        params: { data: 'test' }
      }));
    });

    it('should emit specific event for notification method', (done) => {
      connection.on('server/status', (params) => {
        expect(params).toEqual({ status: 'ready' });
        done();
      });

      connection.handleMessage(JSON.stringify({
        jsonrpc: '2.0',
        method: 'server/status',
        params: { status: 'ready' }
      }));
    });

    it('should ignore empty lines', () => {
      expect(() => connection.handleMessage('')).not.toThrow();
      expect(() => connection.handleMessage('   ')).not.toThrow();
    });

    it('should handle malformed JSON', () => {
      connection.handleMessage('{ invalid json }');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    beforeEach(() => {
      connection.initialized = true;
    });

    it('should reject pending requests', async () => {
      const requestPromise = connection.request({ method: 'test' });

      await connection.close();

      await expect(requestPromise).rejects.toThrow('Connection closed');
    });

    it('should clear pending requests', async () => {
      connection.request({ method: 'test' }).catch(() => {}); // Ignore rejection

      expect(connection.pendingRequests.size).toBe(1);

      await connection.close();

      expect(connection.pendingRequests.size).toBe(0);
    });

    it('should set initialized to false', async () => {
      expect(connection.initialized).toBe(true);

      await connection.close();

      expect(connection.initialized).toBe(false);
    });

    it('should emit close event', (done) => {
      connection.on('close', () => {
        done();
      });

      connection.close();
    });
  });

  describe('isAlive', () => {
    it('should return false before initialization', () => {
      expect(connection.isAlive()).toBe(false);
    });

    it('should return true when initialized and streams are open', () => {
      connection.initialized = true;
      expect(connection.isAlive()).toBe(true);
    });

    it('should return false after close', async () => {
      connection.initialized = true;
      await connection.close();
      expect(connection.isAlive()).toBe(false);
    });

    it('should return false if stdin is destroyed', () => {
      connection.initialized = true;
      mockStdin.destroy();
      expect(connection.isAlive()).toBe(false);
    });

    it('should return false if stdout is destroyed', () => {
      connection.initialized = true;
      mockStdout.destroy();
      expect(connection.isAlive()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should emit error on stdout error', async () => {
      const errorPromise = new Promise((resolve) => {
        connection.once('error', (error) => {
          expect(error.message).toBe('stdout error');
          resolve();
        });
      });

      mockStdout.emit('error', new Error('stdout error'));
      await errorPromise;
    });

    it('should emit error on stdin error', async () => {
      const errorPromise = new Promise((resolve) => {
        connection.once('error', (error) => {
          expect(error.message).toBe('stdin error');
          resolve();
        });
      });

      mockStdin.emit('error', new Error('stdin error'));
      await errorPromise;
    });
  });
});
