import { pool } from '../src/db/pool.js';

const rows = await pool.query<{ id: string; url: string; media_type: string }>(
  'SELECT id, url, media_type FROM listing_images ORDER BY created_at'
);
const unique = new Set(rows.rows.map((r) => r.url));
console.log('total:', rows.rows.length, 'unique:', unique.size);
for (const r of rows.rows.slice(0, 20)) {
  console.log(r.media_type, r.url);
}
await pool.end();
