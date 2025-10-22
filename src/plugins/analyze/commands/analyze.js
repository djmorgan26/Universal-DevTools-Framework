/**
 * Analyze Command
 *
 * Demonstrates MCP + Multi-Agent orchestration by analyzing a project
 * using the Discovery and Code Analyzer agents.
 */

const { Orchestrator } = require('../../../agents/orchestrator');
const { ProjectDiscoveryAgent } = require('../../../agents/project-discovery-agent');
const { CodeAnalyzerAgent } = require('../../../agents/code-analyzer-agent');
const { analyzeProjectWorkflow, deepAnalysisWorkflow } = require('../../../agents/workflows');

class AnalyzeCommand {
  constructor() {
    this.description = 'Analyze project structure and code quality';
    this.options = [
      {
        flags: '--path <path>',
        description: 'Project path to analyze (default: current directory)',
        defaultValue: '.'
      },
      {
        flags: '--deep',
        description: 'Run deep analysis with parallel execution'
      },
      {
        flags: '--format <format>',
        description: 'Output format: pretty (default) or json',
        defaultValue: 'pretty'
      }
    ];
  }

  /**
   * Execute the analyze command
   */
  async execute(context, options) {
    const logger = context.logger;
    const config = context.config;

    const projectPath = options.path || process.cwd();
    const deep = options.deep || false;
    const format = options.format || 'pretty';

    logger.info('🔍 Analyzing project...\n');

    try {
      // Create and setup orchestrator
      const orchestrator = new Orchestrator(context);

      // Register agents
      orchestrator.registerAgent('discovery', ProjectDiscoveryAgent);
      orchestrator.registerAgent('code-analyzer', CodeAnalyzerAgent);

      // Register workflows
      orchestrator.registerWorkflow('analyze-project', analyzeProjectWorkflow);
      orchestrator.registerWorkflow('deep-analysis', deepAnalysisWorkflow);

      // Initialize
      logger.verbose('Initializing MCP servers and agents...');
      await orchestrator.initialize();

      // Execute workflow
      const workflowType = deep ? 'deep-analysis' : 'analyze-project';
      logger.verbose(`Running ${workflowType} workflow...`);

      const result = await orchestrator.execute({
        type: workflowType,
        input: { path: projectPath },
        synthesis: {
          type: 'select',
          fields: {
            // From discovery
            projectRoot: '$discovery.projectRoot',
            projectType: '$discovery.projectType',
            framework: '$discovery.framework',
            fileCount: '$discovery.fileCounts',
            directories: '$discovery.directories',

            // From code analyzer
            totalFiles: '$code-analyzer.totalFiles',
            totalLines: '$code-analyzer.totalLines',
            codeLines: '$code-analyzer.codeLines',
            commentLines: '$code-analyzer.commentLines',
            qualityScore: '$code-analyzer.qualityScore',
            issues: '$code-analyzer.issues'
          }
        }
      });

      // Cleanup
      await orchestrator.cleanup();

      // Format and display results
      if (format === 'json') {
        this.displayJson(result);
      } else {
        this.displayPretty(result, logger, config);
      }

      // Return exit code based on quality score
      const qualityScore = result.data.qualityScore || 0;
      if (qualityScore < 50) {
        logger.warn('\n⚠️  Quality score is below 50. Consider improvements.');
        return 1;
      }

      return 0;

    } catch (error) {
      logger.error(`Analysis failed: ${error.message}`);
      if (config.get('debug')) {
        logger.error(error.stack);
      }
      return 1;
    }
  }

  /**
   * Display results in JSON format
   */
  displayJson(result) {
    console.log(JSON.stringify(result, null, 2));
  }

