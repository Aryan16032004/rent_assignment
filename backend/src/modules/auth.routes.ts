import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { toPublicUser } from '../utils/user.js';
import type { UserRow } from '../types.js';

/**
 * Authentication Routes Router
 * Handles user registration with password hashing, login authentication, and active session retrieval.
 */
export const authRouter = Router();

// Allowed role types
const roleSchema = z.enum(['renter', 'landlord', 'both']);

// Registration input validation schema
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: roleSchema.default('renter')
});

// Login input validation schema
const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

/**
 * POST /api/auth/register
 * Creates a new user account, securely hashes the password with bcrypt (cost factor 12),
 * and returns the authenticated user object with a signed JWT session token.
 */
authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body as z.infer<typeof registerSchema>;
    const normalizedEmail = email.toLowerCase();

    // Verify email uniqueness before hashing
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [
      normalizedEmail
    ]);
    if (existing.rowCount) {
      throw new HttpError(409, 'Email already exists.');
    }

    // Secure one-way salt and hash of the user password
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, normalizedEmail, passwordHash, role]
    );

    const user = result.rows[0];
    res.status(201).json({
      user: toPublicUser(user),
      token: signToken({ id: user.id, role: user.role })
    });
  })
);

/**
 * POST /api/auth/login
 * Validates user credentials against stored bcrypt hash and returns a signed JWT token.
 */
authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await pool.query<UserRow>('SELECT * FROM users WHERE LOWER(email) = $1', [
      email.toLowerCase()
    ]);
    const user = result.rows[0];

    // Constant-time compare or failure to prevent user enumeration
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, 'Invalid email or password.');
    }

    res.json({
      user: toPublicUser(user),
      token: signToken({ id: user.id, role: user.role })
    });
  })
);

/**
 * GET /api/auth/me
 * Restores session user state using the Bearer JWT token in request headers.
 */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.id]);
    if (!result.rows[0]) {
      throw new HttpError(401, 'Session user no longer exists.');
    }
    res.json({ user: toPublicUser(result.rows[0]) });
  })
);
