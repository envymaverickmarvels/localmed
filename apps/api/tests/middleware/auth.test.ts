import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateTokens, authenticate, requireRole } from '../../src/middleware/auth';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

// Mock user
const mockUser = {
  id: 'user-123',
  role: 'USER',
  sessionId: 'session-123',
};

describe('Auth Middleware', () => {
  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const { accessToken, refreshToken } = generateTokens(mockUser, 'session-123');

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // Verify access token
      const decodedAccess = jwt.verify(accessToken, config.JWT_SECRET);
      expect(decodedAccess).toMatchObject({
        userId: mockUser.id,
        role: mockUser.role,
        sessionId: 'session-123',
      });

      // Verify refresh token
      const decodedRefresh = jwt.verify(refreshToken, config.JWT_SECRET);
      expect(decodedRefresh).toMatchObject({
        userId: mockUser.id,
        role: mockUser.role,
        sessionId: 'session-123',
      });
    });
  });

  describe('authenticate', () => {
    it('should pass for valid token', async () => {
      const { accessToken } = generateTokens(mockUser, 'session-123');

      const req = {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      };
      const res = {};
      const next = vi.fn();

      await authenticate(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeDefined();
      expect((req as any).user.userId).toBe(mockUser.id);
    });

    it('should fail for missing token', async () => {
      const req = { headers: {} };
      const res = {};
      const next = vi.fn();

      await authenticate(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should fail for invalid token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };
      const res = {};
      const next = vi.fn();

      await authenticate(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('requireRole', () => {
    it('should pass for matching role', () => {
      const req = { user: { role: 'ADMIN' } };
      const res = {};
      const next = vi.fn();

      const middleware = requireRole('ADMIN');
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should pass for any of matching roles', () => {
      const req = { user: { role: 'PHARMACY_OWNER' } };
      const res = {};
      const next = vi.fn();

      const middleware = requireRole('ADMIN', 'PHARMACY_OWNER');
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should fail for non-matching role', () => {
      const req = { user: { role: 'USER' } };
      const res = {};
      const next = vi.fn();

      const middleware = requireRole('ADMIN');
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});