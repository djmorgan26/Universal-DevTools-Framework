#!/usr/bin/env node

/**
 * Example: Analyze Git Repository using Git MCP Server
 *
 * This example demonstrates:
 * 1. Using the built-in Git MCP server
 * 2. Calling multiple Git tools
 * 3. Processing and displaying results
 *
 * Usage:
 *   node examples/mcp/analyze-repository.js [path-to-repo]
 */

const path = require('path');
const { MCPGateway } = require('../../src/core/mcp-gateway');
const { ConfigManager } = require('../../src/core/config-manager');
const { Logger } = require('../../src/core/logger');

async function analyzeRepository(repoPath) {
  // Initialize components
  const config = new ConfigManager();
  await config.load(); // IMPORTANT: Load configuration first

  const logger = new Logger({ level: 'info' });
  const gateway = new MCPGateway(config, logger);

  logger.info('Initializing MCP Gateway with Git server...');
  await gateway.initialize(['git']);

  logger.info(`\nAnalyzing repository: ${repoPath}\n`);

  try {
    // 1. Get repository status
    logger.info('📊 Repository Status:');
    const status = await gateway.callTool('git', 'git_status', {
      workingDir: repoPath
    });
    console.log(status.text || 'Clean working tree');

    // 2. Get current branch
    logger.info('\n🌿 Current Branch:');
    const branch = await gateway.callTool('git', 'git_branch', {
      workingDir: repoPath
    });
    console.log(branch.text);

    // 3. Get recent commit history
    logger.info('\n📝 Recent Commits (last 10):');
    const log = await gateway.callTool('git', 'git_log', {
      workingDir: repoPath,
      maxCount: 10
    });

    const commits = JSON.parse(log.text);
    commits.forEach((commit, index) => {
      console.log(`\n${index + 1}. ${commit.hash.substring(0, 7)} - ${commit.message}`);
      console.log(`   Author: ${commit.authorName} <${commit.authorEmail}>`);
      console.log(`   Date: ${commit.date}`);
    });

    // 4. Get remotes
    logger.info('\n🔗 Remote Repositories:');
    const remotes = await gateway.callTool('git', 'git_remote', {
      workingDir: repoPath,
      verbose: true
    });
    console.log(remotes.text);

    // 5. Get author statistics
    logger.info('\n👥 Author Statistics:');
    const authorStats = {};
    commits.forEach(commit => {
      const author = commit.authorName;
      authorStats[author] = (authorStats[author] || 0) + 1;
    });

    Object.entries(authorStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([author, count]) => {
        console.log(`   ${author}: ${count} commits`);
      });

    // 6. Check configuration
    logger.info('\n⚙️  Repository Configuration:');
    try {
      const userName = await gateway.callTool('git', 'git_config', {
        workingDir: repoPath,
        key: 'user.name'
      });
      const userEmail = await gateway.callTool('git', 'git_config', {
        workingDir: repoPath,
        key: 'user.email'
      });
      console.log(`   User: ${userName.text} <${userEmail.text}>`);
    } catch (error) {
      console.log('   No user configuration found');
    }

    logger.success('\n✅ Repository analysis complete!');
  } catch (error) {
    logger.error(`\n❌ Error analyzing repository: ${error.message}`);
    throw error;
  } finally {
    await gateway.shutdown();
  }
}

// Run the example
const repoPath = process.argv[2] || process.cwd();

analyzeRepository(path.resolve(repoPath))
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
