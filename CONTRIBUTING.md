# Contributing to DevTools Framework

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the DevTools Framework.

## 🎯 Ways to Contribute

- 🐛 **Report bugs** - Found a problem? Let us know!
- 💡 **Suggest features** - Have an idea? We'd love to hear it!
- 📝 **Improve documentation** - Help others understand the project
- 🔧 **Fix bugs** - Submit pull requests for known issues
- ✨ **Add features** - Implement new functionality
- 🧩 **Create plugins** - Add support for new languages/tools
- 📦 **Share templates** - Contribute project templates

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- Git
- Python 3.8+ (for testing Python plugin)

### Setup Development Environment
```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/devtools-framework.git
cd devtools-framework

# 2. Install dependencies
npm install

# 3. Run tests to ensure everything works
npm test

# 4. Test the CLI
node bin/devtools.js --help
```

## 📁 Project Structure

```
devtools-framework/
├── bin/                    # CLI entry point
├── src/
│   ├── core/              # Core framework (CLI, config, plugins)
│   ├── plugins/           # Language plugins
│   │   └── python/        # Python plugin
│   ├── config/            # Configuration schemas and profiles
│   └── mcp/               # MCP integration (future)
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
└── docs/                  # Documentation

```

## 🔨 Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Changes
- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation

### 3. Test Your Changes
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/config-manager.test.js

# Test manually
node bin/devtools.js python init
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: add awesome feature"
# or
git commit -m "fix: resolve issue with X"
```

**Commit Message Format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding/updating tests
- `refactor:` Code refactoring
- `style:` Formatting changes
- `chore:` Maintenance tasks

### 5. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 📝 Coding Standards

### JavaScript Style
- Use ES6+ features
- Async/await for asynchronous code
- Descriptive variable and function names
- Comments for complex logic

### Example:
```javascript
/**
 * Install a package and update requirements.txt
 * @param {string} packageName - Package to install
 * @param {Object} options - Installation options
 * @returns {Promise<void>}
 */
async function installPackage(packageName, options = {}) {
  // Validate input
  if (!packageName) {
    throw new Error('Package name is required');
  }

  // Install package
  await pipManager.install(packageName, options);

  // Update requirements
  await updateRequirements();
}
```

### Error Handling
- Always handle errors gracefully
- Provide helpful error messages
- Use try/catch blocks appropriately

```javascript
try {
  await riskyOperation();
} catch (error) {
  logger.error(`Operation failed: ${error.message}`);
  throw new Error('Helpful message for the user');
}
```

## 🧪 Testing Guidelines

### Writing Tests
```javascript
describe('FeatureName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Test Coverage
- Aim for 80%+ code coverage
- Test happy paths and error cases
- Test edge cases

## 🧩 Creating a New Plugin

### Plugin Structure
```
src/plugins/your-plugin/
├── index.js              # Plugin entry point
├── commands/             # Command implementations
│   ├── init.js
│   ├── add.js
│   └── remove.js
├── utils/                # Utility functions
├── templates/            # Project templates
└── skills/               # AI assistant instructions
```

### Plugin Interface
```javascript
module.exports = {
  name: 'your-plugin',
  version: '1.0.0',
  description: 'Description of your plugin',

  commands: {
    init: {
      description: 'Initialize project',
      arguments: '[args]',  // Optional
      options: [           // Optional
        {
          flags: '--flag <value>',
          description: 'Flag description'
        }
      ],
      async execute(context, ...args) {
        const { logger, config, mcpGateway, options } = context;
        // Implementation
      }
    }
  }
};
```

### Plugin Checklist
- [ ] Implements required interface
- [ ] Has clear description
- [ ] Commands have helpful descriptions
- [ ] Error handling implemented
- [ ] Tests added
- [ ] Documentation updated
- [ ] Example usage provided

## 📦 Adding Templates

### Template Structure
```
src/plugins/plugin-name/templates/template-name/
├── file1.ext
├── file2.ext
└── directory/
    └── file3.ext
```

### Template Guidelines
- Include README with instructions
- Add .gitignore
- Include environment variable examples
- Follow language best practices
- Keep it simple and focused

## 📖 Documentation

### What to Document
- New features
- API changes
- Configuration options
- Template usage
- Common issues

### Where to Document
- README.md - Overview and quick start
- USAGE_GUIDE.md - Detailed usage
- Code comments - Complex logic
- Plugin docs - Plugin-specific info

## 🐛 Reporting Bugs

### Good Bug Reports Include:
1. **Clear title** - Summarize the issue
2. **Description** - What happened vs what should happen
3. **Steps to reproduce** - How to trigger the bug
4. **Environment** - OS, Node version, etc.
5. **Logs** - Error messages, stack traces
6. **Screenshots** - If applicable

### Bug Report Template:
```markdown
**Description:**
Clear description of the bug

**Steps to Reproduce:**
1. Run `devtools python init`
2. Run `devtools python add requests`
3. Error occurs

**Expected Behavior:**
Package should install successfully

**Actual Behavior:**
Error: ...

**Environment:**
- OS: macOS 14.0
- Node: v18.17.0
- DevTools: v0.1.0

**Logs:**
```
Error stack trace here
```
```

## 💡 Feature Requests

### Good Feature Requests Include:
1. **Use case** - Why is this needed?
2. **Proposed solution** - How it should work
3. **Alternatives** - Other ways to solve it
4. **Examples** - Show expected usage

### Feature Request Template:
```markdown
**Problem:**
Currently, users have to manually...

**Proposed Solution:**
Add a command that...

**Example Usage:**
```bash
devtools python feature --option value
```

**Benefits:**
- Saves time
- Improves workflow
- Helps with X

**Alternatives Considered:**
- Option A: ...
- Option B: ...
```

## 🔍 Code Review Process

### What We Look For:
- ✅ Code quality and readability
- ✅ Tests pass
- ✅ Documentation updated
- ✅ Follows coding standards
- ✅ No breaking changes (or properly documented)

### Review Timeline:
- Initial review: Within 2-3 business days
- Follow-up: Within 1-2 business days
- Merge: After approval and CI passes

## 🎓 Learning Resources

### Understanding the Codebase:
1. Start with `bin/devtools.js` - CLI entry point
2. Read `src/core/cli.js` - Main CLI logic
3. Explore `src/plugins/python/` - Example plugin
4. Check tests for examples

### Helpful Links:
- [Commander.js Docs](https://github.com/tj/commander.js)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## 📞 Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create an Issue
- **Chat**: [Project Slack/Discord if available]

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Every contribution, no matter how small, helps make DevTools Framework better for everyone. We appreciate your time and effort!

---

Happy coding! 🚀
