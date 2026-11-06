import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { toPublicUser } from '../utils/user.js';
import type { UserRow } from '../types.js';

export const usersRouter = Router();

usersRouter.get(
  '/check-email',
  asyncHandler(async (req, res) => {
    const email = String(req.query['email'] ?? '').trim().toLowerCase();
    if (!email) {
      res.json({ taken: false });
      return;
    }
    const result = await pool.query('SELECT 1 FROM users WHERE LOWER(email) = $1', [email]);
    res.json({ taken: Boolean(result.rowCount) });
  })
);

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  avatarUrl: z.string().trim().max(2_000_000).nullable().optional()
});

usersRouter.patch(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const { name, phone, avatarUrl } = req.body as z.infer<typeof updateProfileSchema>;
    const result = await pool.query<UserRow>(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING *`,
      [name ?? null, phone ?? null, avatarUrl ?? null, req.user!.id]
    );

    if (!result.rows[0]) {
      throw new HttpError(404, 'User not found.');
    }

    res.json({ user: toPublicUser(result.rows[0]) });
  })
);

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

usersRouter.patch(
  '/me/password',
  requireAuth,
  validateBody(passwordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as z.infer<typeof passwordSchema>;
    const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.id]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new HttpError(400, 'Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      req.user!.id
    ]);
    res.json({ message: 'Password updated successfully.' });
  })
);
