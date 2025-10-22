const { BaseAgent } = require('./base-agent');

/**
 * Code Analyzer Agent
 *
 * Analyzes code quality and metrics:
 * - Counts lines of code
 * - Identifies file types
 * - Calculates basic complexity metrics
 * - Reports code quality indicators
 *
 * Returns concise metrics without full code listings.
 */
class CodeAnalyzerAgent extends BaseAgent {
  constructor(context) {
    super('code-analyzer', context);

    // MCP tools this agent needs
    this.tools = ['filesystem'];

    // Agent capabilities
    this.skills = [
      'code-metrics',
      'file-analysis',
      'quality-assessment'
    ];
  }

  /**
   * Execute code analysis
   *
   * @param {object} input - Analysis parameters
   * @param {string} input.projectRoot - Project root path
   * @param {array} [input.files] - Specific files to analyze
   * @param {string} [input.projectType] - Project type (python, node, etc.)
   * @returns {Promise<object>} Code metrics and quality assessment
   */
  async execute(input) {
    this.validateInput(input, ['projectRoot']);

    const timer = this.startTimer();
    const projectRoot = input.projectRoot;
    const projectType = input.projectType || 'unknown';
    const files = input.files || [];

    this.log('info', `Analyzing code in: ${projectRoot}`);

    try {
      // If no files provided, discover source files
      const filesToAnalyze = files.length > 0
        ? files
        : await this.discoverSourceFiles(projectRoot, projectType);

      this.log('verbose', `Analyzing ${filesToAnalyze.length} files`);

      // Analyze files
      const metrics = await this.analyzeFiles(filesToAnalyze);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(metrics, projectType);

      // Generate issues/recommendations
      const issues = this.identifyIssues(metrics, projectType);

      const duration = timer.stop();

      return this.formatResult({
        totalFiles: filesToAnalyze.length,
        totalLines: metrics.totalLines,
        codeLines: metrics.codeLines,
        commentLines: metrics.commentLines,
        blankLines: metrics.blankLines,
        byExtension: metrics.byExtension,
        qualityScore,
        issues,
        summary: this.generateSummary(metrics, qualityScore)
      }, {
        duration,
        toolsCalled: ['filesystem:read_file', 'filesystem:list_directory']
      });
    } catch (error) {
      throw this.wrapError(error, 'code analysis');
    }
  }

  /**
   * Discover source files based on project type
   * @param {string} projectRoot - Project root
   * @param {string} projectType - Project type
   * @returns {Promise<array>} List of source file paths
   */
  async discoverSourceFiles(projectRoot, projectType) {
    // Simple discovery: list directory and filter by extension
    try {
      const result = await this.callTool('filesystem', 'list_directory', { path: projectRoot });
      const items = JSON.parse(result.text);

      const sourceExtensions = this.getSourceExtensions(projectType);
      const files = [];

      for (const item of items) {
        if (item.type === 'file') {
          const ext = item.name.split('.').pop();
          if (sourceExtensions.includes(ext)) {
            files.push(item.path);
          }
        }
      }

      return files;
    } catch (error) {
      this.log('warn', `Failed to discover files: ${error.message}`);
      return [];
    }
  }

  /**
   * Get source file extensions for project type
   * @param {string} projectType - Project type
   * @returns {array} File extensions
   */
  getSourceExtensions(projectType) {
    const extensionMap = {
      python: ['py'],
      node: ['js', 'ts', 'jsx', 'tsx'],
      go: ['go'],
      rust: ['rs'],
      java: ['java', 'kt']
    };

    return extensionMap[projectType] || ['js', 'py', 'go', 'rs', 'java'];
  }

  /**
   * Analyze multiple files
   * @param {array} files - File paths
   * @returns {Promise<object>} Aggregated metrics
   */
  async analyzeFiles(files) {
    const metrics = {
      totalLines: 0,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      byExtension: {}
    };

    // Analyze subset if too many files
    const filesToAnalyze = files.length > 50 ? files.slice(0, 50) : files;

    for (const file of filesToAnalyze) {
      try {
        const fileMetrics = await this.analyzeFile(file);

        metrics.totalLines += fileMetrics.totalLines;
        metrics.codeLines += fileMetrics.codeLines;
        metrics.commentLines += fileMetrics.commentLines;
        metrics.blankLines += fileMetrics.blankLines;

        const ext = file.split('.').pop();
        if (!metrics.byExtension[ext]) {
          metrics.byExtension[ext] = {
            files: 0,
            lines: 0
          };
        }
        metrics.byExtension[ext].files++;
        metrics.byExtension[ext].lines += fileMetrics.totalLines;
      } catch (error) {
        this.log('debug', `Failed to analyze ${file}: ${error.message}`);
      }
    }

    return metrics;
  }

