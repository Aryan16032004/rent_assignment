import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(currentDir, '../../db/schema.sql');

async function reset(): Promise<void> {
  await pool.query(`
    DROP TABLE IF EXISTS comments CASCADE;
    DROP TABLE IF EXISTS inquiry_messages CASCADE;
    DROP TABLE IF EXISTS inquiries CASCADE;
    DROP TABLE IF EXISTS favourites CASCADE;
    DROP TABLE IF EXISTS listing_images CASCADE;
    DROP TABLE IF EXISTS listings CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
  const schema = await fs.readFile(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database reset successfully.');
  await pool.end();
}

reset().catch(async (error) => {
  console.error('Reset failed', error);
  await pool.end();
  process.exit(1);
});
