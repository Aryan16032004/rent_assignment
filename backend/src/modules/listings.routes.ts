import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool, withTransaction } from '../db/pool.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import {
  deleteMedia,
  mediaTypeFromMime,
  uploadBuffer,
  type MediaType
} from '../services/cloudinary.service.js';

/**
 * Apartment Listings Router
 * Manages full lifecycle of rental listings:
 * - Public search, faceted filtering, pagination, and sorting
 * - Featured spotlight carousel listings
 * - Landlord listing creation, updates, status changes, and deletion
 * - Image and media uploads to Cloudinary CDN
 */
export const listingsRouter = Router();

// Multer memory storage configuration for multipart image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (!mediaTypeFromMime(file.mimetype)) {
      cb(new HttpError(400, 'Only image and video files are supported.'));
      return;
    }
    cb(null, true);
  }
});

interface MediaItem {
  url: string;
  publicId?: string | null;
  mediaType: MediaType;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}

function inferMediaType(url: string): MediaType {
  return /\/video\/upload\/|\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url) ? 'video' : 'image';
}

function inferPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+?)\.[a-z0-9]+(?:\?|$)/i);
  return match?.[1] ?? null;
}

function toMediaItems(photos: string[], media?: MediaItem[]): MediaItem[] {
  if (media?.length) {
    return media;
  }
  return photos.map((url) => ({
    url,
    publicId: inferPublicId(url),
    mediaType: inferMediaType(url)
  }));
}

export interface ListingRow {
  id: string;
  owner_id: string;
  owner_name: string;
  property_type: string;
  building_name: string;
  is_shared: boolean;
  street: string;
  city: string;
  state: string;
  zip: string;
  square_feet: number;
  bedrooms: number;
  lease_type: string;
  expected_rent: string | number;
  negotiable: boolean;
  price_mode: string;
  furnished: boolean;
  vegetarian_only: string;
  amenities: string[];
  title: string;
  description: string;
  status: string;
  featured: boolean;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
  images: {
    url: string;
    publicId: string | null;
    mediaType: MediaType;
    thumbnailUrl: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    isCover: boolean;
    sortOrder: number;
  }[];
}

export const LISTING_SELECT = `
  SELECT l.*, u.name AS owner_name,
    COALESCE((
      SELECT json_agg(
        json_build_object(
          'url', li.url,
          'publicId', li.public_id,
          'mediaType', li.media_type,
          'thumbnailUrl', li.thumbnail_url,
          'width', li.width,
          'height', li.height,
          'duration', li.duration,
          'isCover', li.is_cover,
          'sortOrder', li.sort_order
        )
        ORDER BY li.is_cover DESC, li.sort_order, li.created_at
      )
      FROM listing_images li
      WHERE li.listing_id = l.id
    ), '[]'::json) AS images
  FROM listings l
  JOIN users u ON u.id = l.owner_id
`;

export function mapListing(row: ListingRow) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    propertyType: row.property_type,
    buildingName: row.building_name,
    isShared: row.is_shared,
    address: {
      street: row.street,
      city: row.city,
      state: row.state,
      zip: row.zip
    },
    squareFeet: row.square_feet,
    bedrooms: row.bedrooms,
    leaseType: row.lease_type,
    expectedRent: Number(row.expected_rent),
    negotiable: row.negotiable,
    priceMode: row.price_mode,
    furnished: row.furnished,
    vegetarianOnly: row.vegetarian_only,
    amenities: row.amenities ?? [],
    title: row.title,
    description: row.description,
    photos: (row.images ?? []).map((image) => image.url),
    images: row.images ?? [],
    contact: {
      name: row.contact_name,
      phone: row.contact_phone,
      email: row.contact_email
    },
    status: row.status,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function fetchListing(id: string) {
  const result = await pool.query<ListingRow>(`${LISTING_SELECT} WHERE l.id = $1`, [id]);
  return result.rows[0] ? mapListing(result.rows[0]) : null;
}

interface ListQuery {
  clauses: string[];
  values: unknown[];
}

function addClause(query: ListQuery, clause: string, value?: unknown): void {
  if (value === undefined) {
    return;
  }
  query.values.push(value);
  query.clauses.push(clause.replace('?', `$${query.values.length}`));
}

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

listingsRouter.get(
  '/featured',
  asyncHandler(async (_req, res) => {
    const result = await pool.query<ListingRow>(
      `${LISTING_SELECT}
       WHERE l.status = 'published'
       ORDER BY l.featured DESC, l.created_at DESC
       LIMIT 6`
    );
    res.json(result.rows.map(mapListing));
  })
);

listingsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query<ListingRow>(
      `${LISTING_SELECT}
       WHERE l.owner_id = $1
       ORDER BY l.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows.map(mapListing));
  })
);

listingsRouter.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const query: ListQuery = { clauses: [], values: [] };
    const q = String(req.query['q'] ?? '').trim();

    if (q) {
      query.values.push(`%${q}%`);
      const index = query.values.length;
      query.clauses.push(
        `(l.title ILIKE $${index} OR l.description ILIKE $${index} OR l.building_name ILIKE $${index} OR l.street ILIKE $${index} OR l.city ILIKE $${index})`
      );
    }

    const city = String(req.query['city'] ?? '').trim();
    if (city && city.toLowerCase() !== 'all') {
      addClause(query, 'LOWER(l.city) = LOWER(?)', city);
    }

    const propertyType = String(req.query['propertyType'] ?? '').trim();
    if (propertyType) {
      addClause(query, 'l.property_type = ?', propertyType);
    }

    const minPrice = parseNumber(req.query['minPrice']);
    if (minPrice !== undefined) {
      addClause(query, 'l.expected_rent >= ?', minPrice);
    }

    const maxPrice = parseNumber(req.query['maxPrice']);
    if (maxPrice !== undefined) {
      addClause(query, 'l.expected_rent <= ?', maxPrice);
    }

    const bedrooms = parseNumber(req.query['bedrooms']);
    if (bedrooms !== undefined && bedrooms > 0) {
      addClause(query, 'l.bedrooms = ?', bedrooms);
    }

    const leaseType = String(req.query['leaseType'] ?? '').trim();
    if (leaseType && leaseType !== 'all') {
      addClause(query, "(l.lease_type = ? OR l.lease_type = 'both')", leaseType);
    }

    const furnished = String(req.query['furnished'] ?? '').trim();
    if (furnished === 'yes' || furnished === 'no') {
      addClause(query, 'l.furnished = ?', furnished === 'yes');
    }

    const vegetarian = String(req.query['vegetarian'] ?? req.query['veg'] ?? '').trim();
    if (vegetarian === 'yes') {
      query.clauses.push("l.vegetarian_only = 'yes'");
    } else if (vegetarian === 'no') {
      query.clauses.push("l.vegetarian_only <> 'yes'");
    } else if (vegetarian === 'no-preference') {
      query.clauses.push("l.vegetarian_only = 'no-preference'");
    }

    const amenities = String(req.query['amenities'] ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (amenities.length > 0) {
      addClause(query, 'l.amenities @> ?::text[]', amenities);
    }

    const status = String(req.query['status'] ?? '').trim();
    const ownerId = String(req.query['ownerId'] ?? '').trim();
    if (ownerId) {
      addClause(query, 'l.owner_id = ?', ownerId);
      if (status) {
        addClause(query, 'l.status = ?', status);
      } else if (req.user?.id !== ownerId) {
        query.clauses.push("l.status = 'published'");
      }
    } else {
      addClause(query, 'l.status = ?', status || 'published');
    }

    const sort = String(req.query['sort'] ?? 'newest');
    const orderBy: Record<string, string> = {
      newest: 'l.created_at DESC',
      oldest: 'l.created_at ASC',
      'price-asc': 'l.expected_rent ASC',
      'price-desc': 'l.expected_rent DESC',
      'area-asc': 'l.square_feet ASC',
      'area-desc': 'l.square_feet DESC',
      favourited:
        '(SELECT COUNT(*) FROM favourites f WHERE f.listing_id = l.id) DESC, l.created_at DESC',
      'most-favourited':
        '(SELECT COUNT(*) FROM favourites f WHERE f.listing_id = l.id) DESC, l.created_at DESC'
    };
    const order = orderBy[sort] ?? orderBy['newest'];

    const page = Math.max(1, parseNumber(req.query['page']) ?? 1);
    const pageSize = Math.min(50, Math.max(1, parseNumber(req.query['pageSize']) ?? 9));
    const offset = (page - 1) * pageSize;

    const where = query.clauses.length > 0 ? `WHERE ${query.clauses.join(' AND ')}` : '';
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM listings l ${where}`,
      query.values
    );

    const values = [...query.values, pageSize, offset];
    const result = await pool.query<ListingRow>(
      `${LISTING_SELECT} ${where}
       ORDER BY ${order}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const total = Number(countResult.rows[0]?.count ?? 0);
    res.json({
      items: result.rows.map(mapListing),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1
    });
  })
);

listingsRouter.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const listing = await fetchListing(String(req.params['id']));
    if (!listing) {
      throw new HttpError(404, 'Listing not found.');
    }
    if (listing.status !== 'published' && listing.ownerId !== req.user?.id) {
      throw new HttpError(404, 'Listing not found.');
    }
    res.json(listing);
  })
);

const mediaSchema = z.object({
  url: z.string().trim().min(1),
  publicId: z.string().trim().nullable().optional(),
  mediaType: z.enum(['image', 'video']).default('image'),
  thumbnailUrl: z.string().trim().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  duration: z.number().nullable().optional()
});

const listingSchema = z.object({
  propertyType: z.enum(['Apartment', 'Building', 'Independent House', 'Room']),
  buildingName: z.string().trim().min(2).max(120),
  isShared: z.boolean().default(false),
  address: z.object({
    street: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    zip: z.string().trim().min(3).max(10)
  }),
  squareFeet: z.coerce.number().int().min(10).max(50_000),
  bedrooms: z.coerce.number().int().min(1).max(20),
  leaseType: z.enum(['long-term', 'short-term', 'both']),
  expectedRent: z.coerce.number().positive().max(10_000_000),
  negotiable: z.boolean().default(false),
  priceMode: z.enum(['per-month', 'utilities-included']),
  furnished: z.boolean().default(false),
  vegetarianOnly: z.enum(['yes', 'no', 'no-preference']).default('no-preference'),
  amenities: z.array(z.string()).max(30).default([]),
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(30).max(5000),
  photos: z.array(z.string()).max(12).default([]),
  media: z.array(mediaSchema).max(12).optional(),
  contact: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(30),
    email: z.string().trim().email()
  }),
  status: z.enum(['draft', 'pending', 'published', 'rented', 'inactive']).default('published')
});

const listingUpdateSchema = listingSchema.partial();

type ListingInput = z.infer<typeof listingSchema>;

async function replaceImages(
  client: import('pg').PoolClient,
  listingId: string,
  media: MediaItem[]
) {
  const existing = await client.query<{ public_id: string | null; media_type: MediaType }>(
    'SELECT public_id, media_type FROM listing_images WHERE listing_id = $1',
    [listingId]
  );
  const kept = new Set(media.map((item) => item.publicId).filter(Boolean));
  for (const row of existing.rows) {
    if (row.public_id && !kept.has(row.public_id)) {
      await deleteMedia(row.public_id, row.media_type);
    }
  }

  await client.query('DELETE FROM listing_images WHERE listing_id = $1', [listingId]);
  for (let index = 0; index < media.length; index += 1) {
    const item = media[index];
    await client.query(
      `INSERT INTO listing_images
        (listing_id, url, public_id, media_type, thumbnail_url, width, height, duration, is_cover, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        listingId,
        item.url,
        item.publicId ?? null,
        item.mediaType,
        item.thumbnailUrl ?? null,
        item.width ?? null,
        item.height ?? null,
        item.duration ?? null,
        index === 0,
        index
      ]
    );
  }
}

