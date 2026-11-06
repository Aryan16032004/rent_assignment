import { pool } from '../src/db/pool.js';

const result = await pool.query<{ db: string; v: string }>(
  'select current_database() as db, version() as v'
);
console.log('database:', result.rows[0].db);
console.log('server:', result.rows[0].v.split(',')[0]);
await pool.end();
