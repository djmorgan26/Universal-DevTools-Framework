const { BaseAgent } = require('./base-agent');

/**
 * Planning Agent
 * Creates detailed implementation plans from user requirements
 */
class PlanningAgent extends BaseAgent {
  constructor(config, logger, mcpGateway, llmClient) {
    super(config, logger, mcpGateway);
    this.llmClient = llmClient;
  }

  /**
   * Execute planning
   * @param {Object} inputs - Execution inputs
   * @param {string} inputs.description - What to build
   * @param {string} inputs.language - Programming language
   * @param {Object} inputs.context - Optional context (existing code, constraints)
   * @returns {Promise<Object>} Implementation plan
   */
  async execute(inputs) {
    const {
      description,
      language = 'python',
      context = {}
    } = inputs;

    this.logger.info('🎯 Planning Agent starting...');
    this.logger.info(`Description: ${description}`);
    this.logger.info(`Language: ${language}`);

    try {
      // Step 1: Analyze requirements
      this.logger.info('\\n🔍 Analyzing requirements...');
      const requirements = await this.analyzeRequirements({
        description,
        language,
        context
      });

      this.logger.success(`✅ Identified ${requirements.features.length} features`);

      // Step 2: Create implementation plan
      this.logger.info('\\n📋 Creating implementation plan...');
      const plan = await this.createImplementationPlan({
        description,
        language,
        requirements,
        context
      });

      this.logger.success(`✅ Plan created with ${plan.steps.length} steps`);

      // Step 3: Estimate complexity and effort
      this.logger.info('\\n⏱️  Estimating complexity...');
      const estimates = await this.estimateComplexity({
        plan,
        language,
        requirements
      });

      this.logger.success(`✅ Complexity: ${estimates.complexity}`);

      const fullPlan = {
        ...plan,
        requirements,
        estimates,
        language,
        createdAt: new Date().toISOString()
      };

      this.logger.success('\\n✅ Planning complete!');

      return {
        success: true,
        plan: fullPlan
      };
    } catch (error) {
      this.logger.error('❌ Planning failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze requirements from description
   */
  async analyzeRequirements({ description, language, context }) {
    const systemPrompt = `You are an expert software architect and requirements analyst.
Your task is to analyze user requirements and extract structured information.

Be thorough but concise. Focus on what needs to be built, not how.
Consider functional and non-functional requirements.`;

    const contextInfo = context.existingCode
      ? `\\nExisting codebase context:\\n${JSON.stringify(context.existingCode, null, 2)}`
      : '';

    const constraintsInfo = context.constraints
      ? `\\nConstraints:\\n${JSON.stringify(context.constraints, null, 2)}`
      : '';

    const prompt = `Analyze this requirement for a ${language} project:

"${description}"
${contextInfo}
${constraintsInfo}

Extract and structure the requirements.`;

    const schema = {
      type: 'object',
      required: ['features', 'dependencies', 'constraints'],
      properties: {
        features: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'description', 'priority'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] }
            }
          }
        },
        dependencies: {
          type: 'array',
          items: { type: 'string' }
        },
        constraints: {
          type: 'array',
          items: { type: 'string' }
        },
        assumptions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    };

    return await this.llmClient.generateJSON({
      prompt,
      systemPrompt,
      schema,
      temperature: 0.3
    });
  }

  /**
   * Create detailed implementation plan
   */
  async createImplementationPlan({ description, language, requirements, context }) {
    const systemPrompt = `You are an expert software architect creating implementation plans.

Your task is to create a step-by-step implementation plan.
Each step should be clear, actionable, and ordered correctly.
Consider dependencies between steps.
Include testing and documentation steps.`;

    const prompt = `Create an implementation plan for this ${language} project:

Requirement: "${description}"

Features to implement:
${requirements.features.map(f => `- ${f.name}: ${f.description} (${f.priority})`).join('\\n')}

Dependencies:
${requirements.dependencies.join(', ')}

Create a detailed, ordered implementation plan.`;

    const schema = {
      type: 'object',
      required: ['steps', 'architecture', 'testingStrategy'],
      properties: {
        steps: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name', 'description', 'dependencies'],
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string' },
              dependencies: {
                type: 'array',
                items: { type: 'number' }
              },
              estimatedTime: { type: 'string' }
            }
          }
        },
        architecture: {
          type: 'object',
          required: ['patterns', 'components'],
          properties: {
            patterns: {
              type: 'array',
              items: { type: 'string' }
            },
            components: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        testingStrategy: {
          type: 'object',
          required: ['types', 'coverage'],
          properties: {
            types: {
              type: 'array',
              items: { type: 'string' }
            },
            coverage: { type: 'string' }
          }
        }
      }
    };

    return await this.llmClient.generateJSON({
      prompt,
      systemPrompt,
      schema,
      temperature: 0.4
    });
  }

  /**
   * Estimate complexity and effort
   */
  async estimateComplexity({ plan, language, requirements }) {
    const systemPrompt = `You are an expert at estimating software project complexity.

Provide realistic estimates based on the plan and requirements.
Consider code complexity, integration points, testing needs, and documentation.`;

    const prompt = `Estimate the complexity for this ${language} project:

Features: ${requirements.features.length}
Steps: ${plan.steps.length}
Dependencies: ${requirements.dependencies.length}

Plan overview:
${plan.steps.map(s => `${s.id}. ${s.name}`).join('\\n')}

Provide complexity estimate and breakdown.`;

    const schema = {
      type: 'object',
      required: ['complexity', 'estimatedLines', 'estimatedTime', 'risks'],
      properties: {
        complexity: {
          type: 'string',
          enum: ['trivial', 'simple', 'moderate', 'complex', 'very-complex']
        },
        estimatedLines: {
          type: 'object',
          required: ['min', 'max'],
          properties: {
            min: { type: 'number' },
            max: { type: 'number' }
          }
        },
        estimatedTime: {
          type: 'string'
        },
        risks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['risk', 'severity', 'mitigation'],
            properties: {
              risk: { type: 'string' },
              severity: { type: 'string', enum: ['low', 'medium', 'high'] },
              mitigation: { type: 'string' }
            }
          }
        }
      }
    };

    return await this.llmClient.generateJSON({
      prompt,
      systemPrompt,
      schema,
      temperature: 0.3
    });
  }

  /**
   * Validate inputs before execution
   */
  async validateInputs(inputs) {
    const errors = [];

    if (!inputs.description || typeof inputs.description !== 'string') {
      errors.push('description is required and must be a string');
    }

    if (inputs.language && typeof inputs.language !== 'string') {
      errors.push('language must be a string');
    }

    if (inputs.context && typeof inputs.context !== 'object') {
      errors.push('context must be an object');
    }

    return errors;
  }

  /**
   * Get agent metadata
   */
  getMetadata() {
    return {
      name: 'PlanningAgent',
      version: '1.0.0',
      description: 'Creates detailed implementation plans from user requirements',
      capabilities: [
        'requirements_analysis',
        'implementation_planning',
        'complexity_estimation',
        'risk_assessment'
      ],
      requiredInputs: ['description'],
      optionalInputs: ['language', 'context'],
      outputs: ['plan', 'requirements', 'estimates']
    };
  }
}

module.exports = { PlanningAgent };
