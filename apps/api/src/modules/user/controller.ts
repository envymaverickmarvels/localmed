import { Request, Response } from 'express';
import { getDb } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../middleware/error-handling';

// Get current user profile
export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  const userProfile = await db('users')
    .where({ id: user.userId })
    .first();

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
    const existing = await db('users').where({ email }).whereNot({ id: user.userId }).first();
    if (existing) {
      throw BadRequestError('Email already in use');
    }
    updates.email = email;
    updates.is_email_verified = false;
  }

  await db('users').where({ id: user.userId }).update(updates);

  const updated = await db('users').where({ id: user.userId }).first();

  res.json({
    success: true,
    data: {
      id: updated.id,
      phone: updated.phone,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    },
  });
}

// Delete account
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const db = getDb();

  // Soft delete by deactivating
  await db('users').where({ id: user.userId }).update({
    is_active: false,
    updated_at: new Date(),
  });

  // Invalidate all sessions
  await db('sessions').where({ user_id: user.userId }).delete();

  res.json({
    success: true,
    data: { message: 'Account deactivated successfully' },
  });
}

// Get user by ID
export async function getUserById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const db = getDb();

  const user = await db('users').where({ id }).first();

  if (!user) {
    throw NotFoundError('User');
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      isPhoneVerified: user.is_phone_verified,
      isEmailVerified: user.is_email_verified,
      createdAt: user.created_at,
    },
  });
}