  /**
   * Analyze single file
   * @param {string} filePath - File path
   * @returns {Promise<object>} File metrics
   */
  async analyzeFile(filePath) {
    try {
      const result = await this.callTool('filesystem', 'read_file', { path: filePath });
      const content = result.text;
      const lines = content.split('\n');

      let codeLines = 0;
      let commentLines = 0;
      let blankLines = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === '') {
          blankLines++;
        } else if (this.isComment(trimmed)) {
          commentLines++;
        } else {
          codeLines++;
        }
      }

      return {
        totalLines: lines.length,
        codeLines,
        commentLines,
        blankLines
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Check if line is a comment
   * @param {string} line - Trimmed line
   * @returns {boolean} True if comment
   */
  isComment(line) {
    return (
      line.startsWith('//') ||
      line.startsWith('#') ||
      line.startsWith('/*') ||
      line.startsWith('*') ||
      line.startsWith('"""') ||
      line.startsWith("'''")
    );
  }

  /**
   * Calculate quality score (0-100)
   * @param {object} metrics - Code metrics
   * @param {string} projectType - Project type
   * @returns {number} Quality score
   */
  calculateQualityScore(metrics, projectType) {
    let score = 70; // Base score

    // Comment ratio (good: 10-30%)
    const commentRatio = metrics.commentLines / metrics.totalLines;
    if (commentRatio >= 0.1 && commentRatio <= 0.3) {
      score += 10;
    } else if (commentRatio < 0.05) {
      score -= 10;
    }

    // Blank lines (good: 10-20%)
    const blankRatio = metrics.blankLines / metrics.totalLines;
    if (blankRatio >= 0.1 && blankRatio <= 0.2) {
      score += 5;
    }

    // Average lines per file
    const fileCount = Object.values(metrics.byExtension)
      .reduce((sum, ext) => sum + ext.files, 0);
    const avgLinesPerFile = metrics.totalLines / fileCount;

    if (avgLinesPerFile >= 100 && avgLinesPerFile <= 500) {
      score += 10;
    } else if (avgLinesPerFile > 1000) {
      score -= 15; // Very large files
    }

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify code issues
   * @param {object} metrics - Code metrics
   * @param {string} projectType - Project type
   * @returns {array} List of issues
   */
  identifyIssues(metrics, projectType) {
    const issues = [];

    // Check comment ratio
    const commentRatio = metrics.commentLines / metrics.totalLines;
    if (commentRatio < 0.05) {
      issues.push({
        type: 'low-comments',
        severity: 'medium',
        message: 'Very few comments (<5% of code). Consider adding documentation.'
      });
    }

    // Check for empty codebase
    if (metrics.codeLines === 0) {
      issues.push({
        type: 'no-code',
        severity: 'high',
        message: 'No code lines detected'
      });
    }

    // Check average file size
    const fileCount = Object.values(metrics.byExtension)
      .reduce((sum, ext) => sum + ext.files, 0);
    const avgLinesPerFile = metrics.totalLines / fileCount;

    if (avgLinesPerFile > 1000) {
      issues.push({
        type: 'large-files',
        severity: 'medium',
        message: `Average file size is very large (${Math.round(avgLinesPerFile)} lines). Consider refactoring.`
      });
    }

    return issues;
  }

  /**
   * Generate summary text
   * @param {object} metrics - Code metrics
   * @param {number} qualityScore - Quality score
   * @returns {string} Summary
   */
  generateSummary(metrics, qualityScore) {
    const qualityLabel = qualityScore >= 80 ? 'Excellent' :
                         qualityScore >= 60 ? 'Good' :
                         qualityScore >= 40 ? 'Fair' : 'Needs Improvement';

    return `${metrics.totalLines} total lines, ${qualityLabel} quality (score: ${qualityScore})`;
  }
}

module.exports = { CodeAnalyzerAgent };
