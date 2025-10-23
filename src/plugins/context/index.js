/**
 * Context Plugin
 * Manage project context and preferences for AI coding assistants
 *
 * Provides persistent memory and knowledge graph that Claude Code,
 * Copilot, Cursor, and other AI assistants can query for better context.
 */

const AddCommand = require('./commands/add');
const ListCommand = require('./commands/list');
const GetCommand = require('./commands/get');
const RemoveCommand = require('./commands/remove');
const QueryCommand = require('./commands/query');
const InitCommand = require('./commands/init');
const ExportCommand = require('./commands/export');
const ImportCommand = require('./commands/import');
const ShowCommand = require('./commands/show');
const RefineCommand = require('./commands/refine');

module.exports = {
  name: 'context',
  version: '1.0.0',
  description: 'Project context management for AI assistants',
  author: 'DevTools Framework',

  // Available commands
  commands: {
    add: new AddCommand(),
    list: new ListCommand(),
    get: new GetCommand(),
    remove: new RemoveCommand(),
    query: new QueryCommand(),
    init: new InitCommand(),
    export: new ExportCommand(),
    import: new ImportCommand(),
    show: new ShowCommand(),
    refine: new RefineCommand()
  },

  // Plugin metadata
  metadata: {
    // MCP servers this plugin uses
    requiredMCPs: ['memory'],

    // Context types supported
    contextTypes: ['preference', 'decision', 'standard', 'pattern', 'architecture'],

    // Features
    features: [
      'Persistent context storage',
      'AI-ready summaries',
      'Export/import',
      'Search and query',
      'Relationship management'
    ]
  }
};
