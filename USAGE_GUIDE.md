# DevTools Framework - Usage Guide

## Installation & Setup

### Quick Start (No Installation Required)
```bash
# Use directly with npx (from the repository)
cd /path/to/Universal-DevTools-Framework
node bin/devtools.js --help
```

### Install Dependencies
```bash
cd /path/to/Universal-DevTools-Framework
npm install
```

## Basic Usage

### 1. Check Your System
```bash
node bin/devtools.js doctor
```

**Expected Output:**
```
🔍 Running system diagnostics...

✓ Node.js v18.x.x
✓ Python 3.8+
✓ Git version x.x.x
✓ Configuration is valid
```

### 2. View Available Profiles
```bash
node bin/devtools.js config list
```

**Expected Output:**
```
Available profiles:
  - artifactory.template
  - default (active)
```

### 3. Initialize a Python Project

#### Basic Python Project
```bash
# Create project directory
mkdir my-python-app
cd my-python-app

# Initialize
node /path/to/devtools.js python init

# What gets created:
# ├── venv/              # Virtual environment
# ├── main.py            # Entry point
# ├── tests/             # Test directory
# │   └── test_main.py
# ├── requirements.txt   # Dependencies
# ├── .gitignore         # Python gitignore
# ├── .env.example       # Environment template
# ├── .copilot-instructions.md  # AI assistant instructions
# └── README.md          # Documentation
```

#### FastAPI Project
```bash
# Create project directory
mkdir my-api
cd my-api

# Initialize with FastAPI template
node /path/to/devtools.js python init --template fastapi

# What gets created:
# ├── app/
# │   ├── __init__.py
# │   ├── main.py        # FastAPI app
# │   ├── config.py      # Settings
# │   └── routes/        # API endpoints
# │       ├── __init__.py
# │       └── health.py
# ├── tests/
# ├── venv/
# ├── requirements.txt
# └── ... (standard files)
```

### 4. Start Developing

#### Activate Virtual Environment
```bash
# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

#### Run Your Application
```bash
# Basic project
python main.py

# FastAPI project
pip install fastapi uvicorn
uvicorn app.main:app --reload
```

#### Access FastAPI Docs
```
http://localhost:8000/docs       # Swagger UI
http://localhost:8000/redoc      # ReDoc
http://localhost:8000/health     # Health check
```

## Advanced Configuration

### Using Custom Registry (Enterprise)

#### 1. Create Company Profile
```bash
node bin/devtools.js config create company --from artifactory
```

This creates a new profile based on the Artifactory template.

#### 2. Configure Registry Settings

**Option A: Environment Variables**
```bash
export ARTIFACTORY_URL=https://artifactory.yourcompany.com
export ARTIFACTORY_HOST=artifactory.yourcompany.com

node bin/devtools.js python init --profile company
```

**Option B: Direct Configuration**
```bash
node bin/devtools.js config set python.indexUrl "https://artifactory.yourcompany.com/api/pypi/simple"
node bin/devtools.js config set python.trustedHost "artifactory.yourcompany.com"
node bin/devtools.js config use company
```

#### 3. Initialize with Custom Registry
```bash
node bin/devtools.js python init
```

The virtual environment will be automatically configured to use your custom registry.

### Verify Registry Configuration
```bash
# After init, check venv pip config
cat venv/pip.conf  # macOS/Linux
type venv\pip.ini  # Windows
```

## Command Reference

### Global Commands

#### `devtools --help`
Show all available commands

#### `devtools --version`
Show version number

#### `devtools doctor`
Check system prerequisites

### Configuration Commands

#### `devtools config list`
List all available profiles

#### `devtools config show [profile]`
Show profile configuration (defaults to active profile)

#### `devtools config create <name> [--from <template>]`
Create new profile from template

Options:
- `--from artifactory` - Use Artifactory template
- `--from custom` - Use custom template

#### `devtools config use <profile>`
Switch to specified profile

#### `devtools config set <key> <value>`
Set configuration value

Examples:
```bash
devtools config set python.indexUrl "https://pypi.org/simple"
devtools config set python.trustedHost "pypi.org"
```

### Python Commands

#### `devtools python init [options]`
Initialize Python project

Options:
- `-t, --template <type>` - Template to use (basic, fastapi)
- `--skip-install` - Skip installing dependencies
- `--python <path>` - Python executable path (default: python3)
- `--profile <name>` - Use specific config profile

Examples:
```bash
# Basic project
devtools python init

# FastAPI project
devtools python init --template fastapi

# Skip dependency installation
devtools python init --skip-install

# Use custom Python
devtools python init --python /usr/local/bin/python3.11

