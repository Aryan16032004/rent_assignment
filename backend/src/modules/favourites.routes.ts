import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { LISTING_SELECT, mapListing, type ListingRow } from './listings.routes.js';

export const favouritesRouter = Router();

favouritesRouter.get(
  '/favourites',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query<ListingRow>(
      `${LISTING_SELECT}
       JOIN favourites f ON f.listing_id = l.id AND f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows.map(mapListing));
  })
);

favouritesRouter.post(
  '/listings/:id/favourite',
  requireAuth,
  asyncHandler(async (req, res) => {
    const listingId = String(req.params['id']);
    const listing = await pool.query('SELECT 1 FROM listings WHERE id = $1', [listingId]);
    if (!listing.rowCount) {
      throw new HttpError(404, 'Listing not found.');
    }

    await pool.query(
      `INSERT INTO favourites (user_id, listing_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, listing_id) DO NOTHING`,
      [req.user!.id, listingId]
    );
    res.status(201).json({ isFavourite: true });
  })
);

favouritesRouter.delete(
  '/listings/:id/favourite',
  requireAuth,
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM favourites WHERE user_id = $1 AND listing_id = $2', [
      req.user!.id,
      String(req.params['id'])
    ]);
    res.json({ isFavourite: false });
  })
);
