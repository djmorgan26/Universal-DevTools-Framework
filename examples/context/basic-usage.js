#!/usr/bin/env node

/**
 * Example: Basic Context Management Usage
 *
 * This example demonstrates:
 * 1. Adding project preferences and decisions
 * 2. Querying context
 * 3. Creating relationships
 * 4. Generating AI-ready context summaries
 *
 * Usage:
 *   node examples/context/basic-usage.js
 */

const { MCPGateway } = require('../../src/core/mcp-gateway');
const { ContextManager } = require('../../src/core/context-manager');
const { ConfigManager } = require('../../src/core/config-manager');
const { Logger } = require('../../src/core/logger');

async function basicUsageDemo() {
  const config = new ConfigManager();
  await config.load();

  const logger = new Logger({ level: 'info' });
  const mcpGateway = new MCPGateway(config, logger);

  logger.info('🧠 Context Management Demo\\n');

  try {
    // Initialize
    logger.info('Initializing...');
    await mcpGateway.initialize(['memory']);

    const contextManager = new ContextManager(mcpGateway, logger);
    await contextManager.initialize();

    logger.success('✅ Ready\\n');

    // Step 1: Add preferences
    logger.info('📝 Step 1: Adding project preferences...\\n');

    await contextManager.add({
      type: 'preference',
      name: 'Async/Await Over Callbacks',
      description: 'Always use async/await instead of callbacks for better readability',
      tags: ['javascript', 'async', 'code-style']
    });

    await contextManager.add({
      type: 'preference',
      name: 'TypeScript Strict Mode',
      description: 'Enable strict mode for type safety',
      tags: ['typescript', 'type-safety']
    });

    logger.success('✅ Added 2 preferences\\n');

    // Step 2: Add architectural decisions
    logger.info('📝 Step 2: Adding architectural decisions...\\n');

    await contextManager.add({
      type: 'decision',
      name: 'Database: PostgreSQL',
      description: 'Use PostgreSQL with Prisma ORM for type-safe database access',
      tags: ['database', 'postgresql', 'prisma'],
      metadata: {
        decidedOn: '2025-01-15',
        alternatives: ['MongoDB', 'MySQL']
      }
    });

    await contextManager.add({
      type: 'decision',
      name: 'API Framework: Express.js',
      description: 'Use Express.js for REST API with middleware pattern',
      tags: ['api', 'express', 'rest']
    });

    logger.success('✅ Added 2 decisions\\n');

    // Step 3: Add coding standards
    logger.info('📝 Step 3: Adding coding standards...\\n');

    await contextManager.add({
      type: 'standard',
      name: 'Test Coverage >90%',
      description: 'All code must have test coverage above 90%',
      tags: ['testing', 'quality']
    });

    await contextManager.add({
      type: 'standard',
      name: 'Error Handling Required',
      description: 'All async functions must have proper try/catch error handling',
      tags: ['error-handling', 'quality']
    });

    logger.success('✅ Added 2 standards\\n');

    // Step 4: Create relationships
    logger.info('🔗 Step 4: Creating relationships...\\n');

    await contextManager.relate(
      'Database: PostgreSQL',
      'API Framework: Express.js',
      'uses'
    );

    await contextManager.relate(
      'Test Coverage >90%',
      'Error Handling Required',
      'enforces'
    );

    logger.success('✅ Created relationships\\n');

    // Step 5: Query context
    logger.info('🔍 Step 5: Querying context...\\n');

    const databaseContext = await contextManager.search('database');
    logger.info(`Found ${databaseContext.length} items related to "database"\\n`);

    // Step 6: Get all context organized by type
    logger.info('📊 Step 6: Getting all context...\\n');

    const organized = await contextManager.getAll();

    for (const [type, items] of Object.entries(organized)) {
      if (items.length > 0) {
        logger.info(`${type}: ${items.length} items`);
      }
    }

    logger.info('');

    // Step 7: Generate AI-ready summary
    logger.info('🤖 Step 7: Generating AI context summary...\\n');

    const summary = await contextManager.generateContextSummary();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('AI-READY CONTEXT SUMMARY');
    console.log('(Copy this into Claude Code, Copilot, Cursor, etc.)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(summary);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n');

    // Step 8: Export context
    logger.info('📤 Step 8: Exporting context...\\n');

    const exportData = await contextManager.export();
    const entityCount = exportData.graph?.entities?.length || 0;
    const relationCount = exportData.graph?.relations?.length || 0;
    logger.info(`Exported ${entityCount} entities and ${relationCount} relations\\n`);

    logger.success('✅ Demo complete!\\n');

    logger.info('💡 Key Takeaways:');
    console.log('  • Context persists across sessions (stored in Memory MCP)');
    console.log('  • Easy to add, query, and refine context');
    console.log('  • Generate summaries for AI assistants');
    console.log('  • Export/import for sharing across projects');
    console.log('  • Relationships show how concepts connect');
    console.log('');
    logger.info('Next Steps:');
    console.log('  • Use context in .claude/CLAUDE.md');
    console.log('  • Query before making changes: devtools context query "topic"');
    console.log('  • Update context as you learn: devtools context add "new insight"');

  } catch (error) {
    logger.error(`Error: ${error.message}`);
    throw error;
  } finally {
    await mcpGateway.shutdown();
  }
}

// Run the demo
basicUsageDemo()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
