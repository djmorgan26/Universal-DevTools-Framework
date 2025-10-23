/**
 * Context Manager
 * High-level API for managing project context and knowledge graph
 * Wraps Memory MCP server with user-friendly operations
 */

class ContextManager {
  constructor(mcpGateway, logger) {
    this.mcpGateway = mcpGateway;
    this.logger = logger;
    this.serverName = 'memory';
  }

  /**
   * Initialize context manager and ensure Memory MCP is available
   */
  async initialize() {
    try {
      // Check if memory server is enabled in connections
      // The MCPGateway.initialize() should already have been called
      const servers = this.mcpGateway.listAvailableServers();

      if (servers.length > 0 && !servers.includes(this.serverName)) {
        throw new Error(
          'Memory MCP server is not available. ' +
          'Enable it in config: devtools config set mcp.servers.memory.enabled true'
        );
      }

      // If no servers initialized yet, memory will be auto-initialized on first use
      this.logger.debug('Context Manager initialized with Memory MCP server');
    } catch (error) {
      this.logger.error('Failed to initialize Context Manager:', error.message);
      throw error;
    }
  }

  /**
   * Add a context item (preference, decision, standard)
   * @param {Object} item - Context item
   * @param {string} item.type - Type: preference, decision, standard, pattern, architecture
   * @param {string} item.name - Name/title
   * @param {string} item.description - Detailed description
   * @param {Array<string>} item.tags - Tags for categorization
   * @param {Object} item.metadata - Additional metadata
   * @returns {Promise<Object>} Created entity
   */
  async add({ type, name, description, tags = [], metadata = {} }) {
    const observations = [description];

    // Add tags as observations
    if (tags.length > 0) {
      observations.push(`Tags: ${tags.join(', ')}`);
    }

    // Add metadata as observations
    if (Object.keys(metadata).length > 0) {
      observations.push(`Metadata: ${JSON.stringify(metadata)}`);
    }

    const result = await this.mcpGateway.callTool(this.serverName, 'create_entities', {
      entities: [
        {
          name,
          entityType: type,
          observations
        }
      ]
    });

    this.logger.debug(`Added context: ${name} (${type})`);
    return { name, type, description, tags, metadata };
  }

  /**
   * Add multiple context items at once
   */
  async addBatch(items) {
    const entities = items.map(item => ({
      name: item.name,
      entityType: item.type,
      observations: [
        item.description,
        item.tags?.length > 0 ? `Tags: ${item.tags.join(', ')}` : null,
        item.metadata ? `Metadata: ${JSON.stringify(item.metadata)}` : null
      ].filter(Boolean)
    }));

    await this.mcpGateway.callTool(this.serverName, 'create_entities', {
      entities
    });

    this.logger.debug(`Added ${items.length} context items`);
    return items;
  }

  /**
   * Create a relationship between context items
   * @param {string} from - Source entity name
   * @param {string} to - Target entity name
   * @param {string} relationType - Relationship type (uses, requires, implements, etc.)
   */
  async relate(from, to, relationType) {
    await this.mcpGateway.callTool(this.serverName, 'create_relations', {
      relations: [
        {
          from,
          to,
          relationType
        }
      ]
    });

    this.logger.debug(`Created relation: ${from} --[${relationType}]--> ${to}`);
    return { from, to, relationType };
  }

  /**
   * Search for context items
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching nodes
   */
  async search(query) {
    const result = await this.mcpGateway.callTool(this.serverName, 'search_nodes', {
      query
    });

    // Parse the result
    const nodes = this.parseMemoryResponse(result);
    this.logger.debug(`Found ${nodes.length} matching context items`);
    return nodes;
  }

  /**
   * Get the entire knowledge graph
   * @returns {Promise<Object>} Complete graph structure
   */
  async getGraph() {
    const result = await this.mcpGateway.callTool(this.serverName, 'read_graph', {});
    const graph = this.parseMemoryResponse(result);
    return graph;
  }

  /**
   * Get specific nodes by name
   * @param {Array<string>} names - Node names to retrieve
   * @returns {Promise<Array>} Nodes with their relations
   */
  async getNodes(names) {
    const result = await this.mcpGateway.callTool(this.serverName, 'open_nodes', {
      names
    });

    const nodes = this.parseMemoryResponse(result);
    return nodes;
  }

  /**
   * Remove a context item
   * @param {string} name - Name of entity to remove
   */
  async remove(name) {
    await this.mcpGateway.callTool(this.serverName, 'delete_entities', {
      names: [name]
    });

    this.logger.debug(`Removed context: ${name}`);
    return { name, deleted: true };
  }

  /**
   * Remove multiple context items
   */
  async removeBatch(names) {
    await this.mcpGateway.callTool(this.serverName, 'delete_entities', {
      names
    });

    this.logger.debug(`Removed ${names.length} context items`);
    return { names, deleted: true };
  }

