import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';

export const commentsRouter = Router();

interface CommentRow {
  id: string;
  listing_id: string;
  author_id: string;
  author_name: string;
  parent_id: string | null;
  content: string;
  created_at: string;
}

const COMMENT_SELECT = `
  SELECT c.*, u.name AS author_name
  FROM comments c
  JOIN users u ON u.id = c.author_id
`;

function mapComment(row: CommentRow) {
  return {
    id: row.id,
    listingId: row.listing_id,
    authorId: row.author_id,
    authorName: row.author_name,
    parentId: row.parent_id,
    text: row.content,
    createdAt: row.created_at
  };
}

commentsRouter.get(
  '/listings/:id/comments',
  asyncHandler(async (req, res) => {
    const result = await pool.query<CommentRow>(
      `${COMMENT_SELECT}
       WHERE c.listing_id = $1
       ORDER BY c.created_at ASC`,
      [String(req.params['id'])]
    );
    res.json(result.rows.map(mapComment));
  })
);

const commentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().uuid().nullable().optional()
});

commentsRouter.post(
  '/listings/:id/comments',
  requireAuth,
  validateBody(commentSchema),
  asyncHandler(async (req, res) => {
    const listingId = String(req.params['id']);
    const listing = await pool.query('SELECT 1 FROM listings WHERE id = $1', [listingId]);
    if (!listing.rowCount) {
      throw new HttpError(404, 'Listing not found.');
    }

    if (req.body.parentId) {
      const parent = await pool.query<{ listing_id: string }>(
        'SELECT listing_id FROM comments WHERE id = $1',
        [req.body.parentId]
      );
      if (!parent.rows[0] || parent.rows[0].listing_id !== listingId) {
        throw new HttpError(400, 'The comment you are replying to does not exist.');
      }
    }

    const result = await pool.query<{ id: string }>(
      `INSERT INTO comments (listing_id, author_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [listingId, req.user!.id, req.body.parentId ?? null, req.body.content]
    );

    const created = await pool.query<CommentRow>(`${COMMENT_SELECT} WHERE c.id = $1`, [
      result.rows[0].id
    ]);
    res.status(201).json(mapComment(created.rows[0]));
  })
);

commentsRouter.delete(
  '/comments/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const commentId = String(req.params['id']);
    const result = await pool.query<{ author_id: string; listing_id: string }>(
      'SELECT author_id, listing_id FROM comments WHERE id = $1',
      [commentId]
    );
    const comment = result.rows[0];
    if (!comment) {
      throw new HttpError(404, 'Comment not found.');
    }

    const listing = await pool.query<{ owner_id: string }>(
      'SELECT owner_id FROM listings WHERE id = $1',
      [comment.listing_id]
    );
    const isOwner = listing.rows[0]?.owner_id === req.user!.id;
    if (comment.author_id !== req.user!.id && !isOwner) {
      throw new HttpError(403, 'You cannot delete this comment.');
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ message: 'Comment deleted.' });
  })
);
