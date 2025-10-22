/**
 * Analyze Plugin
 *
 * Demonstrates the MCP + Multi-Agent orchestration system by providing
 * intelligent project analysis capabilities.
 */

const AnalyzeCommand = require('./commands/analyze');

module.exports = {
  name: 'analyze',
  version: '1.0.0',
  description: 'Intelligent project analysis using MCP and multi-agent orchestration',
  author: 'Universal DevTools Framework',

  // Available commands
  commands: {
    analyze: new AnalyzeCommand()
  },

  // Plugin metadata
  metadata: {
    // MCP servers this plugin uses
    requiredMCPs: ['filesystem'],

    // Agents this plugin uses
    requiredAgents: ['discovery', 'code-analyzer'],

    // Features
    features: [
      'Project type detection',
      'Framework identification',
      'Code metrics analysis',
      'Quality score calculation',
      'Issue identification',
      'Beautiful formatted reports'
    ]
  }
};