  /**
   * Add observations to an existing entity
   * @param {string} name - Entity name
   * @param {Array<string>} observations - New observations to add
   */
  async addObservations(name, observations) {
    await this.mcpGateway.callTool(this.serverName, 'add_observations', {
      observations: observations.map(content => ({
        entityName: name,
        contents: [content]
      }))
    });

    this.logger.debug(`Added ${observations.length} observations to: ${name}`);
    return { name, observations };
  }

  /**
   * Get context by type (preferences, decisions, standards, etc.)
   * @param {string} type - Entity type
   * @returns {Promise<Array>} Entities of that type
   */
  async getByType(type) {
    const graph = await this.getGraph();

    if (!graph || !graph.entities) {
      return [];
    }

    return graph.entities.filter(entity => entity.entityType === type);
  }

  /**
   * Get all context organized by type
   * @returns {Promise<Object>} Context organized by type
   */
  async getAll() {
    const graph = await this.getGraph();

    if (!graph || !graph.entities) {
      return {
        preferences: [],
        decisions: [],
        standards: [],
        patterns: [],
        architecture: [],
        other: []
      };
    }

    const organized = {
      preferences: [],
      decisions: [],
      standards: [],
      patterns: [],
      architecture: [],
      other: []
    };

    for (const entity of graph.entities) {
      const type = entity.entityType;
      if (organized[type]) {
        organized[type].push(entity);
      } else {
        organized.other.push(entity);
      }
    }

    return organized;
  }

  /**
   * Export entire context as JSON
   * @returns {Promise<Object>} Complete context export
   */
  async export() {
    const graph = await this.getGraph();

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      graph
    };
  }

  /**
   * Import context from JSON
   * @param {Object} data - Exported context data
   * @param {boolean} merge - If true, merge with existing; if false, replace
   */
  async import(data, merge = true) {
    if (!merge) {
      // Clear existing context first
      const graph = await this.getGraph();
      if (graph && graph.entities) {
        const names = graph.entities.map(e => e.name);
        if (names.length > 0) {
          await this.removeBatch(names);
        }
      }
    }

    const { graph } = data;

    if (!graph || !graph.entities) {
      throw new Error('Invalid import data: missing graph.entities');
    }

    // Import entities
    if (graph.entities.length > 0) {
      await this.mcpGateway.callTool(this.serverName, 'create_entities', {
        entities: graph.entities
      });
    }

    // Import relations
    if (graph.relations && graph.relations.length > 0) {
      await this.mcpGateway.callTool(this.serverName, 'create_relations', {
        relations: graph.relations
      });
    }

    this.logger.info(`Imported ${graph.entities.length} entities and ${graph.relations?.length || 0} relations`);
    return { imported: graph.entities.length, relations: graph.relations?.length || 0 };
  }

  /**
   * Parse Memory MCP server response
   * Handles the nested structure returned by the server
   */
  parseMemoryResponse(result) {
    if (!result) {
      return null;
    }

    // Memory server returns: { content: [{ text: "JSON string" }] }
    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content[0]?.text;
      if (textContent) {
        try {
          return JSON.parse(textContent);
        } catch (error) {
          this.logger.error('Failed to parse Memory MCP response:', error.message);
          return null;
        }
      }
    }

    return result;
  }

  /**
   * Generate a summary of current context for AI injection
   * @returns {Promise<string>} Formatted context summary
   */
  async generateContextSummary() {
    const organized = await this.getAll();

    let summary = '# Project Context\n\n';

    if (organized.preferences.length > 0) {
      summary += '## Preferences\n';
      for (const pref of organized.preferences) {
        summary += `- **${pref.name}**: ${pref.observations.join('. ')}\n`;
      }
      summary += '\n';
    }

    if (organized.standards.length > 0) {
      summary += '## Coding Standards\n';
      for (const std of organized.standards) {
        summary += `- **${std.name}**: ${std.observations.join('. ')}\n`;
      }
      summary += '\n';
    }

    if (organized.architecture.length > 0) {
      summary += '## Architecture\n';
      for (const arch of organized.architecture) {
        summary += `- **${arch.name}**: ${arch.observations.join('. ')}\n`;
      }
      summary += '\n';
    }

    if (organized.decisions.length > 0) {
      summary += '## Key Decisions\n';
      for (const dec of organized.decisions) {
        summary += `- **${dec.name}**: ${dec.observations.join('. ')}\n`;
      }
      summary += '\n';
    }

    if (organized.patterns.length > 0) {
      summary += '## Common Patterns\n';
      for (const pattern of organized.patterns) {
        summary += `- **${pattern.name}**: ${pattern.observations.join('. ')}\n`;
      }
      summary += '\n';
    }

    return summary;
  }
}

module.exports = { ContextManager };
