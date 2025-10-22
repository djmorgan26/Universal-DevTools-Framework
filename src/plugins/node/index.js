/**
 * Node.js Plugin
 *
 * Provides Node.js development workflow commands:
 * - init: Initialize new Node.js project with package.json
 * - add: Add package to dependencies
 * - remove: Remove package
 * - check: Verify environment setup
 */

const { InitCommand } = require('./commands/init');
const { AddCommand } = require('./commands/add');
const { RemoveCommand } = require('./commands/remove');
const { CheckCommand } = require('./commands/check');

module.exports = {
  name: 'node',
  version: '1.0.0',
  description: 'Node.js development tools',
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

    // Supported Node.js versions
    nodeVersions: ['16', '18', '20', '21'],

    // Available templates
    templates: ['basic', 'express', 'react'],

    // Supported registries
    registries: ['npm', 'artifactory', 'custom']
  }
};
