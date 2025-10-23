const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');

/**
 * Add Context Command
 * Add a context item (preference, decision, standard, pattern, architecture)
 *
 * Usage:
 *   devtools context add "Use async/await over callbacks" --type preference
 *   devtools context add "Database: PostgreSQL with Prisma" --type decision
 *   devtools context add "Test coverage must be >90%" --type standard
 */
class AddCommand {
  constructor() {
    this.description = 'Add a context item (preference, decision, standard, etc.)';
    this.options = [
      {
        flags: '-t, --type <type>',
        description: 'Context type: preference, decision, standard, pattern, architecture',
        defaultValue: 'preference'
      },
      {
        flags: '-n, --name <name>',
        description: 'Custom name for the item (otherwise generated from description)'
      },
      {
        flags: '--tags <tags>',
        description: 'Comma-separated tags'
      }
    ];
  }

  async execute(context, descriptionArg, options = {}) {
    const config = context.config;
    const logger = context.logger;

    const {
      name,
      type = 'preference',
      tags = [],
      metadata = {}
    } = options;

    const description = descriptionArg;

    if (!description && !name) {
      throw new Error('Description or name is required. Usage: devtools context add "description" --type preference');
    }

    // Use name if provided, otherwise generate from description
    const itemName = name || this.generateName(description);
    const itemDescription = description || name;

    logger.info('📝 Adding context item...\n');

    try {
      // Initialize MCP Gateway and Context Manager
      const mcpGateway = new MCPGateway(config, logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, logger);
      await contextManager.initialize();

      // Parse tags if string
      const parsedTags = typeof tags === 'string'
        ? tags.split(',').map(t => t.trim())
        : Array.isArray(tags) ? tags : [];

      // Add the context item
      const result = await contextManager.add({
        type,
        name: itemName,
        description: itemDescription,
        tags: parsedTags,
        metadata
      });

      logger.success('✅ Context item added!\n');
      logger.info('Details:');
      logger.info(`  Name: ${result.name}`);
      logger.info(`  Type: ${result.type}`);
      logger.info(`  Description: ${result.description}`);
      if (parsedTags.length > 0) {
        logger.info(`  Tags: ${parsedTags.join(', ')}`);
      }

      logger.info('\n💡 This context will now be available to Claude Code and other AI assistants.');
      logger.info('   View all context: devtools context list');
      logger.info('   Query context: devtools context query "search term"');

      await mcpGateway.shutdown();

      return result;
    } catch (error) {
      logger.error(`Failed to add context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a short name from description
   */
  generateName(description) {
    // Take first few words, max 50 chars
    const words = description.split(' ').slice(0, 8).join(' ');
    return words.length > 50 ? words.substring(0, 47) + '...' : words;
  }
}

module.exports = AddCommand;
