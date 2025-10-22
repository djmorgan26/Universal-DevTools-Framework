const fs = require('fs-extra');
const path = require('path');
const { Logger } = require('./logger');

/**
 * Branding Manager
 *
 * Handles company branding and theming for generated projects:
 * - Global stylesheets
 * - Company logos and favicons
 * - Brand colors and typography
 * - Custom assets
 */
class BrandingManager {
  constructor(configManager) {
    this.config = configManager;
    this.logger = new Logger();
  }

  /**
   * Get the active theme name
   * @returns {string} Theme name (e.g., 'default', 'example-company', or custom path)
   */
  getTheme() {
    return this.config.get('branding.theme') || 'default';
  }

  /**
   * Get path to the theme's global stylesheet
   * @returns {string|null} Path to styles.css or null if not found
   */
  getGlobalStylesPath() {
    // Check for custom styles path first
    const customPath = this.config.get('branding.customStylesPath');
    if (customPath) {
      const resolvedPath = path.isAbsolute(customPath)
        ? customPath
        : path.join(process.cwd(), customPath);

      if (fs.existsSync(resolvedPath)) {
        return resolvedPath;
      } else {
        this.logger.warn(`Custom styles path not found: ${customPath}`);
      }
    }

    // Fall back to built-in themes
    const theme = this.getTheme();
    const brandingDir = path.join(__dirname, '../config/branding');
    const themeStylesPath = path.join(brandingDir, theme, 'styles.css');

    if (fs.existsSync(themeStylesPath)) {
      return themeStylesPath;
    }

    // Fall back to default theme
    const defaultPath = path.join(brandingDir, 'default', 'styles.css');
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }

    return null;
  }

  /**
   * Get company name for branding
   * @returns {string|null}
   */
  getCompanyName() {
    return this.config.get('branding.companyName');
  }

  /**
   * Get path to company logo
   * @returns {string|null}
   */
  getLogoPath() {
    const logoPath = this.config.get('branding.logoPath');
    if (!logoPath) return null;

    return path.isAbsolute(logoPath)
      ? logoPath
      : path.join(process.cwd(), logoPath);
  }

  /**
   * Get path to favicon
   * @returns {string|null}
   */
  getFaviconPath() {
    const faviconPath = this.config.get('branding.faviconPath');
    if (!faviconPath) return null;

    return path.isAbsolute(faviconPath)
      ? faviconPath
      : path.join(process.cwd(), faviconPath);
  }

  /**
   * Copy global styles to project
   * @param {string} destPath Destination path for styles.css
   * @returns {Promise<boolean>} True if styles were copied
   */
  async copyGlobalStyles(destPath) {
    const stylesPath = this.getGlobalStylesPath();

    if (!stylesPath) {
      this.logger.debug('No global styles found to copy');
      return false;
    }

    try {
      await fs.copy(stylesPath, destPath);
      this.logger.debug(`Copied global styles from ${stylesPath} to ${destPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to copy global styles: ${error.message}`);
      return false;
    }
  }

  /**
   * Copy logo to project
   * @param {string} destDir Destination directory
   * @returns {Promise<string|null>} Relative path to logo in project or null
   */
  async copyLogo(destDir) {
    const logoPath = this.getLogoPath();

    if (!logoPath || !fs.existsSync(logoPath)) {
      return null;
    }

    try {
      const logoFileName = path.basename(logoPath);
      const destPath = path.join(destDir, logoFileName);
      await fs.copy(logoPath, destPath);

      this.logger.debug(`Copied logo to ${destPath}`);
      return logoFileName;
    } catch (error) {
      this.logger.error(`Failed to copy logo: ${error.message}`);
      return null;
    }
  }

  /**
   * Copy favicon to project
   * @param {string} destDir Destination directory
   * @returns {Promise<string|null>} Relative path to favicon or null
   */
  async copyFavicon(destDir) {
    const faviconPath = this.getFaviconPath();

    if (!faviconPath || !fs.existsSync(faviconPath)) {
      return null;
    }

    try {
      const faviconFileName = path.basename(faviconPath);
      const destPath = path.join(destDir, faviconFileName);
      await fs.copy(faviconPath, destPath);

      this.logger.debug(`Copied favicon to ${destPath}`);
      return faviconFileName;
    } catch (error) {
      this.logger.error(`Failed to copy favicon: ${error.message}`);
      return null;
    }
  }

  /**
   * Get branding info for display
   * @returns {Object} Branding information
   */
  getBrandingInfo() {
    return {
      theme: this.getTheme(),
      companyName: this.getCompanyName(),
      hasCustomStyles: !!this.getGlobalStylesPath(),
      hasLogo: !!this.getLogoPath(),
      hasFavicon: !!this.getFaviconPath()
    };
  }

  /**
   * Generate branded README content
   * @param {string} projectName Project name
   * @param {Object} options Additional options
   * @returns {string} README content with branding
   */
  generateBrandedReadme(projectName, options = {}) {
    const companyName = this.getCompanyName();
    const theme = this.getTheme();

    let readme = `# ${projectName}\n\n`;

    if (companyName) {
      readme += `*A ${companyName} project*\n\n`;
    }

    readme += `Project created with DevTools Framework`;

    if (theme !== 'default') {
      readme += ` using the **${theme}** theme`;
    }

    readme += `.\n\n`;

    // Add rest of README content
    readme += `## Getting Started\n\n`;

    if (options.type === 'node') {
      readme += `\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Start production server
npm start
\`\`\`\n\n`;
    } else if (options.type === 'python') {
      readme += `\`\`\`bash
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py

# Run tests
pytest
\`\`\`\n\n`;
    }

    readme += `## Project Structure\n\n`;
    readme += options.structure || '- Standard project layout\n';
    readme += `\n`;

    if (companyName) {
      readme += `## ${companyName} Standards\n\n`;
      readme += `This project follows ${companyName}'s development standards and best practices.\n`;
      readme += `See .copilot-instructions.md for detailed guidelines.\n\n`;
    }

    readme += `## License\n\n`;
    readme += options.license || 'ISC';
    readme += `\n`;

    return readme;
  }
}

module.exports = { BrandingManager };