listingsRouter.post(
  '/',
  requireAuth,
  requireRole('landlord', 'both'),
  validateBody(listingSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ListingInput;
    const listing = await withTransaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO listings (
          owner_id, property_type, building_name, is_shared, street, city, state, zip,
          square_feet, bedrooms, lease_type, expected_rent, negotiable, price_mode,
          furnished, vegetarian_only, amenities, title, description, status,
          contact_name, contact_phone, contact_email
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) RETURNING id`,
        [
          req.user!.id,
          input.propertyType,
          input.buildingName,
          input.isShared,
          input.address.street,
          input.address.city,
          input.address.state,
          input.address.zip,
          input.squareFeet,
          input.bedrooms,
          input.leaseType,
          input.expectedRent,
          input.negotiable,
          input.priceMode,
          input.furnished,
          input.vegetarianOnly,
          input.amenities,
          input.title,
          input.description,
          input.status,
          input.contact.name,
          input.contact.phone,
          input.contact.email
        ]
      );
      const listingId = result.rows[0].id;
      await replaceImages(client, listingId, toMediaItems(input.photos, input.media));
      return listingId;
    });

    res.status(201).json(await fetchListing(listing));
  })
);

listingsRouter.patch(
  '/:id',
  requireAuth,
  validateBody(listingUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = String(req.params['id']);
    const existing = await pool.query<{ owner_id: string }>(
      'SELECT owner_id FROM listings WHERE id = $1',
      [id]
    );
    if (!existing.rows[0]) {
      throw new HttpError(404, 'Listing not found.');
    }
    if (existing.rows[0].owner_id !== req.user!.id) {
      throw new HttpError(403, 'You can only edit your own listings.');
    }

    const input = req.body as Partial<ListingInput>;
    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      if (value === undefined) return;
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    add('property_type', input.propertyType);
    add('building_name', input.buildingName);
    add('is_shared', input.isShared);
    add('street', input.address?.street);
    add('city', input.address?.city);
    add('state', input.address?.state);
    add('zip', input.address?.zip);
    add('square_feet', input.squareFeet);
    add('bedrooms', input.bedrooms);
    add('lease_type', input.leaseType);
    add('expected_rent', input.expectedRent);
    add('negotiable', input.negotiable);
    add('price_mode', input.priceMode);
    add('furnished', input.furnished);
    add('vegetarian_only', input.vegetarianOnly);
    add('amenities', input.amenities);
    add('title', input.title);
    add('description', input.description);
    add('status', input.status);
    add('contact_name', input.contact?.name);
    add('contact_phone', input.contact?.phone);
    add('contact_email', input.contact?.email);

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE listings SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    }

    if (input.photos || input.media) {
      await withTransaction(async (client) => {
        await replaceImages(
          client,
          id,
          toMediaItems(input.photos ?? [], input.media)
        );
      });
    }

    res.json(await fetchListing(id));
  })
);

listingsRouter.patch(
  '/:id/status',
  requireAuth,
  validateBody(
    z.object({ status: z.enum(['draft', 'pending', 'published', 'rented', 'inactive']) })
  ),
  asyncHandler(async (req, res) => {
    const id = String(req.params['id']);
    const result = await pool.query<{ owner_id: string }>(
      'SELECT owner_id FROM listings WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) {
      throw new HttpError(404, 'Listing not found.');
    }
    if (result.rows[0].owner_id !== req.user!.id) {
      throw new HttpError(403, 'You can only update your own listings.');
    }

    await pool.query('UPDATE listings SET status = $1 WHERE id = $2', [
      req.body.status,
      id
    ]);
    res.json(await fetchListing(id));
  })
);

listingsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = String(req.params['id']);
    const result = await pool.query<{ owner_id: string }>(
      'SELECT owner_id FROM listings WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) {
      throw new HttpError(404, 'Listing not found.');
    }
    if (result.rows[0].owner_id !== req.user!.id) {
      throw new HttpError(403, 'You can only delete your own listings.');
    }

    const media = await pool.query<{ public_id: string | null; media_type: MediaType }>(
      'SELECT public_id, media_type FROM listing_images WHERE listing_id = $1',
      [id]
    );
    for (const asset of media.rows) {
      if (asset.public_id) {
        await deleteMedia(asset.public_id, asset.media_type);
      }
    }

    await pool.query('DELETE FROM listings WHERE id = $1', [id]);
    res.json({ message: 'Listing deleted successfully.' });
  })
);

listingsRouter.post(
  '/:id/images',
  requireAuth,
  upload.array('images', 6),
  asyncHandler(async (req, res) => {
    const id = String(req.params['id']);
    const result = await pool.query<{ owner_id: string }>(
      'SELECT owner_id FROM listings WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) {
      throw new HttpError(404, 'Listing not found.');
    }
    if (result.rows[0].owner_id !== req.user!.id) {
      throw new HttpError(403, 'You can only add images to your own listings.');
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new HttpError(400, 'No media was uploaded.');
    }

    const countResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM listing_images WHERE listing_id = $1',
      [id]
    );
    const existingCount = Number(countResult.rows[0]?.count ?? 0);
    if (existingCount + files.length > 12) {
      throw new HttpError(400, 'A listing can have at most 12 media items.');
    }

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const mediaType = mediaTypeFromMime(file.mimetype);
      if (!mediaType) {
        throw new HttpError(400, `Unsupported file type: ${file.mimetype}`);
      }
      const uploaded = await uploadBuffer(file.buffer, mediaType);
      await pool.query(
        `INSERT INTO listing_images
          (listing_id, url, public_id, media_type, thumbnail_url, width, height, duration, is_cover, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          uploaded.url,
          uploaded.publicId,
          uploaded.mediaType,
          uploaded.thumbnailUrl,
          uploaded.width,
          uploaded.height,
          uploaded.duration,
          existingCount === 0 && index === 0,
          existingCount + index
        ]
      );
    }

    res.status(201).json(await fetchListing(id));
  })
);

listingsRouter.delete(
  '/:id/images/:imageId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = String(req.params['id']);
    const imageId = String(req.params['imageId']);
    const owner = await pool.query<{ owner_id: string }>(
      'SELECT owner_id FROM listings WHERE id = $1',
      [id]
    );
    if (!owner.rows[0]) {
      throw new HttpError(404, 'Listing not found.');
    }
    if (owner.rows[0].owner_id !== req.user!.id) {
      throw new HttpError(403, 'You can only edit your own listings.');
    }

    const asset = await pool.query<{ public_id: string | null; media_type: MediaType }>(
      'SELECT public_id, media_type FROM listing_images WHERE id = $1 AND listing_id = $2',
      [imageId, id]
    );

    await pool.query('DELETE FROM listing_images WHERE id = $1 AND listing_id = $2', [
      imageId,
      id
    ]);

    if (asset.rows[0]?.public_id) {
      await deleteMedia(asset.rows[0].public_id, asset.rows[0].media_type);
    }

    res.json(await fetchListing(id));
  })
);
