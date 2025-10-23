const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');

/**
 * Get Context Command
 * Get detailed information about specific context item(s)
 *
 * Usage:
 *   devtools context get "item name"
 *   devtools context get "item1" "item2"
 */
class GetCommand {
  constructor() {
    this.description = 'Get detailed information about context items';
  }

  async execute(context, ...names) {
    const config = context.config;
    const logger = context.logger;

    if (names.length === 0) {
      throw new Error('Specify item name(s). Usage: devtools context get "item name"');
    }

    logger.info(`📖 Fetching context details...\n`);

    try {
      const mcpGateway = new MCPGateway(config, logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, logger);
      await contextManager.initialize();

      const nodes = await contextManager.getNodes(names);

      if (!nodes || nodes.length === 0) {
        logger.warn('No matching context items found.');
        logger.info('\n💡 List all items: devtools context list');
        await mcpGateway.shutdown();
        return { nodes: [], total: 0 };
      }

      this.displayNodes(nodes, logger);

      await mcpGateway.shutdown();

      return { nodes, total: nodes.length };
    } catch (error) {
      logger.error(`Failed to get context: ${error.message}`);
      throw error;
    }
  }

  displayNodes(nodes, logger) {
    logger.success(`✅ Found ${nodes.length} item(s)\n`);

    for (const node of nodes) {
      logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      logger.info(`📌 ${node.name}`);
      logger.info(`   Type: ${node.entityType}`);

      if (node.observations && node.observations.length > 0) {
        logger.info(`\n   Observations:`);
        for (const obs of node.observations) {
          logger.info(`     • ${obs}`);
        }
      }

      // Display relationships if available
      if (node.relations && node.relations.length > 0) {
        logger.info(`\n   Relationships:`);
        for (const rel of node.relations) {
          logger.info(`     ${rel.from} --[${rel.relationType}]--> ${rel.to}`);
        }
      }

      logger.info('');
    }

    logger.info('💡 Next steps:');
    logger.info('   Modify: devtools context refine <name>');
    logger.info('   Remove: devtools context remove <name>');
  }
}

module.exports = GetCommand;
