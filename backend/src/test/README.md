# Testing Framework

This directory contains the comprehensive testing framework for the AI Language Learning backend application.

## Test Structure

```
src/test/
├── setup.ts                 # Test environment setup and teardown
├── helpers/                 # Test utilities and helper functions
│   └── testHelpers.ts      # Common test utilities
├── factories/               # Test data factories
│   ├── userFactory.ts      # User test data generation
│   ├── practiceFactory.ts  # Practice test data generation
│   └── vocabularyFactory.ts # Vocabulary test data generation
├── unit/                    # Unit tests
│   ├── auth.test.ts        # Authentication unit tests
│   └── practice.test.ts    # Practice unit tests
├── property/                # Property-based tests
│   ├── userDataConsistency.test.ts    # User data consistency properties
│   └── vocabularyManagement.test.ts   # Vocabulary management properties
└── integration/             # Integration tests (to be added)
```

## Test Types

### 1. Unit Tests
Test individual components and functions in isolation.

**Location**: `src/test/unit/`
**Run**: `npm run test:unit`

Example:
```typescript
describe('AuthController', () => {
  it('should register a new user', async () => {
    // Test implementation
  });
});
```

### 2. Property-Based Tests
Test universal properties that should hold across all valid inputs using fast-check.

**Location**: `src/test/property/`
**Run**: `npm run test:property`

Example:
```typescript
/**
 * **Feature: ai-language-learning-app, Property 1: 用户数据一致性**
 * **Validates: Requirements 1.2, 1.4**
 */
it('should maintain user data consistency', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({ username: fc.string(), email: fc.emailAddress() }),
      async (userData) => {
        // Property test implementation
      }
    ),
    { numRuns: 100 }
  );
});
```

### 3. Integration Tests
Test component interactions and API endpoints.

**Location**: `src/test/integration/`
**Run**: `npm run test:integration`

## Test Environment

### Database
- Uses a separate test database: `ai_language_learning_test`
- Automatically cleaned between tests
- Migrations run automatically during setup

### Redis
- Uses Redis database 1 for tests (production uses database 0)
- Automatically flushed between tests

### Configuration
- Test-specific environment variables in `.env.test`
- Isolated from development and production environments

## Test Data Factories

Factories provide consistent, customizable test data generation:

```typescript
// Create a test user
const user = await UserFactory.create({
  username: 'testuser',
  email: 'test@example.com'
});

// Create multiple users
const users = await UserFactory.createMany(5);

// Create admin user
const admin = await UserFactory.createAdmin();
```

## Property-Based Testing Guidelines

1. **Annotation Format**: Each property test must include:
   ```typescript
   /**
    * **Feature: {feature_name}, Property {number}: {property_text}**
    * **Validates: Requirements {requirement_numbers}**
    */
   ```

2. **Minimum Iterations**: Run at least 100 iterations for comprehensive coverage
3. **Input Validation**: Ensure generators produce valid inputs for the domain
4. **Clear Properties**: Test universal properties, not specific examples

## Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:property
npm run test:integration

# Run tests in watch mode
npm run test:unit:watch
npm run test:property:watch

# Run with coverage
npm run test:coverage
```

## Test Helpers

The `TestHelpers` class provides utilities for:
- JWT token generation
- Database operations
- Mock object creation
- Response assertions
- Random data generation

Example:
```typescript
const user = await UserFactory.create();
const token = TestHelpers.generateAuthToken(user);
await TestHelpers.insertUser(user);

const req = TestHelpers.createMockRequest({ user });
const res = TestHelpers.createMockResponse();
```

## Coverage Requirements

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Database and Redis are automatically cleaned between tests
3. **Factories**: Use factories for consistent test data generation
4. **Properties**: Focus on universal properties that should always hold
5. **Assertions**: Use descriptive assertions that clearly indicate what failed
6. **Async**: Always await async operations in tests

## Adding New Tests

1. **Unit Tests**: Add to `src/test/unit/` for testing individual components
2. **Property Tests**: Add to `src/test/property/` for testing universal properties
3. **Factories**: Add new factories to `src/test/factories/` for new data types
4. **Helpers**: Extend `TestHelpers` for common testing utilities

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check test database exists: `ai_language_learning_test`
- Verify connection settings in `.env.test`

### Redis Connection Issues
- Ensure Redis is running
- Test uses database 1 (not default database 0)
- Check Redis connection settings

### Test Timeouts
- Property-based tests have 30-second timeout
- Increase timeout in `jest.config.js` if needed
- Check for infinite loops in test logic