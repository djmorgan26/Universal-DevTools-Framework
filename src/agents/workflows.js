/**
 * Workflow Definitions
 *
 * Declarative workflows for common multi-agent tasks.
 * Each workflow defines steps, agent execution order, and data flow.
 */

/**
 * Analyze Project Workflow
 * Discovers project structure and analyzes code quality
 */
const analyzeProjectWorkflow = {
  name: 'analyze-project',
  description: 'Discover project structure and analyze code quality',
  steps: [
    {
      // Step 1: Discover project structure
      agent: {
        name: 'discovery',
        input: {
          maxDepth: 3,
          includeHidden: false
        }
      }
    },
    {
      // Step 2: Analyze code (depends on discovery results)
      agent: {
        name: 'code-analyzer',
        inputMapping: {
          projectRoot: '$discovery.projectRoot',
          projectType: '$discovery.projectType'
        }
      }
    }
  ]
};

/**
 * Quick Scan Workflow
 * Fast project overview without deep analysis
 */
const quickScanWorkflow = {
  name: 'quick-scan',
  description: 'Quick project overview',
  steps: [
    {
      agent: {
        name: 'discovery',
        input: {
          maxDepth: 2,
          includeHidden: false
        }
      }
    }
  ]
};

/**
 * Deep Analysis Workflow
 * Comprehensive project analysis with parallel execution
 */
const deepAnalysisWorkflow = {
  name: 'deep-analysis',
  description: 'Comprehensive project analysis',
  steps: [
    {
      // Step 1: Discover project
      agent: {
        name: 'discovery',
        input: {
          maxDepth: 4,
          includeHidden: false
        }
      }
    },
    {
      // Step 2: Run multiple analyzers in parallel
      parallel: true,
      agents: [
        {
          name: 'code-analyzer',
          inputMapping: {
            projectRoot: '$discovery.projectRoot',
            projectType: '$discovery.projectType'
          }
        }
        // Additional agents can be added here
        // e.g., dependency-resolver, test-runner, etc.
      ]
    }
  ]
};

/**
 * Custom workflow builder
 * Helper to create custom workflows programmatically
 */
function createCustomWorkflow(name, description, steps) {
  return {
    name,
    description,
    steps
  };
}

/**
 * Example: Create a simple sequential workflow
 */
function createSequentialWorkflow(name, description, agentConfigs) {
  return {
    name,
    description,
    steps: agentConfigs.map(config => ({
      agent: config
    }))
  };
}

/**
 * Example: Create a parallel workflow
 */
function createParallelWorkflow(name, description, agentConfigs) {
  return {
    name,
    description,
    steps: [
      {
        parallel: true,
        agents: agentConfigs
      }
    ]
  };
}

module.exports = {
  // Pre-defined workflows
  analyzeProjectWorkflow,
  quickScanWorkflow,
  deepAnalysisWorkflow,

  // Workflow builders
  createCustomWorkflow,
  createSequentialWorkflow,
  createParallelWorkflow
};
