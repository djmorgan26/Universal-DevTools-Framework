const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');
const fs = require('fs').promises;
const path = require('path');

/**
 * Import Context Command
 * Import knowledge graph from JSON file
 *
 * Usage:
 *   devtools context import context.json
 *   devtools context import context.json --merge
 *   devtools context import context.json --replace
 */
class ImportCommand {
  constructor() {
    this.description = 'Import knowledge graph from JSON';
  }

  async execute(context, file, options = {}) {
    const config = context.config;
    const logger = context.logger;
    const { merge = true, replace = false } = options;

    if (!file) {
      throw new Error('File path required. Usage: devtools context import <file>');
    }

    const mergeMode = replace ? false : merge;

    logger.info(`📥 Importing context from: ${file}\n`);

    if (!mergeMode) {
      logger.warn('⚠️  REPLACE mode: This will DELETE existing context!');
    }

    try {
      const mcpGateway = new MCPGateway(config, logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, logger);
      await contextManager.initialize();

      // Read and parse file
      const filePath = path.resolve(file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(fileContent);

      // Validate structure
      if (!importData.graph || !importData.graph.entities) {
        throw new Error('Invalid context file: missing graph.entities');
      }

      const entityCount = importData.graph.entities.length;
      const relationCount = importData.graph.relations?.length || 0;

      logger.info('Import Preview:');
      logger.info(`  Entities: ${entityCount}`);
      logger.info(`  Relations: ${relationCount}`);
      logger.info(`  Mode: ${mergeMode ? 'MERGE' : 'REPLACE'}\n`);

      // Import
      const result = await contextManager.import(importData, mergeMode);

      logger.success('✅ Context imported!\n');
      logger.info(`  Imported: ${result.imported} entities`);
      logger.info(`  Relations: ${result.relations} relations`);

      logger.info('\n💡 View imported context: devtools context list');

      await mcpGateway.shutdown();

      return result;
    } catch (error) {
      logger.error(`Failed to import context: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ImportCommand;
