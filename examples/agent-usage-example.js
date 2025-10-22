/**
 * Example: Using the Agent Framework
 *
 * This example demonstrates how to use the Orchestrator
 * with specialized agents to analyze a project.
 */

const { Orchestrator } = require('../src/agents/orchestrator');
const { ProjectDiscoveryAgent } = require('../src/agents/project-discovery-agent');
const { CodeAnalyzerAgent } = require('../src/agents/code-analyzer-agent');
const { analyzeProjectWorkflow } = require('../src/agents/workflows');

/**
 * Example function showing agent usage
 */
async function analyzeProject(projectPath, context) {
  // Create orchestrator
  const orchestrator = new Orchestrator(context);

  // Register agents
  orchestrator.registerAgent('discovery', ProjectDiscoveryAgent);
  orchestrator.registerAgent('code-analyzer', CodeAnalyzerAgent);

  // Register workflow
  orchestrator.registerWorkflow('analyze-project', analyzeProjectWorkflow);

  // Initialize orchestrator
  await orchestrator.initialize();

  // Execute workflow
  const task = {
    type: 'analyze-project',
    input: {
      path: projectPath
    }
  };

  const result = await orchestrator.execute(task);

  // Result is concise and structured
  console.log('Analysis Result:', JSON.stringify(result, null, 2));

  return result;
}

/**
 * Example: Using agents directly (without orchestrator)
 */
async function useAgentDirectly(projectPath, context) {
  // Create agent
  const discoveryAgent = new ProjectDiscoveryAgent(context);

  // Initialize
  await discoveryAgent.initialize();

  // Execute
  const result = await discoveryAgent.execute({
    path: projectPath,
    maxDepth: 3
  });

  // Cleanup
  await discoveryAgent.cleanup();

  return result;
}

/**
 * Example: Creating a custom workflow
 */
async function customWorkflow(projectPath, context) {
  const orchestrator = new Orchestrator(context);

  // Register agents
  orchestrator.registerAgent('discovery', ProjectDiscoveryAgent);
  orchestrator.registerAgent('code-analyzer', CodeAnalyzerAgent);

  // Define custom workflow
  const customFlow = {
    name: 'quick-check',
    description: 'Quick project check',
    steps: [
      {
        // Just discovery, no deep analysis
        agent: {
          name: 'discovery',
          input: {
            maxDepth: 2
          }
        }
      }
    ]
  };

  orchestrator.registerWorkflow('quick-check', customFlow);
  await orchestrator.initialize();

  const result = await orchestrator.execute({
    type: 'quick-check',
    input: { path: projectPath }
  });

  return result;
}

/**
 * Example: Result synthesis
 */
async function withResultSynthesis(projectPath, context) {
  const orchestrator = new Orchestrator(context);

  orchestrator.registerAgent('discovery', ProjectDiscoveryAgent);
  orchestrator.registerAgent('code-analyzer', CodeAnalyzerAgent);
  orchestrator.registerWorkflow('analyze-project', analyzeProjectWorkflow);

  await orchestrator.initialize();

  // Execute with custom synthesis
  const result = await orchestrator.execute({
    type: 'analyze-project',
    input: { path: projectPath },
    synthesis: {
      type: 'select',
      fields: {
        projectType: '$discovery.projectType',
        framework: '$discovery.framework',
        qualityScore: '$code-analyzer.qualityScore',
        totalLines: '$code-analyzer.totalLines'
      }
    }
  });

  // Result contains only selected fields
  console.log('Synthesized Result:', result.data);

  return result;
}

module.exports = {
  analyzeProject,
  useAgentDirectly,
  customWorkflow,
  withResultSynthesis
};

/**
 * Example usage in a plugin command:
 *
 * class AnalyzeCommand {
 *   constructor() {
 *     this.description = 'Analyze project structure and code';
 *   }
 *
 *   async execute(context) {
 *     const { analyzeProject } = require('./examples/agent-usage-example');
 *     const result = await analyzeProject('.', context);
 *
 *     // Display concise results
 *     context.logger.success(`Project Type: ${result.data.discovery.projectType}`);
 *     context.logger.info(`Quality Score: ${result.data['code-analyzer'].qualityScore}`);
 *     context.logger.info(`Total Lines: ${result.data['code-analyzer'].totalLines}`);
 *   }
 * }
 */
