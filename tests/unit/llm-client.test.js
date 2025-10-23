const { LLMClient } = require('../../src/core/llm-client');
const { ConfigManager } = require('../../src/core/config-manager');
const { Logger } = require('../../src/core/logger');

// Mock fetch for testing
global.fetch = jest.fn();

describe('LLMClient', () => {
  let config;
  let logger;
  let client;

  beforeEach(async () => {
    jest.clearAllMocks();

    config = new ConfigManager();
    await config.load();

    logger = new Logger({ level: 'error' }); // Suppress logs in tests

    // Enable LLM in config
    config.set('llm.enabled', true);
    config.set('llm.provider', 'anthropic');
    config.set('llm.model', 'claude-3-5-sonnet-20241022');
    config.set('llm.apiKeyEnv', 'ANTHROPIC_API_KEY');

    // Set mock API key
    process.env.ANTHROPIC_API_KEY = 'test-api-key-123';

    client = new LLMClient(config, logger);
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('initialization', () => {
    test('should initialize with Anthropic provider', async () => {
      await client.initialize();
      expect(client.provider).toBe('anthropic');
      expect(client.model).toBe('claude-3-5-sonnet-20241022');
      expect(client.apiKey).toBe('test-api-key-123');
    });

    test('should initialize with OpenAI provider', async () => {
      config.set('llm.provider', 'openai');
      config.set('llm.model', 'gpt-4');
      config.set('llm.apiKeyEnv', 'OPENAI_API_KEY');
      process.env.OPENAI_API_KEY = 'test-openai-key';

      await client.initialize();
      expect(client.provider).toBe('openai');
      expect(client.model).toBe('gpt-4');
      expect(client.apiKey).toBe('test-openai-key');
    });

    test('should throw error if LLM not enabled', async () => {
      config.set('llm.enabled', false);
      await expect(client.initialize()).rejects.toThrow(
        'LLM is not enabled in configuration'
      );
    });

    test('should throw error if API key not found', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      await expect(client.initialize()).rejects.toThrow(
        'API key not found in environment variable ANTHROPIC_API_KEY'
      );
    });
  });

  describe('Anthropic completions', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should complete prompt with Anthropic', async () => {
      const mockResponse = {
        content: [{ text: 'Generated code here' }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.complete({
        prompt: 'Write a hello world function',
        systemPrompt: 'You are a code generator',
        maxTokens: 1024,
        temperature: 0.5
      });

      expect(result).toBe('Generated code here');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key-123',
            'anthropic-version': '2023-06-01'
          })
        })
      );

      const fetchCall = global.fetch.mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      expect(body.model).toBe('claude-3-5-sonnet-20241022');
      expect(body.max_tokens).toBe(1024);
      expect(body.temperature).toBe(0.5);
      expect(body.system).toBe('You are a code generator');
      expect(body.messages[0].content).toBe('Write a hello world function');
    });

    test('should handle Anthropic API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'Invalid request' }
        })
      });

      await expect(
        client.complete({ prompt: 'test' })
      ).rejects.toThrow('Anthropic API error: Invalid request');
    });

    test('should handle missing content in response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [] })
      });

      await expect(
        client.complete({ prompt: 'test' })
      ).rejects.toThrow('No content in Anthropic response');
    });
  });

  describe('OpenAI completions', () => {
    beforeEach(async () => {
      config.set('llm.provider', 'openai');
      config.set('llm.model', 'gpt-4');
      config.set('llm.apiKeyEnv', 'OPENAI_API_KEY');
      process.env.OPENAI_API_KEY = 'test-openai-key';
      await client.initialize();
    });

    test('should complete prompt with OpenAI', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Generated code here'
            }
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.complete({
        prompt: 'Write a hello world function',
        systemPrompt: 'You are a code generator',
        maxTokens: 1024,
        temperature: 0.5
      });

      expect(result).toBe('Generated code here');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-openai-key'
          })
        })
      );

      const fetchCall = global.fetch.mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      expect(body.model).toBe('gpt-4');
      expect(body.max_tokens).toBe(1024);
      expect(body.temperature).toBe(0.5);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe('You are a code generator');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe('Write a hello world function');
    });

    test('should handle OpenAI API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Invalid API key' }
        })
      });

      await expect(
        client.complete({ prompt: 'test' })
      ).rejects.toThrow('OpenAI API error: Invalid API key');
    });
  });

  describe('JSON generation', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should generate valid JSON', async () => {
      const mockResponse = {
        content: [
          {
            text: JSON.stringify({
              files: ['main.py', 'requirements.txt'],
              steps: ['Create files', 'Install deps']
            })
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const schema = {
        type: 'object',
        required: ['files', 'steps'],
        properties: {
          files: { type: 'array' },
          steps: { type: 'array' }
        }
      };

      const result = await client.generateJSON({
        prompt: 'Generate a plan for a Python project',
        schema
      });

      expect(result).toEqual({
        files: ['main.py', 'requirements.txt'],
        steps: ['Create files', 'Install deps']
      });
    });

    test('should handle JSON with markdown code blocks', async () => {
      const mockResponse = {
        content: [
          {
            text: '```json\n{"files": ["main.py"]}\n```'
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const schema = {
        type: 'object',
        required: ['files']
      };

      const result = await client.generateJSON({
        prompt: 'Generate a plan',
        schema
      });

      expect(result).toEqual({ files: ['main.py'] });
    });

    test('should validate required fields', async () => {
      const mockResponse = {
        content: [{ text: '{"files": []}' }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const schema = {
        type: 'object',
        required: ['files', 'steps']
      };

      await expect(
        client.generateJSON({ prompt: 'test', schema })
      ).rejects.toThrow('Missing required field: steps');
    });

    test('should throw error for invalid JSON', async () => {
      const mockResponse = {
        content: [{ text: 'Not valid JSON' }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const schema = { type: 'object' };

      await expect(
        client.generateJSON({ prompt: 'test', schema })
      ).rejects.toThrow('Invalid JSON response');
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      config.set('llm.pricing.inputTokensPer1M', 3.0);
      config.set('llm.pricing.outputTokensPer1M', 15.0);
      await client.initialize();
    });

    test('should estimate cost correctly', () => {
      const cost = client.estimateCost(1000, 500);
      expect(cost).toBeCloseTo(0.0105, 4); // (1000/1M * 3) + (500/1M * 15)
    });

    test('should estimate tokens', () => {
      const text = 'This is a test string with approximately twenty characters per word';
      const tokens = client.estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });
  });

  describe('error handling', () => {
    test('should require prompt', async () => {
      await client.initialize();
      await expect(client.complete({})).rejects.toThrow('Prompt is required');
    });

    test('should throw error for unsupported provider', async () => {
      config.set('llm.provider', 'unsupported');
      await client.initialize();
      await expect(
        client.complete({ prompt: 'test' })
      ).rejects.toThrow('Unsupported LLM provider: unsupported');
    });
  });
});
