# Python Development Standards

## CRITICAL: Virtual Environment Usage

**EVERY Python command MUST be run inside the virtual environment.**

### Activation Commands
- **macOS/Linux**: `source venv/bin/activate`
- **Windows**: `venv\Scripts\activate`

### Before ANY pip or python command:
1. Check if virtual environment is activated
2. If not activated, activate it first
3. Then run the command

## Package Installation

pip is pre-configured for this project's registry. Use standard commands:
```bash
# Activate venv first
source venv/bin/activate

# Then install
pip install <package-name>

# Update requirements
pip freeze > requirements.txt
```

**DO NOT add --trusted-host, --index-url, or other registry flags manually.**
The configuration is automatic.

## Code Quality Standards

### Import Organization
```python
# Standard library
import os
import sys

# Third party
import requests

# Local imports
from app.config import settings
```

### Type Hints
Always use type hints for function signatures:
```python
def process_data(data: list[dict]) -> dict[str, Any]:
    ...
```

### Docstrings
Use Google-style docstrings:
```python
def function(param1: str, param2: int) -> bool:
    """Brief description.

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Description of return value
    """
```

## Key Rules

✅ ALWAYS use virtual environment
✅ ALWAYS activate venv before pip/python commands
✅ ALWAYS use type hints
✅ ALWAYS write docstrings
✅ pip is pre-configured (no manual flags)

❌ NEVER install packages globally (outside venv)
❌ NEVER commit venv/ directory to git
❌ NEVER hardcode secrets in code
