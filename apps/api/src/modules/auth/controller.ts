import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { config, jwtConfig, otpConfig } from '../../config';
import { getDb } from '../../config/database';
import { getRedis } from '../../config/redis';
import { HttpError, BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../../middleware/error-handling';
import { generateOTP, isValidIndianPhone } from '@localmed/shared';

interface SendOtpRequest {
  phone: string;
  purpose: 'LOGIN' | 'REGISTRATION' | 'PASSWORD_RESET' | 'PHONE_VERIFY';
}

interface VerifyOtpRequest {
  phone: string;
  otp: string;
  name?: string;
  email?: string;
}

interface RegisterRequest {
  phone: string;
  name: string;
  email?: string;
  role: 'USER' | 'PHARMACY_OWNER' | 'RIDER';
}

interface LoginRequest {
  phone: string;
  password?: string;
}

interface AuthenticatedUser {
  userId: string;
  role: string;
  phone: string;
  name: string | null;
}

// Generate JWT tokens
function generateTokens(user: { id: string; role: string }, sessionId: string) {
  const payload = { userId: user.id, role: user.role, sessionId };

  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: jwtConfig.expiresIn,
  });

  const refreshToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

// Store session in Redis
async function createSession(userId: string, sessionId: string, userAgent?: string, ip?: string) {
  const redis = getRedis();
  const sessionKey = `session:${userId}:${sessionId}`;
  const sessionData = {
    userAgent,
    ip,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  // Store session for refresh token duration (30 days by default)
  const refreshExpiresInSeconds = 30 * 24 * 60 * 60;
  await redis.setex(sessionKey, refreshExpiresInSeconds, JSON.stringify(sessionData));

  // Also store in database for audit
  await getDb()('sessions').insert({
    id: sessionId,
    user_id: userId,
    device_info: userAgent,
    ip_address: ip,
    expires_at: new Date(Date.now() + refreshExpiresInSeconds * 1000),
  });
}

// Hash OTP for storage
async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

// Verify OTP hash
async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

// Send OTP
export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { phone, purpose } = req.body as SendOtpRequest;

  // Validate phone number
  if (!isValidIndianPhone(phone)) {
    throw BadRequestError('Invalid phone number format');
  }

  const db = getDb();
  const redis = getRedis();

  // Check rate limiting
  const rateLimitKey = `otp:ratelimit:${phone}`;
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) {
    await redis.expire(rateLimitKey, 300); // 5 minute window
  }
  if (attempts > 3) {
    throw HttpError(429, 'RATE_LIMIT_EXCEEDED', 'Too many OTP requests. Please try again later.');
  }

  // Check if user exists for registration
  if (purpose === 'REGISTRATION') {
    const existingUser = await db('users').where({ phone }).first();
    if (existingUser) {
      throw ConflictError('User already exists with this phone number');
    }
  }

  // Generate OTP
  const otp = generateOTP(otpConfig.length);
  const otpHash = await hashOtp(otp);

  // Store OTP hash
  const otpId = uuidv4();
  await db('otp_verifications').insert({
    id: otpId,
    phone,
    otp_hash: otpHash,
    purpose,
    expires_at: new Date(Date.now() + otpConfig.expirySeconds * 1000),
  });

  // In production, send OTP via SMS (MSG91/Twilio)
  // For development, log the OTP
  if (config.isDevelopment) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
  }

  // Store OTP in Redis for quick verification
  const otpKey = `otp:${phone}:${purpose}`;
  await redis.setex(otpKey, otpConfig.expirySeconds, otpHash);

  res.json({
    success: true,
    data: {
      message: 'OTP sent successfully',
      expiresIn: otpConfig.expirySeconds,
      // Only in development
      ...(config.isDevelopment && { otp }),
    },
  });
}

