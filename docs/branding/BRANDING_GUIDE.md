# Branding & Theming Guide

## Overview

The DevTools Framework includes a powerful **branding and theming system** that allows companies and teams to maintain consistent visual identity across all generated projects. This guide shows you how to customize the look and feel of your projects.

---

## Why Branding Matters

For enterprise organizations, maintaining brand consistency is critical:

- **Visual Identity** - Ensure all projects use company colors, typography, and styling
- **Developer Efficiency** - Pre-configured themes save setup time on every project
- **Brand Compliance** - Automatic enforcement of design standards
- **Professionalism** - Projects look polished and branded from day one

---

## How It Works

### Architecture

```
DevTools Framework
├── src/config/branding/
│   ├── default/
│   │   └── styles.css          # Default theme (generic, professional)
│   └── example-company/
│       └── styles.css          # Company-specific theme
│
├── User Configuration (.devtools.json)
│   └── branding: {
│         theme: "example-company",
│         companyName: "ACME Corp"
│       }
│
└── Generated Project
    └── src/global-styles.css   # Copied from theme automatically
```

### Workflow

1. **Configuration** - Specify branding in `.devtools.json` or profile
2. **Generation** - Run `devtools node init` (or python init)
3. **Automatic Copy** - Framework copies theme styles to project
4. **Ready to Use** - All CSS variables and styles available immediately

---

## Quick Start

### Using a Built-in Theme

The framework comes with two built-in themes:

#### 1. Default Theme (Generic)
```json
{
  "branding": {
    "theme": "default"
  }
}
```

#### 2. Example Company Theme
```json
{
  "branding": {
    "theme": "example-company",
    "companyName": "ACME Corp"
  }
}
```

### Creating a Custom Theme

**Step 1:** Create your company's branding directory

```bash
mkdir -p src/config/branding/my-company
```

**Step 2:** Create your `styles.css`

```bash
cp src/config/branding/example-company/styles.css src/config/branding/my-company/styles.css
```

**Step 3:** Customize the CSS variables

```css
:root {
  /* Your company's primary color */
  --primary-color: #ff6600;
  --primary-hover: #e65c00;

  /* Your company's fonts */
  --font-family-sans: 'YourFont', 'Segoe UI', sans-serif;

  /* ... customize all variables ... */
}
```

**Step 4:** Configure the theme

```json
{
  "branding": {
    "theme": "my-company",
    "companyName": "My Company Inc"
  }
}
```

**Step 5:** Generate projects

```bash
devtools node init --template react
# Your custom styles are automatically included!
```

---

## Configuration Options

### Full Branding Configuration

```json
{
  "branding": {
    // Theme name (built-in or custom)
    "theme": "my-company",

    // Path to custom stylesheet (alternative to theme)
    "customStylesPath": "/path/to/company/styles.css",

    // Company name for README and docs
    "companyName": "ACME Corporation",

    // Path to company logo
    "logoPath": "/path/to/logo.svg",

    // Path to favicon
    "faviconPath": "/path/to/favicon.ico"
  }
}
```

### Configuration Locations

You can configure branding in multiple places:

1. **Global Config** - `~/.devtools.json`
   ```json
   {
     "branding": {
       "theme": "my-company",
       "companyName": "ACME Corp"
     }
   }
   ```

2. **Profile** - `src/config/profiles/acme-corp.json`
   ```json
   {
     "profile": "acme-corp",
     "branding": {
       "theme": "acme-corp",
       "companyName": "ACME Corporation"
     }
   }
   ```

3. **Project Config** - `.devtools.json` in project root
   ```json
   {
     "branding": {
       "theme": "specific-project-theme"
     }
   }
   ```

4. **CLI Override** - Environment variable
   ```bash
   DEVTOOLS_BRANDING_THEME=my-company devtools node init
   ```

---

## CSS Variables Reference

### Colors

```css
:root {
  /* Primary Brand Colors */
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #3b82f6;
  --primary-dark: #1e40af;

  /* Secondary Colors */
  --secondary-color: #64748b;
  --secondary-hover: #475569;
  --secondary-light: #94a3b8;

  /* Accent Colors */
  --accent-color: #8b5cf6;
  --accent-hover: #7c3aed;

  /* Semantic Colors */
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --info-color: #06b6d4;

  /* Text Colors */
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #6b7280;
  --text-inverse: #ffffff;

  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
}
```

