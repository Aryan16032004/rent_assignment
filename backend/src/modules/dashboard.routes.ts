import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { LISTING_SELECT, mapListing, type ListingRow } from './listings.routes.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const [statusCounts, favourites, received, sent, recentListings, recentInquiries] =
      await Promise.all([
        pool.query<{ status: string; count: string }>(
          'SELECT status, COUNT(*)::text AS count FROM listings WHERE owner_id = $1 GROUP BY status',
          [userId]
        ),
        pool.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM favourites WHERE user_id = $1',
          [userId]
        ),
        pool.query<{ status: string; count: string }>(
          `SELECT status, COUNT(*)::text AS count
           FROM inquiries WHERE receiver_id = $1 GROUP BY status`,
          [userId]
        ),
        pool.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM inquiries WHERE sender_id = $1',
          [userId]
        ),
        pool.query<ListingRow>(
          `${LISTING_SELECT} WHERE l.owner_id = $1 ORDER BY l.created_at DESC LIMIT 5`,
          [userId]
        ),
        pool.query<{ id: string; listing_title: string; sender_name: string; status: string; created_at: string }>(
          `SELECT i.id, l.title AS listing_title, u.name AS sender_name, i.status, i.created_at
           FROM inquiries i
           JOIN listings l ON l.id = i.listing_id
           JOIN users u ON u.id = i.sender_id
           WHERE i.receiver_id = $1
           ORDER BY i.created_at DESC
           LIMIT 5`,
          [userId]
        )
      ]);

    const listingCounts: Record<string, number> = {
      total: 0,
      draft: 0,
      pending: 0,
      published: 0,
      rented: 0,
      inactive: 0
    };
    for (const row of statusCounts.rows) {
      listingCounts[row.status] = Number(row.count);
      listingCounts.total += Number(row.count);
    }

    const inquiryCounts: Record<string, number> = {
      received: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      closed: 0,
      sent: Number(sent.rows[0]?.count ?? 0)
    };
    for (const row of received.rows) {
      inquiryCounts[row.status] = Number(row.count);
      inquiryCounts.received += Number(row.count);
    }

    res.json({
      listings: listingCounts,
      favourites: Number(favourites.rows[0]?.count ?? 0),
      inquiries: inquiryCounts,
      recentListings: recentListings.rows.map(mapListing),
      recentInquiries: recentInquiries.rows.map((row) => ({
        id: row.id,
        listingTitle: row.listing_title,
        senderName: row.sender_name,
        status: row.status,
        createdAt: row.created_at
      }))
    });
  })
);
