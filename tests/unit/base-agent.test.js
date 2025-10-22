const { BaseAgent } = require('../../src/agents/base-agent');

describe('BaseAgent', () => {
  let mockContext;
  let agent;

  beforeEach(() => {
    mockContext = {
      logger: {
        debug: jest.fn(),
        verbose: jest.fn(),
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      config: {
        get: jest.fn()
      },
      mcpGateway: {
        initialize: jest.fn().mockResolvedValue(undefined),
        callTool: jest.fn().mockResolvedValue({ result: 'test' })
      },
      options: {}
    };
  });

  describe('constructor', () => {
    it('should create agent with name and context', () => {
      agent = new BaseAgent('test-agent', mockContext);

      expect(agent.name).toBe('test-agent');
      expect(agent.context).toBe(mockContext);
      expect(agent.tools).toEqual([]);
      expect(agent.skills).toEqual([]);
      expect(agent.initialized).toBe(false);
    });

    it('should throw error if name is missing', () => {
      expect(() => new BaseAgent(null, mockContext)).toThrow('Agent name is required');
    });

    it('should throw error if context is missing', () => {
      expect(() => new BaseAgent('test', null)).toThrow('Agent context is required');
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should initialize agent', async () => {
      await agent.initialize();

      expect(agent.initialized).toBe(true);
    });

    it('should initialize MCP tools if required', async () => {
      agent.tools = ['filesystem', 'git'];

      await agent.initialize();

      expect(mockContext.mcpGateway.initialize).toHaveBeenCalledWith(['filesystem', 'git']);
      expect(agent.initialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      await agent.initialize();
      await agent.initialize();

      expect(mockContext.logger.debug).toHaveBeenCalledWith('[test-agent] Already initialized');
    });

    it('should continue even if MCP initialization fails', async () => {
      agent.tools = ['filesystem'];
      mockContext.mcpGateway.initialize.mockRejectedValue(new Error('MCP failed'));

      await expect(agent.initialize()).resolves.not.toThrow();
      expect(agent.initialized).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should throw error (must be overridden)', async () => {
      await expect(agent.execute({})).rejects.toThrow('test-agent agent must implement execute() method');
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should cleanup without error', async () => {
      await expect(agent.cleanup()).resolves.not.toThrow();
    });
  });

  describe('callTool', () => {
    beforeEach(async () => {
      agent = new BaseAgent('test-agent', mockContext);
      await agent.initialize();
    });

    it('should call MCP tool', async () => {
      mockContext.mcpGateway.callTool.mockResolvedValue({ text: 'result' });

      const result = await agent.callTool('filesystem', 'read_file', { path: '/test.txt' });

      expect(mockContext.mcpGateway.callTool).toHaveBeenCalledWith('filesystem', 'read_file', { path: '/test.txt' });
      expect(result).toEqual({ text: 'result' });
    });

    it('should throw error if MCP Gateway not available', async () => {
      agent.context.mcpGateway = null;

      await expect(agent.callTool('filesystem', 'read_file', {}))
        .rejects.toThrow('MCP Gateway not available in context');
    });

    it('should throw error if agent not initialized', async () => {
      agent.initialized = false;

      await expect(agent.callTool('filesystem', 'read_file', {}))
        .rejects.toThrow('Agent must be initialized before calling tools');
    });

    it('should throw and log error if tool call fails', async () => {
      mockContext.mcpGateway.callTool.mockRejectedValue(new Error('Tool failed'));

      await expect(agent.callTool('filesystem', 'read_file', {}))
        .rejects.toThrow('Tool failed');

      expect(mockContext.logger.error).toHaveBeenCalled();
    });
  });

  describe('log', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should log with agent name prefix', () => {
      agent.log('info', 'test message');

      expect(mockContext.logger.info).toHaveBeenCalledWith('[test-agent] test message');
    });

    it('should support all log levels', () => {
      agent.log('debug', 'debug msg');
      agent.log('verbose', 'verbose msg');
      agent.log('info', 'info msg');
      agent.log('warn', 'warn msg');
      agent.log('error', 'error msg');

      expect(mockContext.logger.debug).toHaveBeenCalled();
      expect(mockContext.logger.verbose).toHaveBeenCalled();
      expect(mockContext.logger.info).toHaveBeenCalled();
      expect(mockContext.logger.warn).toHaveBeenCalled();
      expect(mockContext.logger.error).toHaveBeenCalled();
    });

    it('should default to info level for unknown levels', () => {
      agent.log('unknown', 'message');

      expect(mockContext.logger.info).toHaveBeenCalledWith('[test-agent] message');
    });

    it('should handle missing logger gracefully', () => {
      agent.context.logger = null;

      expect(() => agent.log('info', 'message')).not.toThrow();
    });
  });

  describe('formatResult', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should format result with agent name and timestamp', () => {
      const result = agent.formatResult({ foo: 'bar' });

      expect(result.agent).toBe('test-agent');
      expect(result.timestamp).toBeDefined();
      expect(result.data).toEqual({ foo: 'bar' });
      expect(result.metadata).toEqual({});
    });

    it('should include metadata if provided', () => {
      const result = agent.formatResult({ foo: 'bar' }, { duration: 1000 });

      expect(result.metadata).toEqual({ duration: 1000 });
    });

    it('should have valid ISO timestamp', () => {
      const result = agent.formatResult({ foo: 'bar' });
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('validateInput', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should pass validation for valid input', () => {
      const input = { path: '/test', type: 'file' };

      expect(() => agent.validateInput(input, ['path', 'type'])).not.toThrow();
    });

    it('should throw error if input is not an object', () => {
      expect(() => agent.validateInput(null, ['path']))
        .toThrow('test-agent: Input must be an object');

      expect(() => agent.validateInput('string', ['path']))
        .toThrow('test-agent: Input must be an object');
    });

    it('should throw error if required field is missing', () => {
      const input = { path: '/test' };

      expect(() => agent.validateInput(input, ['path', 'type']))
        .toThrow("test-agent: Missing required field 'type'");
    });

    it('should pass with no required fields', () => {
      expect(() => agent.validateInput({}, [])).not.toThrow();
    });
  });

  describe('getInfo', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
      agent.tools = ['filesystem'];
      agent.skills = ['analysis'];
    });

    it('should return agent information', () => {
      const info = agent.getInfo();

      expect(info).toEqual({
        name: 'test-agent',
        tools: ['filesystem'],
        skills: ['analysis'],
        initialized: false
      });
    });
  });

  describe('isReady', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should return false before initialization', () => {
      expect(agent.isReady()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await agent.initialize();

      expect(agent.isReady()).toBe(true);
    });
  });

  describe('getRequiredTools', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should return empty array if no tools required', () => {
      expect(agent.getRequiredTools()).toEqual([]);
    });

    it('should return copy of tools array', () => {
      agent.tools = ['filesystem', 'git'];
      const tools = agent.getRequiredTools();

      expect(tools).toEqual(['filesystem', 'git']);
      expect(tools).not.toBe(agent.tools); // Different reference
    });
  });

  describe('startTimer', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should create timer with stop method', () => {
      const timer = agent.startTimer();

      expect(timer).toHaveProperty('stop');
      expect(typeof timer.stop).toBe('function');
    });

    it('should measure elapsed time', async () => {
      const timer = agent.startTimer();

      await new Promise(resolve => setTimeout(resolve, 100));

      const duration = timer.stop();

      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('wrapError', () => {
    beforeEach(() => {
      agent = new BaseAgent('test-agent', mockContext);
    });

    it('should wrap error with agent context', () => {
      const originalError = new Error('Original message');
      const wrappedError = agent.wrapError(originalError, 'test-operation');

      expect(wrappedError.message).toBe('test-agent failed during test-operation: Original message');
      expect(wrappedError.originalError).toBe(originalError);
      expect(wrappedError.agent).toBe('test-agent');
      expect(wrappedError.operation).toBe('test-operation');
    });
  });
});