// Verify OTP
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, otp, name, email } = req.body as VerifyOtpRequest;

  const db = getDb();
  const redis = getRedis();

  // Get stored OTP from Redis
  const otpKey = `otp:${phone}:LOGIN`;
  const storedHash = await redis.get(otpKey);

  if (!storedHash) {
    throw BadRequestError('OTP expired or not found');
  }

  // Verify OTP
  const isValid = await verifyOtpHash(otp, storedHash);
  if (!isValid) {
    // Increment attempts
    const otpRecord = await db('otp_verifications')
      .where({ phone, is_verified: false })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    if (otpRecord) {
      await db('otp_verifications')
        .where({ id: otpRecord.id })
        .increment('attempts', 1);

      if (otpRecord.attempts + 1 >= otpRecord.max_attempts) {
        await redis.del(otpKey);
        throw UnauthorizedError('Maximum OTP attempts exceeded. Please request a new OTP.');
      }
    }

    throw UnauthorizedError('Invalid OTP');
  }

  // Check if user exists
  let user = await db('users').where({ phone }).first();

  if (!user) {
    // Create new user (registration flow)
    if (!name) {
      throw BadRequestError('Name is required for registration');
    }

    const userId = uuidv4();
    await db('users').insert({
      id: userId,
      phone,
      name,
      email: email || null,
      role: 'USER',
      is_phone_verified: true,
    });

    user = await db('users').where({ id: userId }).first();
  } else {
    // Update phone verification status
    await db('users').where({ id: user.id }).update({ is_phone_verified: true });
  }

  // Delete used OTP
  await redis.del(otpKey);

  // Mark OTP as verified
  await db('otp_verifications')
    .where({ phone, otp_hash: storedHash })
    .update({ is_verified: true });

  // Create session and generate tokens
  const sessionId = uuidv4();
  await createSession(user.id, sessionId, req.headers['user-agent'], req.ip);

  const { accessToken, refreshToken } = generateTokens(user, sessionId);

  // Update last login
  await db('users').where({ id: user.id }).update({ last_login_at: new Date() });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
      isNewUser: !user.name, // If name wasn't set, it's a new user
    },
  });
}

// Register with password
export async function register(req: Request, res: Response): Promise<void> {
  const { phone, name, email, role } = req.body as RegisterRequest;

  const db = getDb();

  // Check if user exists
  const existingUser = await db('users').where({ phone }).first();
  if (existingUser) {
    throw ConflictError('User already exists with this phone number');
  }

  // Create user
  const userId = uuidv4();
  await db('users').insert({
    id: userId,
    phone,
    name,
    email: email || null,
    role,
    is_phone_verified: false,
  });

  const user = await db('users').where({ id: userId }).first();

  // Create session
  const sessionId = uuidv4();
  await createSession(user.id, sessionId, req.headers['user-agent'], req.ip);

  const { accessToken, refreshToken } = generateTokens(user, sessionId);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
}

// Login with password (alternative to OTP)
export async function login(req: Request, res: Response): Promise<void> {
  const { phone, password } = req.body as LoginRequest;

  const db = getDb();

  const user = await db('users').where({ phone }).first();
  if (!user) {
    throw UnauthorizedError('Invalid credentials');
  }

  if (!user.password_hash && !password) {
    throw BadRequestError('Please use OTP login for this account');
  }

  if (password && user.password_hash) {
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw UnauthorizedError('Invalid credentials');
    }
  }

  if (!user.is_active) {
    throw UnauthorizedError('Account is deactivated');
  }

  // Create session
  const sessionId = uuidv4();
  await createSession(user.id, sessionId, req.headers['user-agent'], req.ip);

  const { accessToken, refreshToken } = generateTokens(user, sessionId);

  // Update last login
  await db('users').where({ id: user.id }).update({ last_login_at: new Date() });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
}

// Refresh token
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as { userId: string; role: string; sessionId: string };
    const redis = getRedis();

    // Verify session exists
    const sessionKey = `session:${decoded.userId}:${decoded.sessionId}`;
    const sessionExists = await redis.exists(sessionKey);

    if (!sessionExists) {
      throw UnauthorizedError('Session expired');
    }

    const db = getDb();
    const user = await db('users').where({ id: decoded.userId }).first();

    if (!user || !user.is_active) {
      throw UnauthorizedError('User not found or inactive');
    }

    // Generate new tokens
    const newSessionId = uuidv4();
    await createSession(user.id, newSessionId, req.headers['user-agent'], req.ip);

    // Delete old session
    await redis.del(sessionKey);
    await db('sessions').where({ id: decoded.sessionId }).delete();

    const tokens = generateTokens(user, newSessionId);

    res.json({
      success: true,
      data: tokens,
    });
  } catch {
    throw UnauthorizedError('Invalid refresh token');
  }
}

