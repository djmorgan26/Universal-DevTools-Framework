# DevTools Framework - Live Demo Script

## 🎯 Demo Goal
Show how DevTools Framework transforms Python project setup from tedious manual work to a simple, automated workflow.

**Time**: 5-7 minutes
**Audience**: Development team
**Key Message**: "From zero to production-ready in 2 minutes"

---

## 📋 Pre-Demo Setup

### Before the meeting:
```bash
# 1. Clean workspace
cd ~/Desktop
rm -rf demo-project

# 2. Have terminal ready with large font
# Recommended: 18-20pt font for screen sharing

# 3. Have this script open in another window

# 4. Test commands work:
devtools --version
devtools --help
```

---

## 🎬 Demo Script

### **Part 1: The Problem (30 seconds)**

**Say:**
> "Let me show you the typical Python project setup. How many steps do we usually go through?"

**Screen share terminal, type slowly:**
```bash
# The old way - manual, error-prone
mkdir my-project
cd my-project
python3 -m venv venv
source venv/bin/activate
touch requirements.txt
touch .gitignore
touch README.md
# ... and we still haven't written any code!
```

**Say:**
> "And that's just the basics. We haven't configured pip, added AI instructions, or set up templates."

---

### **Part 2: The Solution - DevTools Framework (2 minutes)**

**Say:**
> "Now, let me show you what I've built. Watch this."

#### Step 1: Show Help
```bash
devtools --help
```

**Say:**
> "It's a plugin-based CLI framework. We have a Python plugin ready to go."

```bash
devtools python --help
```

**Pause to show the commands**

---

#### Step 2: Initialize Project
```bash
# Create new directory
mkdir demo-project
cd demo-project

# One command to set everything up
devtools python init
```

**While it runs, say:**
> "This one command is:
> - Creating a virtual environment
> - Configuring pip for our registry
> - Copying a template
> - Installing AI assistant instructions
> - Creating .gitignore, README, and other standard files"

**Wait for completion**

---

#### Step 3: Show What Was Created
```bash
ls -la
```

**Say:**
> "Look at what we got automatically:"

```bash
tree -L 2
# Or if tree not available:
find . -maxdepth 2 -not -path '*/venv/*' | sort
```

**Point out:**
- ✅ Virtual environment
- ✅ main.py with starter code
- ✅ tests directory
- ✅ .gitignore (properly configured)
- ✅ .copilot-instructions.md (AI instructions)
- ✅ README.md
- ✅ requirements.txt

---

#### Step 4: Add Packages
**Say:**
> "Now let's add some packages. Watch how it manages dependencies."

```bash
devtools python add requests
```

**While it runs, say:**
> "It's installing the package AND automatically updating requirements.txt."

**Show the result:**
```bash
cat requirements.txt
```

**Add another:**
```bash
devtools python add pandas
```

---

#### Step 5: Verify Environment
**Say:**
> "We have a check command that verifies everything is set up correctly."

```bash
devtools python check
```

**Point out the checks:**
- ✅ Virtual environment
- ✅ Python and pip versions
- ✅ requirements.txt
- ✅ AI instructions
- ✅ .gitignore

---

#### Step 6: It Actually Works
**Say:**
> "And the best part - it's not just scaffolding. This actually works."

```bash
source venv/bin/activate
python main.py
```

**Should output:** "Hello from DevTools Python project!"

---

### **Part 3: Enterprise Features (1-2 minutes)**

**Say:**
> "Now here's where it gets interesting for us as a team."

#### Show Configuration Profiles
```bash
devtools config list
```

**Say:**
> "We have profiles. Default uses public PyPI. But watch this..."

```bash
devtools config show artifactory.template
```

**Say:**
> "We have an Artifactory template ready. One-time setup, then everyone uses it automatically."

