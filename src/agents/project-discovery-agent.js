const { BaseAgent } = require('./base-agent');
const path = require('path');

/**
 * Project Discovery Agent
 *
 * Discovers and analyzes project structure:
 * - Identifies project type (Python, Node.js, etc.)
 * - Detects framework (FastAPI, Express, React, etc.)
 * - Locates configuration files
 * - Maps source and test directories
 * - Finds package/dependency files
 *
 * Returns concise project metadata without verbose file listings.
 */
class ProjectDiscoveryAgent extends BaseAgent {
  constructor(context) {
    super('discovery', context);

    // MCP tools this agent needs
    this.tools = ['filesystem'];

    // Agent capabilities
    this.skills = [
      'project-type-detection',
      'framework-identification',
      'config-file-discovery',
      'directory-mapping'
    ];
  }

  /**
   * Execute project discovery
   *
   * @param {object} input - Discovery parameters
   * @param {string} input.path - Project root path
   * @param {number} [input.maxDepth=3] - Maximum directory depth to scan
   * @param {boolean} [input.includeHidden=false] - Include hidden files/dirs
   * @returns {Promise<object>} Project metadata
   */
  async execute(input) {
    this.validateInput(input, ['path']);

    const timer = this.startTimer();
    const projectPath = path.resolve(input.path);
    const maxDepth = input.maxDepth || 3;
    const includeHidden = input.includeHidden || false;

    this.log('info', `Discovering project at: ${projectPath}`);

    try {
      // Check if path exists
      const exists = await this.checkPathExists(projectPath);
      if (!exists) {
        throw new Error(`Path does not exist: ${projectPath}`);
      }

      // Scan project structure
      const structure = await this.scanDirectory(projectPath, 0, maxDepth, includeHidden);

      // Detect project type
      const projectType = this.detectProjectType(structure);

      // Detect framework
      const framework = this.detectFramework(projectType, structure);

      // Find key files
      const keyFiles = this.findKeyFiles(structure);

      // Map directories
      const directories = this.mapDirectories(structure);

      // Count files
      const fileCounts = this.countFilesByType(structure);

      const duration = timer.stop();

      return this.formatResult({
        projectRoot: projectPath,
        projectType,
        framework,
        keyFiles,
        directories,
        fileCounts,
        summary: this.generateSummary(projectType, framework, fileCounts)
      }, {
        duration,
        toolsCalled: ['filesystem:list_directory', 'filesystem:file_exists']
      });
    } catch (error) {
      throw this.wrapError(error, 'project discovery');
    }
  }

