const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');

/**
 * List Context Command
 * List all context items, optionally filtered by type
 *
 * Usage:
 *   devtools context list
 *   devtools context list --type preference
 *   devtools context list --format json
 */
class ListCommand {
  constructor() {
    this.description = 'List all context items';
  }

  async execute(context, options = {}) {
    const config = context.config;
    const logger = context.logger;

    const {
      type = null,
      format = 'pretty'
    } = options;

    logger.info('📋 Loading context...\n');

    try {
      const mcpGateway = new MCPGateway(config, logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, logger);
      await contextManager.initialize();

      // Get context items
      const organized = type
        ? { [type]: await contextManager.getByType(type) }
        : await contextManager.getAll();

      // Calculate total
      const total = Object.values(organized).reduce((sum, items) => sum + items.length, 0);

      if (total === 0) {
        logger.info('No context items found.');
        logger.info('\n💡 Add context with: devtools context add "your preference"');
        await mcpGateway.shutdown();
        return { items: [], total: 0 };
      }

      if (format === 'json') {
        console.log(JSON.stringify(organized, null, 2));
      } else {
        this.displayPretty(organized, total, logger);
      }

      await mcpGateway.shutdown();

      return { items: organized, total };
    } catch (error) {
      logger.error(`Failed to list context: ${error.message}`);
      throw error;
    }
  }

  displayPretty(organized, total, logger) {
    logger.success(`✅ Found ${total} context items\n`);

    const typeEmojis = {
      preferences: '⚙️ ',
      decisions: '🎯',
      standards: '📏',
      patterns: '🔄',
      architecture: '🏗️ ',
      other: '📦'
    };

    const typeLabels = {
      preferences: 'Preferences',
      decisions: 'Decisions',
      standards: 'Coding Standards',
      patterns: 'Patterns',
      architecture: 'Architecture',
      other: 'Other'
    };

    for (const [type, items] of Object.entries(organized)) {
      if (items.length === 0) continue;

      const emoji = typeEmojis[type] || '📌';
      const label = typeLabels[type] || type;

      logger.info(`${emoji} ${label} (${items.length}):`);

      for (const item of items) {
        logger.info(`  • ${item.name}`);

        // Display first observation (usually the description)
        if (item.observations && item.observations.length > 0) {
          const desc = item.observations[0];
          if (!desc.startsWith('Tags:') && !desc.startsWith('Metadata:')) {
            logger.info(`    ${desc}`);
          }
        }
      }

      logger.info('');
    }

    logger.info('💡 Commands:');
    logger.info('   View details: devtools context get <name>');
    logger.info('   Search: devtools context query "search term"');
    logger.info('   Remove: devtools context remove <name>');
    logger.info('   Export: devtools context export > context.json');
  }
}

module.exports = ListCommand;
