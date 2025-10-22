/**
 * Simple test of the analyze workflow
 * Tests MCP + Agent orchestration in isolation
 */

const { Logger } = require('../src/core/logger');
const { ConfigManager } = require('../src/core/config-manager');
const { MCPGateway } = require('../src/core/mcp-gateway');
const { Orchestrator } = require('../src/agents/orchestrator');
const { ProjectDiscoveryAgent } = require('../src/agents/project-discovery-agent');
const { CodeAnalyzerAgent } = require('../src/agents/code-analyzer-agent');
const { analyzeProjectWorkflow } = require('../src/agents/workflows');

async function test() {
  console.log('Starting simple analyze test...\n');

  // Create context
  const logger = new Logger();
  const config = new ConfigManager();
  await config.load();

  console.log('1. Creating MCP Gateway...');
  const mcpGateway = new MCPGateway(config, logger);

  const context = {
    logger,
    config,
    mcpGateway,
    options: {}
  };

  console.log('2. Creating Orchestrator...');
  const orchestrator = new Orchestrator(context);

  console.log('3. Registering agents...');
  orchestrator.registerAgent('discovery', ProjectDiscoveryAgent);
  orchestrator.registerAgent('code-analyzer', CodeAnalyzerAgent);

  console.log('4. Registering workflow...');
  orchestrator.registerWorkflow('analyze-project', analyzeProjectWorkflow);

  console.log('5. Initializing orchestrator...');
  await orchestrator.initialize();

  console.log('6. Executing workflow...');
  const result = await orchestrator.execute({
    type: 'analyze-project',
    input: { path: './src' },
    synthesis: {
      type: 'select',
      fields: {
        projectType: '$discovery.projectType',
        framework: '$discovery.framework',
        totalFiles: '$code-analyzer.totalFiles',
        qualityScore: '$code-analyzer.qualityScore'
      }
    }
  });

  console.log('\n7. Results:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n8. Cleaning up...');
  await orchestrator.cleanup();
  await mcpGateway.shutdown();

  console.log('\n✅ Test complete!');
  process.exit(0);
}

test().catch(error => {
  console.error('\n❌ Test failed:', error);
  console.error(error.stack);
  process.exit(1);
});
