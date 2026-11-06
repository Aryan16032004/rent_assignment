import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';

/**
 * Landlord & Renter Inquiries Router
 * Manages direct tenant-to-landlord inquiries, conversation replies, and status transitions.
 */
export const inquiriesRouter = Router();

interface InquiryRow {
  id: string;
  listing_id: string;
  listing_title: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const INQUIRY_SELECT = `
  SELECT i.*, l.title AS listing_title,
    sender.name AS sender_name,
    receiver.name AS receiver_name
  FROM inquiries i
  JOIN listings l ON l.id = i.listing_id
  JOIN users sender ON sender.id = i.sender_id
  JOIN users receiver ON receiver.id = i.receiver_id
`;

function mapInquiry(row: InquiryRow) {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    fromUserId: row.sender_id,
    fromUserName: row.sender_name,
    toUserId: row.receiver_id,
    toUserName: row.receiver_name,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const inquirySchema = z.object({
  message: z.string().trim().min(10).max(2000)
});

inquiriesRouter.post(
  '/listings/:id/inquiries',
  requireAuth,
  validateBody(inquirySchema),
  asyncHandler(async (req, res) => {
    const listingId = String(req.params['id']);
    const listing = await pool.query<{ owner_id: string }>(
      'SELECT owner_id FROM listings WHERE id = $1',
      [listingId]
    );
    if (!listing.rows[0]) {
      throw new HttpError(404, 'Listing not found.');
    }
    if (listing.rows[0].owner_id === req.user!.id) {
      throw new HttpError(400, 'You cannot send an inquiry for your own listing.');
    }

    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO inquiries (listing_id, sender_id, receiver_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [listingId, req.user!.id, listing.rows[0].owner_id, req.body.message]
    );

    const created = await pool.query<InquiryRow>(`${INQUIRY_SELECT} WHERE i.id = $1`, [
      inserted.rows[0].id
    ]);
    res.status(201).json(mapInquiry(created.rows[0]));
  })
);

inquiriesRouter.get(
  '/inquiries/received',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query<InquiryRow>(
      `${INQUIRY_SELECT}
       WHERE i.receiver_id = $1
       ORDER BY i.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows.map(mapInquiry));
  })
);

inquiriesRouter.get(
  '/inquiries/sent',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query<InquiryRow>(
      `${INQUIRY_SELECT}
       WHERE i.sender_id = $1
       ORDER BY i.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows.map(mapInquiry));
  })
);

inquiriesRouter.get(
  '/inquiries/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query<InquiryRow>(`${INQUIRY_SELECT} WHERE i.id = $1`, [
      String(req.params['id'])
    ]);
    const inquiry = result.rows[0];
    if (!inquiry) {
      throw new HttpError(404, 'Inquiry not found.');
    }
    if (inquiry.sender_id !== req.user!.id && inquiry.receiver_id !== req.user!.id) {
      throw new HttpError(403, 'You cannot access this inquiry.');
    }

    const messages = await pool.query<{
      id: string;
      sender_id: string;
      sender_name: string;
      message: string;
      created_at: string;
    }>(
      `SELECT m.*, u.name AS sender_name
       FROM inquiry_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.inquiry_id = $1
       ORDER BY m.created_at ASC`,
      [inquiry.id]
    );

    res.json({
      ...mapInquiry(inquiry),
      messages: messages.rows.map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        message: message.message,
        createdAt: message.created_at
      }))
    });
  })
);

inquiriesRouter.post(
  '/inquiries/:id/messages',
  requireAuth,
  validateBody(inquirySchema),
  asyncHandler(async (req, res) => {
    const inquiryId = String(req.params['id']);
    const inquiry = await pool.query<{ sender_id: string; receiver_id: string }>(
      'SELECT sender_id, receiver_id FROM inquiries WHERE id = $1',
      [inquiryId]
    );
    const row = inquiry.rows[0];
    if (!row) {
      throw new HttpError(404, 'Inquiry not found.');
    }
    if (row.sender_id !== req.user!.id && row.receiver_id !== req.user!.id) {
      throw new HttpError(403, 'You cannot reply to this inquiry.');
    }

    const result = await pool.query(
      `INSERT INTO inquiry_messages (inquiry_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, message, created_at`,
      [inquiryId, req.user!.id, req.body.message]
    );
    res.status(201).json(result.rows[0]);
  })
);

inquiriesRouter.patch(
  '/inquiries/:id/status',
  requireAuth,
  validateBody(z.object({ status: z.enum(['pending', 'accepted', 'rejected', 'closed']) })),
  asyncHandler(async (req, res) => {
    const inquiryId = String(req.params['id']);
    const inquiry = await pool.query<{ receiver_id: string }>(
      'SELECT receiver_id FROM inquiries WHERE id = $1',
      [inquiryId]
    );
    if (!inquiry.rows[0]) {
      throw new HttpError(404, 'Inquiry not found.');
    }
    if (inquiry.rows[0].receiver_id !== req.user!.id) {
      throw new HttpError(403, 'Only the recipient can update the inquiry status.');
    }

    await pool.query('UPDATE inquiries SET status = $1 WHERE id = $2', [
      req.body.status,
      inquiryId
    ]);
    const result = await pool.query<InquiryRow>(`${INQUIRY_SELECT} WHERE i.id = $1`, [
      inquiryId
    ]);
    res.json(mapInquiry(result.rows[0]));
  })
);
