/**
 * Python Plugin
 *
 * Provides Python development workflow commands:
 * - init: Initialize new Python project with venv
 * - add: Add package to requirements
 * - remove: Remove package
 * - check: Verify environment setup
 */

const { InitCommand } = require('./commands/init');
const { AddCommand } = require('./commands/add');
const { RemoveCommand } = require('./commands/remove');
const { CheckCommand } = require('./commands/check');

module.exports = {
  name: 'python',
  version: '1.0.0',
  description: 'Python development tools',
  author: 'DevTools Framework',

  // Available commands
  commands: {
    init: new InitCommand(),
    add: new AddCommand(),
    remove: new RemoveCommand(),
    check: new CheckCommand()
  },

  // Plugin metadata
  metadata: {
    // MCP servers this plugin uses
    requiredMCPs: ['filesystem', 'git'],

    // Supported Python versions
    pythonVersions: ['3.8', '3.9', '3.10', '3.11', '3.12', '3.13'],

    // Available templates
    templates: ['basic', 'fastapi'],

    // Supported registries
    registries: ['pypi', 'artifactory', 'custom']
  }
};