// Logout
export async function logout(req: Request, res: Response): Promise<void> {
  const { allDevices } = req.body;
  const user = (req as any).user;
  const sessionId = user.sessionId;

  const db = getDb();
  const redis = getRedis();

  if (allDevices) {
    // Delete all sessions for this user
    await db('sessions').where({ user_id: user.userId }).delete();
    // Delete all Redis sessions
    const pattern = `session:${user.userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } else {
    // Delete current session only
    await db('sessions').where({ id: sessionId }).delete();
    await redis.del(`session:${user.userId}:${sessionId}`);
  }

  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
}

// Get current user profile
export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  const userProfile = await db('users').where({ id: user.userId }).first();

  if (!userProfile) {
    throw NotFoundError('User');
  }

  res.json({
    success: true,
    data: {
      id: userProfile.id,
      phone: userProfile.phone,
      email: userProfile.email,
      name: userProfile.name,
      role: userProfile.role,
      isPhoneVerified: userProfile.is_phone_verified,
      isEmailVerified: userProfile.is_email_verified,
      createdAt: userProfile.created_at,
    },
  });
}

// Update profile
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { name, email } = req.body;

  const db = getDb();

  const updates: Record<string, any> = { updated_at: new Date() };
  if (name) updates.name = name;
  if (email) {
    // Check if email is already used
    const existingEmail = await db('users').where({ email }).whereNot({ id: user.userId }).first();
    if (existingEmail) {
      throw ConflictError('Email already in use');
    }
    updates.email = email;
    updates.is_email_verified = false;
  }

  await db('users').where({ id: user.userId }).update(updates);

  const updatedUser = await db('users').where({ id: user.userId }).first();

  res.json({
    success: true,
    data: {
      id: updatedUser.id,
      phone: updatedUser.phone,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    },
  });
}

// Change password
export async function changePassword(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  const db = getDb();
  const userProfile = await db('users').where({ id: user.userId }).first();

  if (!userProfile) {
    throw NotFoundError('User');
  }

  // Verify current password
  if (userProfile.password_hash) {
    const isValid = await bcrypt.compare(currentPassword, userProfile.password_hash);
    if (!isValid) {
      throw UnauthorizedError('Current password is incorrect');
    }
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await db('users').where({ id: user.userId }).update({ password_hash: newPasswordHash });

  res.json({
    success: true,
    data: { message: 'Password changed successfully' },
  });
}

// Send phone verification
export async function sendPhoneVerification(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  // Reuse sendOtp logic
  req.body = { phone: user.phone, purpose: 'PHONE_VERIFY' };
  await sendOtp(req, res);
}

// Send email verification
export async function sendEmailVerification(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  const userProfile = await db('users').where({ id: user.userId }).first();
  if (!userProfile?.email) {
    throw BadRequestError('No email address associated with account');
  }

  // In production, send verification email
  // For now, just mark as verified in development
  if (config.isDevelopment) {
    await db('users').where({ id: user.userId }).update({ is_email_verified: true });
  }

  res.json({
    success: true,
    data: { message: 'Verification email sent' },
  });
}

// Get sessions
export async function getSessions(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  const sessions = await db('sessions')
    .where({ user_id: user.userId, is_active: true })
    .orderBy('last_activity_at', 'desc');

  res.json({
    success: true,
    data: sessions.map(s => ({
      id: s.id,
      deviceInfo: s.device_info,
      ipAddress: s.ip_address,
      lastActivity: s.last_activity_at,
      createdAt: s.created_at,
    })),
  });
}

// Revoke session
export async function revokeSession(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const { sessionId } = req.params;
  const db = getDb();
  const redis = getRedis();

  const session = await db('sessions').where({ id: sessionId, user_id: user.userId }).first();
  if (!session) {
    throw NotFoundError('Session');
  }

  await db('sessions').where({ id: sessionId }).update({ is_active: false });
  await redis.del(`session:${user.userId}:${sessionId}`);

  res.json({
    success: true,
    data: { message: 'Session revoked successfully' },
  });
}