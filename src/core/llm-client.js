/**
 * LLM Client - Abstraction layer for multiple LLM providers
 * Supports Anthropic Claude and OpenAI GPT models
 */

class LLMClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.provider = null;
    this.apiKey = null;
    this.model = null;
  }

  /**
   * Initialize the LLM client with provider configuration
   */
  async initialize() {
    const llmConfig = this.config.get('llm');

    if (!llmConfig || !llmConfig.enabled) {
      throw new Error('LLM is not enabled in configuration');
    }

    this.provider = llmConfig.provider;
    this.model = llmConfig.model;

    // Get API key from environment variable
    const envVar = llmConfig.apiKeyEnv;
    this.apiKey = process.env[envVar];

    if (!this.apiKey) {
      throw new Error(
        `API key not found in environment variable ${envVar}. ` +
        `Please set it before using LLM features.`
      );
    }

    this.logger.debug(`LLM Client initialized: ${this.provider} (${this.model})`);
  }

  /**
   * Generate a completion from the LLM
   * @param {Object} options - Generation options
   * @param {string} options.prompt - The prompt to send
   * @param {string} options.systemPrompt - Optional system prompt
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Sampling temperature (0-1)
   * @returns {Promise<string>} The generated text
   */
  async complete(options) {
    const {
      prompt,
      systemPrompt = '',
      maxTokens = 4096,
      temperature = 0.7
    } = options;

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    switch (this.provider) {
      case 'anthropic':
        return await this.completeAnthropic({
          prompt,
          systemPrompt,
          maxTokens,
          temperature
        });

      case 'openai':
        return await this.completeOpenAI({
          prompt,
          systemPrompt,
          maxTokens,
          temperature
        });

      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Generate completion using Anthropic Claude API
   */
  async completeAnthropic({ prompt, systemPrompt, maxTokens, temperature }) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Anthropic API error: ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();

      // Extract text from response
      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }

      throw new Error('No content in Anthropic response');
    } catch (error) {
      this.logger.error('Anthropic API call failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate completion using OpenAI GPT API
   */
  async completeOpenAI({ prompt, systemPrompt, maxTokens, temperature }) {
    try {
      const messages = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: maxTokens,
          temperature
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `OpenAI API error: ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();

      // Extract text from response
      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }

      throw new Error('No content in OpenAI response');
    } catch (error) {
      this.logger.error('OpenAI API call failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate structured output (JSON)
   * @param {Object} options - Generation options
   * @param {string} options.prompt - The prompt to send
   * @param {Object} options.schema - JSON schema for expected output
   * @param {string} options.systemPrompt - Optional system prompt
   * @returns {Promise<Object>} Parsed JSON object
   */
  async generateJSON(options) {
    const { prompt, schema, systemPrompt = '' } = options;

    const enhancedSystemPrompt = systemPrompt
      ? `${systemPrompt}\n\nYou must respond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`
      : `You must respond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;

    const enhancedPrompt = `${prompt}\n\nRespond with ONLY valid JSON. Do not include any markdown formatting or explanations.`;

    const response = await this.complete({
      prompt: enhancedPrompt,
      systemPrompt: enhancedSystemPrompt,
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.3 // Lower temp for structured output
    });

    // Parse and validate JSON
    try {
      // Remove markdown code blocks if present
      let jsonText = response.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(jsonText);

      // Basic schema validation (simple check)
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in parsed)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error('Failed to parse JSON response:', error.message);
      this.logger.debug('Raw response:', response);
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
  }

  /**
   * Get cost estimate for a request
   * @param {number} inputTokens - Estimated input tokens
   * @param {number} outputTokens - Estimated output tokens
   * @returns {number} Estimated cost in USD
   */
  estimateCost(inputTokens, outputTokens) {
    const pricing = this.config.get('llm.pricing') || {};
    const inputCost = (pricing.inputTokensPer1M || 0) * (inputTokens / 1000000);
    const outputCost = (pricing.outputTokensPer1M || 0) * (outputTokens / 1000000);
    return inputCost + outputCost;
  }

  /**
   * Count approximate tokens in text (rough estimate)
   * @param {string} text - Text to count
   * @returns {number} Approximate token count
   */
  estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

module.exports = { LLMClient };
