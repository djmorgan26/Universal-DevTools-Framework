# Node.js Development Standards

This project was initialized with DevTools Framework. Follow these standards for consistency and best practices.

## Package Management

### Using npm
- **Install packages**: `npm install <package>`
- **Add to dependencies**: `npm install --save <package>`
- **Add to devDependencies**: `npm install --save-dev <package>`
- **Update package.json**: Always keep package.json in sync with installed packages

### DevTools Commands
- **Add dependencies**: `devtools node add <package>` (auto-updates package.json)
- **Remove dependencies**: `devtools node remove <package>`
- **Check environment**: `devtools node check`

## Code Quality Standards

### Module System
```javascript
// Use CommonJS for Node.js projects
const express = require('express');
const { Router } = require('express');

// Use ES Modules when explicitly configured
import express from 'express';
import { Router } from 'express';
```

### Error Handling
```javascript
// Always handle errors in async functions
async function fetchData() {
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    console.error('Failed to fetch data:', error.message);
    throw error; // Re-throw if caller should handle
  }
}

// Use proper error middleware in Express
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### Async/Await Best Practices
```javascript
// ✅ GOOD: Use async/await for cleaner code
async function processUser(userId) {
  const user = await fetchUser(userId);
  const orders = await fetchOrders(user.id);
  return { user, orders };
}

// ✅ GOOD: Use Promise.all for parallel operations
async function fetchUserData(userId) {
  const [user, orders, profile] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchProfile(userId)
  ]);
  return { user, orders, profile };
}

// ❌ BAD: Don't mix callbacks and promises
function badExample(callback) {
  someAsyncOperation().then(result => {
    callback(null, result); // Mixing paradigms
  });
}
```

### Environment Variables
```javascript
// Load environment variables at startup
require('dotenv').config();

// Access with fallbacks
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_KEY = process.env.API_KEY;

// Validate required variables
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

### Logging
```javascript
// Use console for simple logging
console.log('Server started on port', PORT);
console.error('Error occurred:', error.message);
console.warn('Deprecated feature used');

// For production, consider structured logging
const logger = {
  info: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, ...meta })),
  error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, ...meta })),
  warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta }))
};
```

## Express.js Best Practices

### Application Structure
```
src/
├── server.js           # Main server file
├── routes/             # Route handlers
│   ├── health.js
│   ├── users.js
│   └── index.js
├── middleware/         # Custom middleware
├── controllers/        # Business logic
├── models/            # Data models
└── utils/             # Utility functions
```

### Middleware Order
```javascript
const express = require('express');
const app = express();

// 1. Security middleware first
app.use(helmet());

// 2. Logging
app.use(morgan('combined'));

// 3. CORS
app.use(cors());

// 4. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Routes
app.use('/api/users', userRoutes);
app.use('/health', healthRoutes);

// 6. 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 7. Error handler (last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### Route Organization
```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const users = await fetchUsers();
    res.json(users);
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

module.exports = { userRouter: router };
```

## Testing Standards

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/*.test.js'
  ]
};
```

### Test Structure
```javascript
describe('User API', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Mock error scenario
      jest.spyOn(db, 'query').mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/api/users');
      expect(response.status).toBe(500);
    });
  });
});
```

### Integration Testing with Supertest
```javascript
const request = require('supertest');
const { app } = require('../src/server');

describe('Health Check', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
```

## Security Best Practices

### Input Validation
```javascript
// Validate and sanitize input
const { body, validationResult } = require('express-validator');

app.post('/users',
  body('email').isEmail().normalizeEmail(),
  body('age').isInt({ min: 0, max: 120 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Process validated input
  }
);
```

### Secrets Management
```javascript
// ❌ NEVER commit secrets
const API_KEY = 'hardcoded-key-123'; // WRONG

// ✅ Use environment variables
const API_KEY = process.env.API_KEY;

// ✅ Keep .env out of version control
// .gitignore should include:
// .env
// .env.local
```

### Dependencies
```javascript
// Regularly update dependencies
// npm update
// npm audit fix

// Pin versions for production
// Use package-lock.json
```

## Performance Optimization

### Async Operations
```javascript
// ✅ GOOD: Parallel independent operations
const [users, products, orders] = await Promise.all([
  fetchUsers(),
  fetchProducts(),
  fetchOrders()
]);

// ❌ BAD: Sequential when not needed
const users = await fetchUsers();
const products = await fetchProducts();
const orders = await fetchOrders();
```

### Caching
```javascript
// Simple in-memory cache
const cache = new Map();

async function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const data = await fetchData(key);
  cache.set(key, data);
  return data;
}
```

### Connection Pooling
```javascript
// Reuse database connections
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000
});
```

## Documentation

### Code Comments
```javascript
/**
 * Fetch user by ID
 * @param {string} userId - The user's unique identifier
 * @returns {Promise<Object>} User object
 * @throws {Error} If user not found
 */
async function fetchUser(userId) {
  // Implementation
}
```

### README Requirements
- Project description
- Installation instructions
- Configuration options
- API documentation
- Example usage

## Git Practices

### Commit Messages
```
feat: add user authentication endpoint
fix: resolve memory leak in connection pooling
docs: update API documentation
test: add integration tests for orders
refactor: simplify error handling middleware
```

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

## AI Assistant Guidelines

When working with AI assistants (Copilot, Cursor, Claude):

1. **Use this file as context** - AI will follow these standards
2. **Leverage autocomplete** - For boilerplate and patterns
3. **Review generated code** - Always verify correctness
4. **Test thoroughly** - AI code needs testing like any other
5. **Ask for explanations** - Understand what the AI generates

## Additional Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [npm Documentation](https://docs.npmjs.com/)

---

**Remember**: These standards ensure consistency, maintainability, and quality across the codebase. Follow them to build robust Node.js applications.
