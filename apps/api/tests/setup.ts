import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-super-secret-jwt-key-at-least-32-characters';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/localmed_test';
process.env.REDIS_URL = 'redis://localhost:6380';
process.env.PORT = '3001';

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

beforeAll(async () => {
  // Setup test database, redis, etc.
});

afterAll(async () => {
  // Cleanup test resources
});