### Typography

```css
:root {
  /* Font Families */
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', ...;
  --font-family-mono: source-code-pro, Menlo, Monaco, ...;

  /* Font Sizes */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
}
```

### Spacing

```css
:root {
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */
}
```

### Shadows & Effects

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;

  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}
```

---

## Using CSS Variables in Your Code

### React Components

```jsx
// App.css
.my-button {
  background-color: var(--primary-color);
  color: var(--text-inverse);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.my-button:hover {
  background-color: var(--primary-hover);
  box-shadow: var(--shadow-md);
}
```

### Inline Styles

```jsx
<div style={{
  backgroundColor: 'var(--bg-secondary)',
  padding: 'var(--spacing-lg)',
  borderRadius: 'var(--radius-lg)'
}}>
  Content
</div>
```

### styled-components / Emotion

```jsx
import styled from 'styled-components';

const Button = styled.button`
  background-color: var(--primary-color);
  color: var(--text-inverse);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);

  &:hover {
    background-color: var(--primary-hover);
  }
`;
```

---

## Utility Classes

All themes include utility classes:

### Layout

```html
<div class="container">
  <!-- Centered, max-width container -->
</div>
```

### Text Alignment

```html
<div class="text-center">Centered</div>
<div class="text-left">Left</div>
<div class="text-right">Right</div>
```

### Spacing

```html
<div class="mt-md">Margin top medium</div>
<div class="mb-lg">Margin bottom large</div>
<div class="p-md">Padding medium</div>
```

### Buttons

```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-outline">Outline</button>
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
  </div>
  <p>Card content</p>
</div>
```

### Alerts

```html
<div class="alert alert-success">Success message</div>
<div class="alert alert-warning">Warning message</div>
<div class="alert alert-error">Error message</div>
<div class="alert alert-info">Info message</div>
```

---

## Company Branding Examples

### Example 1: Tech Startup

```css
:root {
  --primary-color: #7c3aed;      /* Purple */
  --secondary-color: #10b981;    /* Green */
  --accent-color: #f59e0b;       /* Amber */

  --font-family-sans: 'Inter', sans-serif;
  --radius-lg: 1rem;             /* More rounded */
}
```

### Example 2: Financial Services

```css
:root {
  --primary-color: #1e40af;      /* Deep Blue */
  --secondary-color: #64748b;    /* Slate Gray */
  --accent-color: #059669;       /* Green (trust) */

  --font-family-sans: 'Georgia', serif;
  --radius-sm: 0.125rem;         /* Subtle rounding */
}
```

### Example 3: Creative Agency

```css
:root {
  --primary-color: #ec4899;      /* Pink */
  --secondary-color: #8b5cf6;    /* Purple */
  --accent-color: #f97316;       /* Orange */

  --font-family-sans: 'Poppins', sans-serif;
  --radius-xl: 1.5rem;           /* Very rounded */
  --shadow-lg: 0 20px 40px rgba(236, 72, 153, 0.2);
}
```

---

## Advanced Features

### Logo & Favicon Support

```json
{
  "branding": {
    "theme": "my-company",
    "logoPath": "./assets/logo.svg",
    "faviconPath": "./assets/favicon.ico"
  }
}
```

When configured, logos and favicons are automatically:
- Copied to the `public/` directory (React)
- Referenced in `index.html`
- Available for use in your app

### Dark Mode Support

Themes can include dark mode variants:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
  }
}
```

### Custom Styles Path

For companies with existing style systems:

```json
{
  "branding": {
    "customStylesPath": "~/company/design-system/global.css"
  }
}
```

---

## Integration with Design Systems

### Material Design

```css
:root {
  --primary-color: #6200ee;
  --secondary-color: #03dac6;
  --error-color: #b00020;
  --radius-md: 4px;
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.14);
}
```

### Bootstrap-like

```css
:root {
  --primary-color: #0d6efd;
  --secondary-color: #6c757d;
  --success-color: #198754;
  --warning-color: #ffc107;
  --error-color: #dc3545;
  --radius-md: 0.375rem;
}
```

### Tailwind CSS Compatible

```css
:root {
  --primary-color: #3b82f6;      /* blue-500 */
  --primary-hover: #2563eb;      /* blue-600 */
  --spacing-md: 1rem;            /* Same as Tailwind p-4 */
  --radius-lg: 0.5rem;           /* Same as rounded-lg */
}
```

---

## Best Practices

### 1. Use CSS Variables Everywhere

```css
/* ❌ BAD: Hardcoded values */
.button {
  background-color: #3b82f6;
  padding: 8px 16px;
}

/* ✅ GOOD: CSS variables */
.button {
  background-color: var(--primary-color);
  padding: var(--spacing-sm) var(--spacing-md);
}
```

### 2. Maintain Accessibility

```css
/* Ensure sufficient contrast */
:root {
  --primary-color: #2563eb;     /* WCAG AA compliant */
  --text-primary: #111827;      /* Strong contrast */
}
```

### 3. Document Your Theme

```css
/**
 * ACME Corporation Design System
 *
 * Primary: #ff6600 (ACME Orange)
 * Secondary: #333333 (ACME Charcoal)
 *
 * Last updated: 2025-01-15
 * Designer: Jane Doe
 */
:root {
  --primary-color: #ff6600;
  /* ... */
}
```

### 4. Test Across Browsers

- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers

---

## Troubleshooting

### Styles Not Applied

**Problem:** CSS variables not working

**Solution:** Ensure `global-styles.css` is imported in `index.css`:

```css
@import './global-styles.css';
```

### Wrong Theme Used

**Problem:** Default theme instead of custom theme

**Solution:** Check configuration hierarchy:
1. CLI override
2. Project `.devtools.json`
3. User `~/.devtools.json`
4. Profile JSON
5. Default

### Colors Not Matching

**Problem:** Colors look different than expected

**Solution:** Check for CSS specificity issues:

```css
/* More specific selector wins */
.my-component button {
  background-color: hardcoded !important;  /* ❌ This overrides everything */
}
```

---

## Migration Guide

### From Existing Projects

**Step 1:** Add global-styles.css to your project

```bash
cp [framework]/src/config/branding/default/styles.css ./src/global-styles.css
```

**Step 2:** Import in your main CSS file

```css
@import './global-styles.css';
```

**Step 3:** Replace hardcoded values with CSS variables

```diff
- background-color: #3b82f6;
+ background-color: var(--primary-color);
```

**Step 4:** Test and adjust

---

## FAQ

### Can I use multiple themes in one organization?

Yes! Different profiles can use different themes:

```json
// default-profile.json
{ "branding": { "theme": "acme-public" } }

// internal-profile.json
{ "branding": { "theme": "acme-internal" } }
```

### Can I override specific variables per project?

Yes, create a project-specific CSS file:

```css
/* src/theme-overrides.css */
:root {
  --primary-color: #custom-color;
}
```

Then import after global-styles.css.

### Does this work with CSS-in-JS?

Yes! CSS variables work with all styling approaches:
- styled-components
- Emotion
- CSS Modules
- Tailwind CSS
- Plain CSS

### Can I share themes across the team?

Yes! Commit the theme to your repository:

```bash
git add src/config/branding/my-company/
git commit -m "Add company branding theme"
git push
```

Team members can then use:

```json
{
  "branding": {
    "theme": "my-company"
  }
}
```

---

## Examples

Complete examples are available in:
- `src/config/branding/default/styles.css` - Generic professional theme
- `src/config/branding/example-company/styles.css` - Company-branded theme

Test them out:

```bash
# Default theme
devtools node init --template react

# Example company theme
# (Edit .devtools.json to set theme first)
devtools node init --template react
```

---

## Summary

The DevTools Framework branding system gives you:

✅ **Consistent Styling** - All projects use the same colors, fonts, spacing
✅ **Zero Setup** - Styles automatically included in every new project
✅ **Full Customization** - Complete control over all design tokens
✅ **Enterprise Ready** - Built for teams and large organizations
✅ **Framework Agnostic** - Works with React, Vue, Angular, vanilla JS

**Next Steps:**
1. Create your company's theme
2. Add it to your DevTools configuration
3. Generate a test project
4. Share with your team!

---

*For questions or support, see the main DevTools Framework documentation.*
