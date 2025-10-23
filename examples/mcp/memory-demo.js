#!/usr/bin/env node

/**
 * Example: Using Memory MCP Server for Persistent Knowledge
 *
 * This example demonstrates:
 * 1. Storing project knowledge in memory server
 * 2. Creating relationships between entities
 * 3. Searching and retrieving knowledge
 * 4. Building a persistent knowledge graph
 *
 * Usage:
 *   node examples/mcp/memory-demo.js
 */

const { MCPGateway } = require('../../src/core/mcp-gateway');
const { ConfigManager } = require('../../src/core/config-manager');
const { Logger } = require('../../src/core/logger');

async function memoryDemo() {
  // Initialize components
  const config = new ConfigManager();
  await config.load();

  const logger = new Logger({ level: 'info' });
  const gateway = new MCPGateway(config, logger);

  logger.info('🧠 Memory MCP Server Demo\n');
  logger.info('Initializing MCP Gateway with Memory server...');
  await gateway.initialize(['memory']);
  logger.info('✅ Memory server ready\n');

  try {
    // 1. Create project entities
    logger.info('📝 Step 1: Storing project knowledge...');

    await gateway.callTool('memory', 'create_entities', {
      entities: [
        {
          name: 'Universal DevTools Framework',
          entityType: 'project',
          observations: [
            'Production-ready CLI tool for development workflows',
            'Supports Python and Node.js plugins',
            'Uses MCP protocol for tool integration',
            'Test coverage above 95%'
          ]
        },
        {
          name: 'Coding Standards',
          entityType: 'convention',
          observations: [
            'Always use async/await',
            'ES6+ features preferred',
            'Comprehensive error handling required',
            'All code must have tests'
          ]
        },
        {
          name: 'Git Workflow',
          entityType: 'process',
          observations: [
            'Feature branches from main',
            'PR required for all changes',
            'Tests must pass before merge',
            'Commit messages follow conventional commits'
          ]
        }
      ]
    });

    logger.success('✅ Stored 3 knowledge entities');

    // 2. Create relationships between entities
    logger.info('\n🔗 Step 2: Creating relationships...');

    await gateway.callTool('memory', 'create_relations', {
      relations: [
        {
          from: 'Universal DevTools Framework',
          to: 'Coding Standards',
          relationType: 'follows'
        },
        {
          from: 'Universal DevTools Framework',
          to: 'Git Workflow',
          relationType: 'uses'
        }
      ]
    });

    logger.success('✅ Created relationships between entities');

    // 3. Read entire graph
    logger.info('\n📊 Step 3: Reading knowledge graph...');

    const graph = await gateway.callTool('memory', 'read_graph', {});

    console.log('\nKnowledge Graph Response:');
    console.log(JSON.stringify(graph, null, 2));

    logger.info('\n✅ Knowledge stored in memory server!');

    logger.success('\n✅ Memory demo completed successfully!');
    logger.info('\n💡 Key Takeaways:');
    console.log('  • Knowledge persists across sessions');
    console.log('  • Build relationships between concepts');
    console.log('  • Search and retrieve relevant information');
    console.log('  • Perfect for project documentation and standards');
    console.log('  • Agents can "remember" past decisions and conventions');

  } catch (error) {
    logger.error(`\n❌ Error: ${error.message}`);
    throw error;
  } finally {
    await gateway.shutdown();
  }
}

// Run the demo
memoryDemo()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
