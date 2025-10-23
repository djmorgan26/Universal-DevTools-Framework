const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');

/**
 * Show Context Command
 * Generate formatted context summary for AI injection
 * Perfect for pasting into Claude Code, Copilot, Cursor, etc.
 *
 * Usage:
 *   devtools context show
 *   devtools context show --format markdown
 *   devtools context show --format claude
 *   devtools context show > context.md
 */
class ShowCommand {
  constructor() {
    this.description = 'Generate AI-ready context summary';
  }

  async execute(context, options = {}) {
    const config = context.config;
    const logger = context.logger;
    const { format = 'markdown' } = options;

    try {
      const mcpGateway = new MCPGateway(config, logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, logger);
      await contextManager.initialize();

      const summary = await contextManager.generateContextSummary();

      // Output based on format
      if (format === 'claude' || format === 'markdown') {
        console.log(summary);
      } else if (format === 'json') {
        const organized = await contextManager.getAll();
        console.log(JSON.stringify(organized, null, 2));
      } else {
        console.log(summary);
      }

      await mcpGateway.shutdown();

      return { summary };
    } catch (error) {
      // Don't use logger for this command - we want clean output
      console.error(`Error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ShowCommand;
