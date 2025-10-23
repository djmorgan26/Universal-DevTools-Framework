const { BaseAgent } = require('./base-agent');
const path = require('path');
const fs = require('fs').promises;

/**
 * Code Generator Agent
 * Generates code based on user requirements using LLM
 */
class CodeGeneratorAgent extends BaseAgent {
  constructor(config, logger, mcpGateway, llmClient) {
    super(config, logger, mcpGateway);
    this.llmClient = llmClient;
  }

  /**
   * Execute code generation
   * @param {Object} inputs - Execution inputs
   * @param {string} inputs.description - What to build
   * @param {string} inputs.language - Programming language
   * @param {Object} inputs.plan - Optional plan from planning agent
   * @param {string} inputs.targetDir - Target directory for generated code
   * @returns {Promise<Object>} Generated files and metadata
   */
  async execute(inputs) {
    const {
      description,
      language = 'python',
      plan = null,
      targetDir = process.cwd()
    } = inputs;

    this.logger.info('🤖 Code Generator Agent starting...');
    this.logger.info(`Description: ${description}`);
    this.logger.info(`Language: ${language}`);
    this.logger.info(`Target: ${targetDir}`);

    try {
      // Step 1: Generate code structure
      this.logger.info('\\n📋 Generating code structure...');
      const codeStructure = await this.generateCodeStructure({
        description,
        language,
        plan
      });

      this.logger.success(`✅ Generated structure with ${codeStructure.files.length} files`);

      // Step 2: Generate individual files
      this.logger.info('\\n📝 Generating file contents...');
      const generatedFiles = [];

      for (const file of codeStructure.files) {
        this.logger.info(`  Generating ${file.path}...`);

        const content = await this.generateFileContent({
          file,
          description,
          language,
          codeStructure
        });

        generatedFiles.push({
          path: file.path,
          content,
          purpose: file.purpose
        });

        this.logger.success(`  ✅ ${file.path}`);
      }

      // Step 3: Write files to disk
      this.logger.info('\\n💾 Writing files to disk...');
      const writtenFiles = [];

      for (const file of generatedFiles) {
        const fullPath = path.join(targetDir, file.path);
        const dir = path.dirname(fullPath);

        // Create directory if needed
        await fs.mkdir(dir, { recursive: true });

        // Write file
        await fs.writeFile(fullPath, file.content, 'utf8');

        writtenFiles.push(fullPath);
        this.logger.success(`  ✅ ${file.path}`);
      }

      this.logger.success(`\\n✅ Code generation complete! Generated ${writtenFiles.length} files.`);

      return {
        success: true,
        files: generatedFiles,
        writtenFiles,
        language,
        structure: codeStructure
      };
    } catch (error) {
      this.logger.error('❌ Code generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate the overall code structure
   */
  async generateCodeStructure({ description, language, plan }) {
    const systemPrompt = `You are an expert software architect and code generator.
Your task is to design the file structure for a ${language} project based on user requirements.

Follow best practices for ${language} project structure.
Be concise but complete - include all necessary files.
Consider configuration, dependencies, tests, and documentation.`;

    const prompt = plan
      ? `Based on this requirement: "${description}"

And this plan:
${JSON.stringify(plan, null, 2)}

Generate a complete project file structure for a ${language} project.`
      : `Based on this requirement: "${description}"

Generate a complete project file structure for a ${language} project.`;

    const schema = {
      type: 'object',
      required: ['files', 'projectName', 'description'],
      properties: {
        projectName: { type: 'string' },
        description: { type: 'string' },
        files: {
          type: 'array',
          items: {
            type: 'object',
            required: ['path', 'purpose', 'type'],
            properties: {
              path: { type: 'string' },
              purpose: { type: 'string' },
              type: { type: 'string', enum: ['code', 'config', 'test', 'doc', 'data'] }
            }
          }
        }
      }
    };

    return await this.llmClient.generateJSON({
      prompt,
      systemPrompt,
      schema,
      temperature: 0.3 // Lower temperature for more consistent structure
    });
  }

  /**
   * Generate content for a specific file
   */
  async generateFileContent({ file, description, language, codeStructure }) {
    const systemPrompt = this.getSystemPromptForLanguage(language);

    const contextFiles = codeStructure.files
      .filter(f => f.path !== file.path)
      .map(f => `- ${f.path}: ${f.purpose}`)
      .join('\\n');

    const prompt = `Generate the complete content for the file: ${file.path}

Project requirement: ${description}

This file's purpose: ${file.purpose}

Other files in the project:
${contextFiles}

Generate production-ready code with:
- Proper error handling
- Clear comments and documentation
- Best practices for ${language}
- Type hints/annotations where applicable
- Comprehensive docstrings/JSDoc

Output ONLY the file content, no explanations or markdown formatting.`;

    const content = await this.llmClient.complete({
      prompt,
      systemPrompt,
      temperature: 0.5,
      maxTokens: 4096
    });

    // Clean up any markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```')) {
      // Remove markdown code blocks
      cleanContent = cleanContent.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    }

    return cleanContent;
  }

  /**
   * Get appropriate system prompt for language
   */
  getSystemPromptForLanguage(language) {
    const prompts = {
      python: `You are an expert Python developer.
Write clean, pythonic code following PEP 8 style guide.
Use type hints, docstrings, and proper error handling.
Follow modern Python best practices (Python 3.10+).`,

      javascript: `You are an expert JavaScript developer.
Write clean, modern JavaScript (ES6+) code.
Use proper JSDoc comments and error handling.
Follow Node.js best practices.`,

      typescript: `You are an expert TypeScript developer.
Write type-safe TypeScript code with proper interfaces and types.
Use TSDoc comments and comprehensive error handling.
Follow TypeScript and Node.js best practices.`,

      go: `You are an expert Go developer.
Write idiomatic Go code following Go conventions.
Use proper error handling and documentation comments.
Follow Go best practices and standard library patterns.`,

      rust: `You are an expert Rust developer.
Write safe, idiomatic Rust code.
Use proper error handling with Result types.
Follow Rust best practices and ownership principles.`,

      java: `You are an expert Java developer.
Write clean Java code following standard conventions.
Use proper JavaDoc and error handling.
Follow Java best practices and design patterns.`
    };

    return prompts[language] || prompts.javascript;
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

    if (inputs.targetDir && typeof inputs.targetDir !== 'string') {
      errors.push('targetDir must be a string');
    }

    // Validate target directory exists or can be created
    if (inputs.targetDir) {
      try {
        await fs.access(inputs.targetDir);
      } catch {
        // Directory doesn't exist, try to create it
        try {
          await fs.mkdir(inputs.targetDir, { recursive: true });
        } catch (error) {
          errors.push(`Cannot create target directory: ${error.message}`);
        }
      }
    }

    return errors;
  }

  /**
   * Get agent metadata
   */
  getMetadata() {
    return {
      name: 'CodeGeneratorAgent',
      version: '1.0.0',
      description: 'Generates code based on user requirements using LLM',
      capabilities: [
        'code_generation',
        'file_structure_design',
        'multi_language_support'
      ],
      supportedLanguages: ['python', 'javascript', 'typescript', 'go', 'rust', 'java'],
      requiredInputs: ['description'],
      optionalInputs: ['language', 'plan', 'targetDir'],
      outputs: ['files', 'writtenFiles', 'structure']
    };
  }
}

module.exports = { CodeGeneratorAgent };
