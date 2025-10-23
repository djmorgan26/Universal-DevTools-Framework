const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');

/**
 * Query Context Command
 * Search for context items by keyword
 *
 * Usage:
 *   devtools context query "async"
 *   devtools context query "database" --format json
 */
class QueryCommand {
  constructor() {
    this.description = 'Search for context items by keyword';
  }

  async execute(context, queryText, options = {}) {
    const config = context.config;
    const logger = context.logger;
    const { format = 'pretty' } = options;

    if (!queryText) {
      throw new Error('Query is required. Usage: devtools context query "search term"');
    }

    logger.info(`🔍 Searching for: "${queryText}"\n`);

    try {
      const mcpGateway = new MCPGateway(config, logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, logger);
      await contextManager.initialize();

      const results = await contextManager.search(queryText);

      if (!results || results.length === 0) {
        logger.info('No matching context items found.');
        logger.info('\n💡 Try a different search term or view all: devtools context list');
        await mcpGateway.shutdown();
        return { results: [], total: 0 };
      }

      if (format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        this.displayResults(results, queryText, logger);
      }

      await mcpGateway.shutdown();

      return { results, total: results.length };
    } catch (error) {
      logger.error(`Failed to query context: ${error.message}`);
      throw error;
    }
  }

  displayResults(results, query, logger) {
    logger.success(`✅ Found ${results.length} matching items\n`);

    for (const item of results) {
      logger.info(`📌 ${item.name}`);
      logger.info(`   Type: ${item.entityType}`);

      if (item.observations && item.observations.length > 0) {
        logger.info(`   Observations:`);
        for (const obs of item.observations) {
          logger.info(`     - ${obs}`);
        }
      }

      logger.info('');
    }

    logger.info('💡 Next steps:');
    logger.info('   View full details: devtools context get <name>');
    logger.info('   Remove item: devtools context remove <name>');
  }
}

module.exports = QueryCommand;
