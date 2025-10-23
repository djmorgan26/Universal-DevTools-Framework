const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');
const { ProjectDiscoveryAgent } = require('../../../agents/project-discovery-agent');
const { CodeAnalyzerAgent } = require('../../../agents/code-analyzer-agent');
const fs = require('fs').promises;
const path = require('path');

/**
 * Init Context Command
 * Initialize context by analyzing current project
 * Auto-detects patterns, standards, and architecture
 *
 * Usage:
 *   devtools context init
 *   devtools context init --deep
 *   devtools context init --template python-fastapi
 */
class InitCommand {
  constructor() {
    this.description = 'Initialize context by analyzing project';
  }

  async execute(context, options = {}) {
    const config = context.config;
    const logger = context.logger;

    const {
      deep = false,
      template = null,
      targetDir = process.cwd()
    } = options;

    this.logger.info('🔍 Initializing project context...\n');

    try {
      const mcpGateway = new MCPGateway(this.config, this.logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, this.logger);
      await contextManager.initialize();

      const contextItems = [];

      if (template) {
        // Use template to seed context
        this.logger.info(`📋 Using template: ${template}\n`);
        const templateContext = this.getTemplateContext(template);
        contextItems.push(...templateContext);
      } else {
        // Analyze project to discover context
        this.logger.info('🔍 Analyzing project...\n');

        const discoveryAgent = new ProjectDiscoveryAgent(this.config, this.logger, mcpGateway);
        const analyzerAgent = new CodeAnalyzerAgent(this.config, this.logger, mcpGateway);

        // Discover structure
        const discoveryResult = await discoveryAgent.execute({
          projectRoot: targetDir,
          maxDepth: deep ? 4 : 3,
          includeHidden: false
        });

        if (discoveryResult.success) {
          // Extract context from discovery
          const discovered = this.extractContextFromDiscovery(discoveryResult);
          contextItems.push(...discovered);

          // Deep analysis if requested
          if (deep) {
            this.logger.info('\n🔬 Running deep analysis...\n');

            const analysisResult = await analyzerAgent.execute({
              projectRoot: targetDir,
              projectType: discoveryResult.projectType
            });

            if (analysisResult.success) {
              const analyzed = this.extractContextFromAnalysis(analysisResult);
              contextItems.push(...analyzed);
            }
          }
        }
      }

      // Add items to context
      if (contextItems.length > 0) {
        this.logger.info(`\n💾 Storing ${contextItems.length} context items...\n`);

        await contextManager.addBatch(contextItems);

        this.logger.success(`✅ Context initialized with ${contextItems.length} items!\n`);

        // Show summary
        this.logger.info('📋 Context Summary:');
        const organized = await contextManager.getAll();
        for (const [type, items] of Object.entries(organized)) {
          if (items.length > 0) {
            this.logger.info(`  ${type}: ${items.length} items`);
          }
        }

        this.logger.info('\n💡 Next steps:');
        this.logger.info('   View context: devtools context list');
        this.logger.info('   Add more: devtools context add "your preference"');
        this.logger.info('   Refine items: devtools context refine <name> --add "observation"');
        this.logger.info('   Show for AI: devtools context show');
      } else {
        this.logger.warn('⚠️  No context items discovered.');
        this.logger.info('\nManually add context with:');
        this.logger.info('  devtools context add "your preference" --type preference');
      }

      await mcpGateway.shutdown();

      return { items: contextItems, total: contextItems.length };
    } catch (error) {
      this.logger.error(`Failed to initialize context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract context from project discovery results
   */
  extractContextFromDiscovery(result) {
    const items = [];

    // Project type
    if (result.projectType) {
      items.push({
        type: 'architecture',
        name: `Project Type: ${result.projectType}`,
        description: `This is a ${result.projectType} project`,
        tags: ['project-type', result.projectType]
      });
    }

    // Languages
    if (result.languages && result.languages.length > 0) {
      items.push({
        type: 'architecture',
        name: 'Programming Languages',
        description: `Primary languages: ${result.languages.join(', ')}`,
        tags: ['languages', ...result.languages]
      });
    }

    // Package managers
    if (result.packageManager) {
      items.push({
        type: 'standard',
        name: `Package Manager: ${result.packageManager}`,
        description: `Use ${result.packageManager} for dependency management`,
        tags: ['package-manager', result.packageManager]
      });
    }

    return items;
  }

  /**
   * Extract context from code analysis results
   */
  extractContextFromAnalysis(result) {
    const items = [];

    // Patterns detected
    if (result.patterns && result.patterns.length > 0) {
      for (const pattern of result.patterns) {
        items.push({
          type: 'pattern',
          name: pattern.name || pattern,
          description: pattern.description || `Uses ${pattern} pattern`,
          tags: ['pattern', pattern.name || pattern]
        });
      }
    }

    // Testing approach
    if (result.testingFramework) {
      items.push({
        type: 'standard',
        name: `Testing Framework: ${result.testingFramework}`,
        description: `Use ${result.testingFramework} for testing`,
        tags: ['testing', result.testingFramework]
      });
    }

    return items;
  }

  /**
   * Get predefined context for common templates
   */
  getTemplateContext(template) {
    const templates = {
      'python-fastapi': [
        {
          type: 'architecture',
          name: 'FastAPI REST API',
          description: 'FastAPI-based REST API with async/await',
          tags: ['python', 'fastapi', 'rest-api']
        },
        {
          type: 'standard',
          name: 'Python Style',
          description: 'Follow PEP 8, use type hints, async/await preferred',
          tags: ['python', 'pep8', 'async']
        },
        {
          type: 'standard',
          name: 'Testing',
          description: 'Use pytest with >90% coverage',
          tags: ['testing', 'pytest']
        }
      ],
      'nodejs-express': [
        {
          type: 'architecture',
          name: 'Express.js REST API',
          description: 'Express.js-based REST API with middleware',
          tags: ['nodejs', 'express', 'rest-api']
        },
        {
          type: 'standard',
          name: 'JavaScript Style',
          description: 'ES6+ features, async/await, proper error handling',
          tags: ['javascript', 'es6', 'async']
        },
        {
          type: 'standard',
          name: 'Testing',
          description: 'Use Jest with >85% coverage',
          tags: ['testing', 'jest']
        }
      ]
    };

    return templates[template] || [];
  }
}

module.exports = InitCommand;