  /**
   * Display results in pretty formatted output
   */
  displayPretty(result, logger, config) {
    const data = result.data;

    // Header
    logger.success('━'.repeat(60));
    logger.success('  📊 PROJECT ANALYSIS REPORT');
    logger.success('━'.repeat(60));
    console.log();

    // Project Info
    logger.info('📁 Project Information:');
    logger.info(`   Root: ${data.projectRoot}`);
    logger.info(`   Type: ${data.projectType || 'Unknown'}`);
    if (data.framework) {
      logger.info(`   Framework: ${data.framework}`);
    }
    console.log();

    // File Statistics
    logger.info('📈 File Statistics:');
    if (data.fileCount) {
      const extensions = Object.entries(data.fileCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      extensions.forEach(([ext, count]) => {
        logger.info(`   ${ext.padEnd(10)} : ${count} files`);
      });
    }
    console.log();

    // Code Metrics
    logger.info('📊 Code Metrics:');
    logger.info(`   Total Files    : ${data.totalFiles || 0}`);
    logger.info(`   Total Lines    : ${data.totalLines || 0}`);
    logger.info(`   Code Lines     : ${data.codeLines || 0}`);
    logger.info(`   Comment Lines  : ${data.commentLines || 0}`);

    if (data.totalLines > 0) {
      const commentRatio = ((data.commentLines / data.totalLines) * 100).toFixed(1);
      logger.info(`   Comment Ratio  : ${commentRatio}%`);
    }
    console.log();

    // Quality Score
    const score = data.qualityScore || 0;
    const scoreEmoji = this.getScoreEmoji(score);
    const scoreLabel = this.getScoreLabel(score);

    logger.info('⭐ Quality Score:');
    logger.info(`   ${scoreEmoji} ${score}/100 (${scoreLabel})`);
    console.log();

    // Issues
    if (data.issues && data.issues.length > 0) {
      logger.warn('⚠️  Issues Found:');
      data.issues.forEach((issue, index) => {
        logger.warn(`   ${index + 1}. ${issue}`);
      });
      console.log();
    } else {
      logger.success('✅ No issues found!');
      console.log();
    }

    // Directory Structure
    if (data.directories) {
      logger.info('📂 Project Structure:');
      const dirs = data.directories;
      if (dirs.src && dirs.src.length > 0) {
        logger.info(`   Source: ${dirs.src.length} directories`);
      }
      if (dirs.tests && dirs.tests.length > 0) {
        logger.info(`   Tests: ${dirs.tests.length} directories`);
      }
      if (dirs.docs && dirs.docs.length > 0) {
        logger.info(`   Docs: ${dirs.docs.length} directories`);
      }
      console.log();
    }

    // Metadata
    if (result.metadata) {
      logger.verbose('⏱️  Performance:');
      if (result.metadata.totalDuration) {
        logger.verbose(`   Duration: ${result.metadata.totalDuration}ms`);
      }
      if (result.metadata.agentsUsed) {
        logger.verbose(`   Agents: ${result.metadata.agentsUsed.join(', ')}`);
      }
      console.log();
    }

    // Footer
    logger.success('━'.repeat(60));
  }

  /**
   * Get emoji for quality score
   */
  getScoreEmoji(score) {
    if (score >= 90) return '🌟';
    if (score >= 80) return '✨';
    if (score >= 70) return '👍';
    if (score >= 60) return '👌';
    if (score >= 50) return '⚠️';
    return '❌';
  }

  /**
   * Get label for quality score
   */
  getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Get command help
   */
  static getHelp() {
    return {
      description: 'Analyze project structure and code quality',
      usage: 'devtools analyze [options]',
      options: [
        {
          name: '--path <path>',
          description: 'Project path to analyze (default: current directory)'
        },
        {
          name: '--deep',
          description: 'Run deep analysis with parallel execution'
        },
        {
          name: '--format <format>',
          description: 'Output format: pretty (default) or json'
        }
      ],
      examples: [
        'devtools analyze',
        'devtools analyze --path /path/to/project',
        'devtools analyze --deep',
        'devtools analyze --format json'
      ]
    };
  }
}

module.exports = AnalyzeCommand;
