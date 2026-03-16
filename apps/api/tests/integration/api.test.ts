import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupRoutes } from '../../src/routes';
import { errorHandler } from '../../src/middleware/error-handling';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', setupRoutes());
app.use(errorHandler);

describe('Auth API', () => {
  describe('POST /api/auth/send-otp', () => {
    it('should send OTP for valid phone number', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({
          phone: '9876543210',
          purpose: 'LOGIN',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBeDefined();
    });

    it('should reject invalid phone number', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({
          phone: '12345',
          purpose: 'LOGIN',
        });

      expect(response.status).toBe(400);
    });

    it('should reject missing phone number', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({
          purpose: 'LOGIN',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should reject invalid OTP format', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '9876543210',
          otp: '123', // Invalid: not 6 digits
        });

      expect(response.status).toBe(400);
    });

    it('should reject non-existent OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          phone: '9876543210',
          otp: '123456',
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('Medicine API', () => {
  describe('GET /api/medicines/search', () => {
    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/medicines/search');

      expect(response.status).toBe(400);
    });

    it('should search medicines with valid query', async () => {
      const response = await request(app)
        .get('/api/medicines/search?q=paracetamol&page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.medicines).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });
  });
});

describe('Health Check', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});