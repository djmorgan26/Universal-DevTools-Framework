const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');

/**
 * Remove Context Command
 * Remove one or more context items
 *
 * Usage:
 *   devtools context remove "item name"
 *   devtools context remove "item1" "item2" "item3"
 *   devtools context remove --all --type preference
 */
class RemoveCommand {
  constructor() {
    this.description = 'Remove context items';
  }

  async execute(context, ...args) {
    const config = context.config;
    const logger = context.logger;

    // Last arg might be options object
    const options = (args.length > 0 && typeof args[args.length - 1] === 'object')
      ? args.pop()
      : {};

    const names = args;
    const { all = false, type = null } = options;

    if (!all && names.length === 0) {
      throw new Error('Specify item name(s) or use --all. Usage: devtools context remove "item name"');
    }

    if (all && !type) {
      logger.warn('⚠️  WARNING: This will remove ALL context items!');
      logger.info('To confirm, use: devtools context remove --all --type all');
      logger.info('Or remove specific type: devtools context remove --all --type preference');
      return { removed: 0 };
    }

    try {
      const mcpGateway = new MCPGateway(config, logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, logger);
      await contextManager.initialize();

      let itemsToRemove = names;

      if (all) {
        // Get all items of specified type (or all types)
        if (type === 'all') {
          const organized = await contextManager.getAll();
          itemsToRemove = Object.values(organized)
            .flat()
            .map(item => item.name);
        } else {
          const items = await contextManager.getByType(type);
          itemsToRemove = items.map(item => item.name);
        }

        if (itemsToRemove.length === 0) {
          logger.info('No items found to remove.');
          await mcpGateway.shutdown();
          return { removed: 0 };
        }

        logger.warn(`⚠️  About to remove ${itemsToRemove.length} items:`);
        for (const name of itemsToRemove) {
          logger.info(`  - ${name}`);
        }
      }

      logger.info(`\n🗑️  Removing ${itemsToRemove.length} item(s)...\n`);

      if (itemsToRemove.length === 1) {
        await contextManager.remove(itemsToRemove[0]);
      } else {
        await contextManager.removeBatch(itemsToRemove);
      }

      logger.success(`✅ Removed ${itemsToRemove.length} item(s)`);

      if (itemsToRemove.length === 1) {
        logger.info(`  Removed: ${itemsToRemove[0]}`);
      }

      logger.info('\n💡 View remaining context: devtools context list');

      await mcpGateway.shutdown();

      return { removed: itemsToRemove.length, names: itemsToRemove };
    } catch (error) {
      logger.error(`Failed to remove context: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RemoveCommand;
