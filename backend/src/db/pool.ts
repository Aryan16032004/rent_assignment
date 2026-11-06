import dns from 'node:dns';
import pg from 'pg';
import { env } from '../config/env.js';

// Prioritize IPv4 to prevent intermittent ENOTFOUND / DNS resolution issues on Windows / dual-stack networks
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const { Pool } = pg;

const isNeon = /neon\.tech/i.test(env.DATABASE_URL);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: Number(process.env['PG_POOL_MAX'] ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  ssl: isNeon ? { rejectUnauthorized: false } : undefined
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

export async function withTransaction<T>(
  work: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
