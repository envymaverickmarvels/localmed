# Testing Guide

## Overview

This project uses **Vitest** for unit and integration testing, with **Supertest** for API endpoint testing.

## Test Structure

```
apps/api/tests/
├── setup.ts              # Global test setup and mocks
├── middleware/           # Middleware tests
│   └── auth.test.ts
├── integration/          # API integration tests
│   └── api.test.ts
├── database/             # Database operation tests
│   └── operations.test.ts
└── utils/                # Utility function tests
    └── shared.test.ts
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.ts

# Run integration tests only
npm run test:integration
```

## Writing Tests

### Unit Tests

Unit tests focus on testing individual functions and modules in isolation.

```typescript
import { describe, it, expect } from 'vitest';
import { generateOTP } from '@localmed/shared';

describe('generateOTP', () => {
  it('should generate OTP of specified length', () => {
    const otp = generateOTP(6);
    expect(otp).toHaveLength(6);
  });

  it('should generate numeric OTP', () => {
    const otp = generateOTP(6);
    expect(otp).toMatch(/^\d{6}$/);
  });
});
```

### Integration Tests

Integration tests test multiple components working together.

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupRoutes } from '../../src/routes';

const app = express();
app.use(express.json());
app.use('/api', setupRoutes());

describe('POST /api/auth/send-otp', () => {
  it('should send OTP for valid phone number', async () => {
    const response = await request(app)
      .post('/api/auth/send-otp')
      .send({ phone: '9876543210', purpose: 'LOGIN' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Testing Middleware

```typescript
import { describe, it, expect, vi } from 'vitest';
import { authenticate } from '../../src/middleware/auth';

describe('authenticate middleware', () => {
  it('should pass for valid token', async () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = {};
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
```

## Mocking

### Environment Variables

Environment variables are mocked in `tests/setup.ts`:

```typescript
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
```

### External Services

Use `vi.fn()` to mock external services:

```typescript
import { vi } from 'vitest';
import { smsService } from '../../src/services/external/notification.service';

vi.spyOn(smsService, 'sendSms').mockResolvedValue({ success: true });
```

### Database

For database tests, use transactions and rollback after each test:

```typescript
import { describe, it, beforeEach, afterEach } from 'vitest';
import { getDb } from '../../src/config/database';

describe('User operations', () => {
  let db;

  beforeEach(async () => {
    db = getDb();
    await db.raw('BEGIN');
  });

  afterEach(async () => {
    await db.raw('ROLLBACK');
  });

  it('should create user', async () => {
    // Test with transaction
  });
});
```

## Best Practices

1. **Test isolation**: Each test should be independent
2. **Descriptive names**: Use clear test descriptions
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Test edge cases**: Don't just test happy paths
5. **Clean up**: Reset mocks and state after tests

## Coverage Goals

- **Overall**: 70%+
- **Critical paths**: 90%+ (auth, reservations, payments)
- **Utilities**: 80%+

## CI/CD Integration

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
```