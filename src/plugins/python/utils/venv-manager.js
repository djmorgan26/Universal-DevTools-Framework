const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * Virtual Environment Manager
 *
 * Handles Python virtual environment operations:
 * - Create venv
 * - Activate/deactivate
 * - Modify activation scripts
 * - Check status
 */
class VenvManager {
  constructor(pythonPath, logger) {
    this.pythonPath = pythonPath;
    this.logger = logger;
    this.venvPath = null;
  }

  /**
   * Create virtual environment
   * @param {string} venvPath Path for venv (default: 'venv')
   */
  async create(venvPath = 'venv') {
    this.venvPath = path.resolve(venvPath);

    // Check if venv already exists
    if (await fs.pathExists(this.venvPath)) {
      this.logger.warn(`Virtual environment already exists at ${venvPath}`);
      return;
    }

    this.logger.info('Creating virtual environment...');

    try {
      const { execa } = await import('execa');
      await execa(this.pythonPath, ['-m', 'venv', venvPath]);
      this.logger.debug(`Virtual environment created at ${venvPath}`);
    } catch (error) {
      throw new Error(`Failed to create venv: ${error.message}`);
    }
  }

  /**
   * Check if venv exists
   * @returns {Promise<boolean>}
   */
  async exists() {
    if (!this.venvPath) {
      this.venvPath = path.resolve('venv');
    }

    return await fs.pathExists(this.venvPath);
  }

  /**
   * Get path to Python executable in venv
   * @returns {string}
   */
  getPythonPath() {
    if (!this.venvPath) {
      throw new Error('Virtual environment not initialized');
    }

    const isWindows = os.platform() === 'win32';
    return isWindows
      ? path.join(this.venvPath, 'Scripts', 'python.exe')
      : path.join(this.venvPath, 'bin', 'python');
  }

  /**
   * Get path to pip executable in venv
   * @returns {string}
   */
  getPipPath() {
    if (!this.venvPath) {
      throw new Error('Virtual environment not initialized');
    }

    const isWindows = os.platform() === 'win32';
    return isWindows
      ? path.join(this.venvPath, 'Scripts', 'pip.exe')
      : path.join(this.venvPath, 'bin', 'pip');
  }

  /**
   * Get activation command for shell
   * @returns {string}
   */
  getActivateCommand() {
    const isWindows = os.platform() === 'win32';
    const venvName = path.basename(this.venvPath || 'venv');

    return isWindows
      ? `${venvName}\\Scripts\\activate`
      : `source ${venvName}/bin/activate`;
  }

  /**
   * Get path to activation script
   * @returns {string}
   */
  getActivateScriptPath() {
    const isWindows = os.platform() === 'win32';
    return isWindows
      ? path.join(this.venvPath, 'Scripts', 'activate.bat')
      : path.join(this.venvPath, 'bin', 'activate');
  }

  /**
   * Add environment variables to activation script
   * @param {Object} envVars Key-value pairs of environment variables
   */
  async addEnvVars(envVars) {
    const activateScript = this.getActivateScriptPath();

    if (!await fs.pathExists(activateScript)) {
      throw new Error('Activation script not found');
    }

    let content = await fs.readFile(activateScript, 'utf8');

    // Check if already modified
    if (content.includes('# DevTools Registry Configuration')) {
      this.logger.debug('Activation script already configured');
      return;
    }

    // Add environment variables
    const isWindows = os.platform() === 'win32';
    const envSection = isWindows
      ? this.generateWindowsEnvVars(envVars)
      : this.generateUnixEnvVars(envVars);

    content += '\n' + envSection;

    await fs.writeFile(activateScript, content);
    this.logger.debug('Environment variables added to activation script');
  }

  generateUnixEnvVars(envVars) {
    let section = '\n# DevTools Registry Configuration\n';

    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        section += `export ${key}="${value}"\n`;
      }
    }

    return section;
  }

  generateWindowsEnvVars(envVars) {
    let section = '\nREM DevTools Registry Configuration\n';

    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        section += `set ${key}=${value}\n`;
      }
    }

    return section;
  }

  /**
   * Execute command in virtual environment
   * @param {string} command Command to execute
   * @param {Array} args Command arguments
   * @returns {Promise<Object>} Execution result
   */
  async execute(command, args = []) {
    if (!await this.exists()) {
      throw new Error('Virtual environment does not exist');
    }

    const pythonPath = this.getPythonPath();
    const { execa } = await import('execa');

    return await execa(pythonPath, ['-m', command, ...args], {
      cwd: process.cwd()
    });
  }

  /**
   * Get venv information
   * @returns {Promise<Object>}
   */
  async getInfo() {
    const pythonPath = this.getPythonPath();
    const { execa } = await import('execa');

    const { stdout: version } = await execa(pythonPath, ['--version']);
    const { stdout: pipVersion } = await execa(pythonPath, ['-m', 'pip', '--version']);

    return {
      path: this.venvPath,
      pythonVersion: version.replace('Python ', ''),
      pipVersion: pipVersion.match(/pip ([\d.]+)/)?.[1] || 'unknown',
      activated: process.env.VIRTUAL_ENV === this.venvPath
    };
  }
}

module.exports = { VenvManager };
