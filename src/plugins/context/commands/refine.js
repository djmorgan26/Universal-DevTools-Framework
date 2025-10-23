const { MCPGateway } = require('../../../core/mcp-gateway');
const { ContextManager } = require('../../../core/context-manager');

/**
 * Refine Context Command
 * Add observations, update, or refactor context items
 * Makes it easy to iterate and improve your knowledge graph
 *
 * Usage:
 *   devtools context refine "item name" --add "additional observation"
 *   devtools context refine "old name" --rename "new name"
 *   devtools context refine "item name" --relate-to "other item" --relation "uses"
 */
class RefineCommand {
  constructor() {
    this.description = 'Refine and update existing context items';
  }

  async execute(context, name, options = {}) {
    const config = context.config;
    const logger = context.logger;

    const {
      add = null,
      rename = null,
      relateTo = null,
      relation = 'relates-to',
      changeType = null
    } = options;

    if (!name) {
      throw new Error('Specify item name. Usage: devtools context refine "item name" --add "observation"');
    }

    if (!add && !rename && !relateTo && !changeType) {
      throw new Error(
        'Specify what to refine:\n' +
        '  --add "observation"           Add new observation\n' +
        '  --rename "new name"           Rename the item\n' +
        '  --relate-to "item" --relation "uses"  Create relationship\n' +
        '  --change-type "new-type"      Change item type'
      );
    }

    this.logger.info(`🔧 Refining context: "${name}"\n`);

    try {
      const mcpGateway = new MCPGateway(this.config, this.logger);
      await mcpGateway.initialize(['memory']);

      const contextManager = new ContextManager(mcpGateway, this.logger);
      await contextManager.initialize();

      // Verify item exists
      const nodes = await contextManager.getNodes([name]);
      if (!nodes || nodes.length === 0) {
        throw new Error(`Context item not found: ${name}`);
      }

      const node = nodes[0];
      const changes = [];

      // Add observation
      if (add) {
        await contextManager.addObservations(name, [add]);
        changes.push(`Added observation: "${add}"`);
        this.logger.success(`✅ Added observation`);
      }

      // Create relationship
      if (relateTo) {
        await contextManager.relate(name, relateTo, relation);
        changes.push(`Created relationship: ${name} --[${relation}]--> ${relateTo}`);
        this.logger.success(`✅ Created relationship`);
      }

      // Rename (requires recreating the entity)
      if (rename) {
        // Get current data
        const currentObservations = node.observations || [];

        // Create new entity with new name
        await contextManager.add({
          type: node.entityType,
          name: rename,
          description: currentObservations[0] || 'Renamed from ' + name,
          tags: [],
          metadata: { renamedFrom: name }
        });

        // Add remaining observations
        if (currentObservations.length > 1) {
          await contextManager.addObservations(rename, currentObservations.slice(1));
        }

        // Copy relationships (if any)
        if (node.relations && node.relations.length > 0) {
          for (const rel of node.relations) {
            if (rel.from === name) {
              await contextManager.relate(rename, rel.to, rel.relationType);
            } else if (rel.to === name) {
              await contextManager.relate(rel.from, rename, rel.relationType);
            }
          }
        }

        // Remove old entity
        await contextManager.remove(name);

        changes.push(`Renamed from "${name}" to "${rename}"`);
        this.logger.success(`✅ Renamed to: ${rename}`);
      }

      // Change type (requires recreating)
      if (changeType) {
        const currentObservations = node.observations || [];

        // Create new entity with new type
        await contextManager.add({
          type: changeType,
          name: name,
          description: currentObservations[0] || name,
          tags: [],
          metadata: { previousType: node.entityType }
        });

        // Add remaining observations
        if (currentObservations.length > 1) {
          await contextManager.addObservations(name, currentObservations.slice(1));
        }

        // Note: Relations are preserved by name, so they should still work

        changes.push(`Changed type from "${node.entityType}" to "${changeType}"`);
        this.logger.success(`✅ Changed type to: ${changeType}`);
      }

      this.logger.info('\n📋 Changes made:');
      for (const change of changes) {
        this.logger.info(`  • ${change}`);
      }

      this.logger.info('\n💡 View updated item: devtools context get "' + (rename || name) + '"');

      await mcpGateway.shutdown();

      return { name: rename || name, changes };
    } catch (error) {
      this.logger.error(`Failed to refine context: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RefineCommand;
