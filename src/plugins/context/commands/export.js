const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');
const fs = require('fs').promises;
const path = require('path');

/**
 * Export Context Command
 * Export entire knowledge graph to JSON file
 *
 * Usage:
 *   devtools context export
 *   devtools context export --output context.json
 *   devtools context export --output ~/my-context.json
 */
class ExportCommand {
  constructor() {
    this.description = 'Export knowledge graph to JSON';
  }

  async execute(context, options = {}) {
    const config = context.config;
    const logger = context.logger;
    const { output = null } = options;

    logger.info('📤 Exporting context...\n');

    try {
      const mcpGateway = new MCPGateway(config, logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, logger);
      await contextManager.initialize();

      const exportData = await contextManager.export();

      const entityCount = exportData.graph?.entities?.length || 0;
      const relationCount = exportData.graph?.relations?.length || 0;

      if (output) {
        // Write to file
        const outputPath = path.resolve(output);
        await fs.writeFile(
          outputPath,
          JSON.stringify(exportData, null, 2),
          'utf8'
        );

        logger.success('✅ Context exported!\n');
        logger.info(`File: ${outputPath}`);
        logger.info(`Entities: ${entityCount}`);
        logger.info(`Relations: ${relationCount}`);

        logger.info('\n💡 Import in another project:');
        logger.info(`   devtools context import ${outputPath}`);
      } else {
        // Output to stdout (can be piped)
        console.log(JSON.stringify(exportData, null, 2));
      }

      await mcpGateway.shutdown();

      return exportData;
    } catch (error) {
      logger.error(`Failed to export context: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ExportCommand;