# Use company registry
devtools python init --profile company
```

## File Structure

### Basic Template
```
your-project/
├── venv/                         # Virtual environment
│   ├── bin/                      # Executables (macOS/Linux)
│   ├── Scripts/                  # Executables (Windows)
│   ├── lib/                      # Python packages
│   └── pyvenv.cfg                # venv configuration
├── tests/
│   └── test_main.py              # Sample test
├── main.py                       # Application entry point
├── requirements.txt              # Python dependencies
├── .gitignore                    # Git ignore rules
├── .env.example                  # Environment variables template
├── .copilot-instructions.md      # AI assistant instructions
└── README.md                     # Project documentation
```

### FastAPI Template
```
your-api/
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI application
│   ├── config.py                 # Application settings
│   ├── models/                   # Pydantic models
│   │   └── __init__.py
│   ├── routes/                   # API endpoints
│   │   ├── __init__.py
│   │   └── health.py             # Health check
│   └── services/                 # Business logic
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   └── test_main.py
├── venv/
├── requirements.txt
├── .gitignore
├── .env.example
├── .copilot-instructions.md
└── README.md
```

## Working with AI Assistants

The framework creates `.copilot-instructions.md` in your project root. This file instructs AI assistants (GitHub Copilot, Cursor, Claude) to:

1. **Always use the virtual environment**
   - Activate venv before running commands
   - Use venv Python for execution

2. **Respect registry configuration**
   - Don't add manual pip flags
   - Use pre-configured settings

3. **Follow Python best practices**
   - Type hints
   - Docstrings
   - Proper imports
   - Error handling

## Troubleshooting

### Python Not Found
```
Error: Python not found
```

**Solution:**
```bash
# Specify Python path
devtools python init --python /usr/bin/python3
devtools python init --python python3.11
```

### Virtual Environment Already Exists
```
Warning: Virtual environment already exists at venv
```

**Solution:**
```bash
# Remove existing venv
rm -rf venv

# Reinitialize
devtools python init
```

### Registry Unreachable
```
⚠ Registry unreachable (will use cache)
```

**Note:** This is a warning, not an error. pip will use cached packages or fall back to public PyPI.

### Permission Denied
```
Error: EACCES: permission denied
```

**Solution:**
```bash
# Don't use sudo
# Make sure you have write permissions to the directory
chmod u+w .

# Or create project in your home directory
cd ~
mkdir my-project
cd my-project
devtools python init
```

## Tips & Best Practices

### 1. Always Activate Virtual Environment
```bash
# Before running any Python commands
source venv/bin/activate

# Check it's active
which python  # Should show venv/bin/python
```

### 2. Keep Requirements Updated
```bash
# After installing packages
pip freeze > requirements.txt

# Commit to version control
git add requirements.txt
git commit -m "Update dependencies"
```

### 3. Use .env for Configuration
```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env

# Never commit .env to git (already in .gitignore)
```

### 4. Test Before Committing
```bash
# Run tests
pytest

# Check code style
flake8 .
black --check .
```

### 5. Share Profile with Team
```bash
# Commit profile to repo
mkdir .devtools
devtools config show company > .devtools/config.json

# Team members can use it
git clone <repo>
devtools config use company
devtools python init
```

## Examples

### Example 1: Quick Prototype
```bash
mkdir prototype
cd prototype
devtools python init
source venv/bin/activate
pip install requests beautifulsoup4
# Start coding in main.py
```

### Example 2: FastAPI Microservice
```bash
mkdir user-service
cd user-service
devtools python init --template fastapi
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy
# Edit app/main.py to add endpoints
uvicorn app.main:app --reload
```

### Example 3: Data Science Project
```bash
mkdir ml-experiment
cd ml-experiment
devtools python init
source venv/bin/activate
pip install numpy pandas scikit-learn jupyter
# Launch Jupyter
jupyter notebook
```

### Example 4: Enterprise Project
```bash
# Set up company profile once
export ARTIFACTORY_URL=https://artifactory.company.com
export ARTIFACTORY_HOST=artifactory.company.com
devtools config create company --from artifactory
devtools config use company

# Use for all projects
mkdir company-project
cd company-project
devtools python init
# Automatically uses company registry
```

## Next Steps

After initializing your project:

1. ✅ Activate virtual environment
2. ✅ Install additional dependencies
3. ✅ Write code in main.py or app/
4. ✅ Add tests in tests/
5. ✅ Update README.md
6. ✅ Configure .env
7. ✅ Initialize git repository
8. ✅ Start building!

## Getting Help

```bash
# General help
devtools --help

# Command-specific help
devtools python --help
devtools python init --help
devtools config --help

# System check
devtools doctor
```

## Summary

This framework makes Python project initialization:
- **Fast**: 10-20 seconds to working project
- **Consistent**: Same structure every time
- **Flexible**: Public or custom registries
- **AI-Ready**: Instructions for assistants included
- **Enterprise-Friendly**: Team-wide configuration

Happy coding! 🚀