**Demo the setup (don't actually run, just show):**
```bash
# For our team, we'd do this once:
export ARTIFACTORY_URL=https://our-artifactory.com
export ARTIFACTORY_HOST=our-artifactory.com
devtools config create company --from artifactory
devtools config use company

# Then every project automatically uses company registry:
devtools python init
# ✨ Uses Artifactory automatically
```

---

### **Part 4: The AI Integration (1 minute)**

**Say:**
> "One more thing - AI assistant integration."

```bash
cat .copilot-instructions.md | head -30
```

**Say:**
> "Every project gets these instructions automatically. Your Copilot, Cursor, or Claude knows to:
> - Always use the virtual environment
> - Install from the configured registry
> - Follow Python best practices
> - Use type hints and docstrings"

**Open main.py in VS Code (if available):**
> "Watch what happens when I start typing..." (AI autocomplete follows the standards)

---

### **Part 5: Templates (30 seconds)**

**Say:**
> "We also have templates. Let me show you FastAPI."

```bash
cd ..
mkdir api-demo
cd api-demo
devtools python init --template fastapi
```

**Show structure:**
```bash
tree app -L 2
```

**Say:**
> "Full FastAPI structure - app, routes, config, tests - all set up and ready to go."

---

## 💡 **Key Talking Points**

### Why This Matters
1. **Consistency**: Every project starts the same way
2. **Speed**: 2 minutes vs 20 minutes
3. **Best Practices**: Built in, not added later
4. **Enterprise Ready**: Custom registries supported
5. **AI Enhanced**: Works with modern dev tools

### What Makes It Different
1. **Plugin Architecture**: Python today, Node.js tomorrow
2. **Zero Config Default**: Works immediately for personal projects
3. **One-Time Enterprise Setup**: Configure once, use everywhere
4. **Beautiful UX**: Not just functional, actually pleasant to use

### Technical Highlights
1. **~3,500 lines** of production code
2. **4 working commands** in Python plugin
3. **2 templates** (basic, FastAPI)
4. **Hierarchical configuration** system
5. **Automatic requirements.txt** management

---

## 🎤 **Handling Questions**

### "How does it compare to Poetry/pipenv?"
> "Great question! Poetry is more feature-rich with dependency resolution. DevTools is simpler and focuses on project initialization and team consistency. You could even use both - DevTools for init, Poetry for deps."

### "Can we customize the templates?"
> "Absolutely! Templates are just directories in `src/plugins/python/templates/`. You can add your own company templates easily."

### "What about other languages?"
> "That's the beauty of the plugin architecture. Node.js plugin would follow the same pattern - about 2-3 hours of work."

### "Is this production-ready?"
> "Yes! I've been using it myself. All commands are tested and working. We could start using it tomorrow."

### "How do we deploy this to the team?"
> "Two options:
> 1. npm install -g from our Artifactory
> 2. npx devtools-framework (no install needed)
> I recommend npx for now - always latest version."

### "What's the learning curve?"
> "If you can type `devtools python init`, you're 80% there. The commands are intuitive."

---

## 📊 **Success Metrics to Share**

- **Time Saved**: 15-20 minutes per project initialization
- **Consistency**: 100% - everyone gets the same setup
- **Adoption**: Zero training needed
- **Errors**: Eliminated manual setup mistakes
- **Team Benefit**: Shared templates and standards

---

## 🎁 **Closing**

**Say:**
> "So in summary:
> - One command to initialize projects
> - Automatic dependency management
> - Enterprise registry support
> - AI assistant integration
> - Template system for different project types
>
> I've built this as a universal framework. Python is first, but the architecture supports any language.
>
> I'd love to hear your thoughts and feedback. Should we adopt this for the team?"

---

## 🔧 **Troubleshooting During Demo**

### If something fails:
1. **Stay calm** - "Let me show you how the error handling works"
2. **Show the error message** - they're helpful!
3. **Have backup** - screenshots/recording ready

### If Python not found:
```bash
devtools python init --python python3.11
# Show: "See? Flexible Python version support"
```

### If demo machine is slow:
> "While this runs, let me show you the code structure..."
> (switch to showing source code in editor)

---

## ✅ **Post-Demo Checklist**

After the demo:
- [ ] Share this GitHub repository link
- [ ] Share the USAGE_GUIDE.md
- [ ] Share the team setup instructions
- [ ] Schedule follow-up for questions
- [ ] Get feedback on priority features

---

## 🎬 **Alternative: Quick Demo (2 minutes)**

If you only have 2 minutes:

```bash
# The pitch
"Watch this: from zero to working Python project in one command."

# The demo
mkdir quick-demo && cd quick-demo
devtools python init
devtools python add requests
devtools python check
source venv/bin/activate && python main.py

# The close
"That's it. Questions?"
```

---

**Good luck with your demo! 🚀**

*Pro tip: Practice once before the actual demo. The first run downloads packages which takes longer.*