  /**
   * Check if path exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} True if exists
   */
  async checkPathExists(filePath) {
    try {
      const result = await this.callTool('filesystem', 'file_exists', { path: filePath });
      return result.text === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Scan directory recursively
   * @param {string} dirPath - Directory to scan
   * @param {number} depth - Current depth
   * @param {number} maxDepth - Maximum depth
   * @param {boolean} includeHidden - Include hidden files
   * @returns {Promise<object>} Directory structure
   */
  async scanDirectory(dirPath, depth, maxDepth, includeHidden) {
    if (depth >= maxDepth) {
      return { files: [], directories: [] };
    }

    try {
      const result = await this.callTool('filesystem', 'list_directory', { path: dirPath });
      const items = JSON.parse(result.text);

      const structure = {
        path: dirPath,
        files: [],
        directories: [],
        subdirs: []
      };

      for (const item of items) {
        // Skip hidden files/dirs if not requested
        if (!includeHidden && item.name.startsWith('.')) {
          continue;
        }

        // Skip common ignore patterns
        if (this.shouldIgnore(item.name)) {
          continue;
        }

        if (item.type === 'file') {
          structure.files.push({
            name: item.name,
            path: item.path,
            ext: path.extname(item.name)
          });
        } else if (item.type === 'directory') {
          structure.directories.push({
            name: item.name,
            path: item.path
          });

          // Recursively scan subdirectories
          if (depth + 1 < maxDepth) {
            const subStructure = await this.scanDirectory(item.path, depth + 1, maxDepth, includeHidden);
            structure.subdirs.push(subStructure);
          }
        }
      }

      return structure;
    } catch (error) {
      this.log('warn', `Failed to scan directory ${dirPath}: ${error.message}`);
      return { files: [], directories: [], subdirs: [] };
    }
  }

  /**
   * Check if file/directory should be ignored
   * @param {string} name - File/directory name
   * @returns {boolean} True if should ignore
   */
  shouldIgnore(name) {
    const ignorePatterns = [
      'node_modules',
      '__pycache__',
      '.venv',
      'venv',
      '.git',
      '.idea',
      '.vscode',
      'dist',
      'build',
      'coverage',
      '.pytest_cache',
      '.tox',
      'htmlcov'
    ];

    return ignorePatterns.includes(name);
  }

  /**
   * Detect project type based on files present
   * @param {object} structure - Project structure
   * @returns {string|null} Project type
   */
  detectProjectType(structure) {
    const allFiles = this.getAllFiles(structure);
    const fileNames = allFiles.map(f => f.name);

    // Python project
    if (fileNames.includes('requirements.txt') ||
        fileNames.includes('setup.py') ||
        fileNames.includes('pyproject.toml') ||
        allFiles.some(f => f.ext === '.py')) {
      return 'python';
    }

    // Node.js project
    if (fileNames.includes('package.json')) {
      return 'node';
    }

    // Go project
    if (fileNames.includes('go.mod') || allFiles.some(f => f.ext === '.go')) {
      return 'go';
    }

    // Rust project
    if (fileNames.includes('Cargo.toml')) {
      return 'rust';
    }

    // Java/Kotlin project
    if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) {
      return 'java';
    }

    return 'unknown';
  }

  /**
   * Detect framework based on project type and files
   * @param {string} projectType - Project type
   * @param {object} structure - Project structure
   * @returns {string|null} Framework name
   */
  detectFramework(projectType, structure) {
    const allFiles = this.getAllFiles(structure);
    const fileNames = allFiles.map(f => f.name);

    if (projectType === 'python') {
      if (fileNames.some(f => f.includes('fastapi'))) return 'fastapi';
      if (fileNames.some(f => f.includes('django'))) return 'django';
      if (fileNames.some(f => f.includes('flask'))) return 'flask';
    }

    if (projectType === 'node') {
      if (fileNames.includes('next.config.js')) return 'nextjs';
      if (fileNames.some(f => f.includes('react'))) return 'react';
      if (fileNames.some(f => f.includes('express'))) return 'express';
      if (fileNames.some(f => f.includes('vue'))) return 'vue';
    }

    return null;
  }

  /**
   * Find key configuration and package files
   * @param {object} structure - Project structure
   * @returns {object} Key files by category
   */
  findKeyFiles(structure) {
    const allFiles = this.getAllFiles(structure);
    const keyFiles = {
      package: [],
      config: [],
      test: [],
      documentation: []
    };

    const packageFiles = [
      'package.json', 'requirements.txt', 'setup.py', 'pyproject.toml',
      'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle'
    ];

    const configFiles = [
      '.env', 'config.json', 'config.yaml', 'tsconfig.json',
      'jest.config.js', 'pytest.ini', '.eslintrc', '.prettierrc'
    ];

    const docFiles = ['README.md', 'CHANGELOG.md', 'LICENSE', 'CONTRIBUTING.md'];

    for (const file of allFiles) {
      if (packageFiles.includes(file.name)) {
        keyFiles.package.push(file.path);
      } else if (configFiles.some(cf => file.name.includes(cf))) {
        keyFiles.config.push(file.path);
      } else if (file.name.toLowerCase().includes('test') || file.name.startsWith('test_')) {
        keyFiles.test.push(file.path);
      } else if (docFiles.includes(file.name)) {
        keyFiles.documentation.push(file.path);
      }
    }

    return keyFiles;
  }

  /**
   * Map directory structure
   * @param {object} structure - Project structure
   * @returns {object} Directory map
   */
  mapDirectories(structure) {
    const allDirs = this.getAllDirectories(structure);

    return {
      src: allDirs.filter(d => d.name === 'src' || d.name === 'lib').map(d => d.path),
      tests: allDirs.filter(d => d.name === 'tests' || d.name === 'test' || d.name === '__tests__').map(d => d.path),
      docs: allDirs.filter(d => d.name === 'docs' || d.name === 'documentation').map(d => d.path),
      bin: allDirs.filter(d => d.name === 'bin' || d.name === 'scripts').map(d => d.path)
    };
  }

  /**
   * Count files by extension
   * @param {object} structure - Project structure
   * @returns {object} File counts
   */
  countFilesByType(structure) {
    const allFiles = this.getAllFiles(structure);
    const counts = {};

    for (const file of allFiles) {
      const ext = file.ext || 'no-extension';
      counts[ext] = (counts[ext] || 0) + 1;
    }

    return counts;
  }

  /**
   * Generate project summary
   * @param {string} projectType - Project type
   * @param {string} framework - Framework
   * @param {object} fileCounts - File counts
   * @returns {string} Summary text
   */
  generateSummary(projectType, framework, fileCounts) {
    const totalFiles = Object.values(fileCounts).reduce((a, b) => a + b, 0);
    const frameworkText = framework ? ` (${framework})` : '';

    return `${projectType}${frameworkText} project with ${totalFiles} files`;
  }

  /**
   * Get all files from structure recursively
   * @param {object} structure - Directory structure
   * @returns {array} All files
   */
  getAllFiles(structure) {
    let files = [...(structure.files || [])];

    if (structure.subdirs) {
      for (const subdir of structure.subdirs) {
        files = files.concat(this.getAllFiles(subdir));
      }
    }

    return files;
  }

  /**
   * Get all directories from structure recursively
   * @param {object} structure - Directory structure
   * @returns {array} All directories
   */
  getAllDirectories(structure) {
    let dirs = [...(structure.directories || [])];

    if (structure.subdirs) {
      for (const subdir of structure.subdirs) {
        dirs = dirs.concat(this.getAllDirectories(subdir));
      }
    }

    return dirs;
  }
}

module.exports = { ProjectDiscoveryAgent };
