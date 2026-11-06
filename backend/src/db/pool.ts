import dns from 'node:dns';
import pg from 'pg';
import { env } from '../config/env.js';

/**
 * PostgreSQL Connection Pool & Transaction Manager
 * Handles resilient connections to Neon Serverless PostgreSQL or local PostgreSQL.
 */

// Prioritize IPv4 to prevent intermittent ENOTFOUND / DNS resolution issues on Windows / dual-stack networks
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const { Pool } = pg;

// Detect Neon serverless database URL to configure appropriate SSL requirements
const isNeon = /neon\.tech/i.test(env.DATABASE_URL);

/**
 * Shared PostgreSQL Pool instance
 * Configured with connection timeouts and SSL encryption for Neon cloud database.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: Number(process.env['PG_POOL_MAX'] ?? 10), // Maximum pool size for serverless elasticity
  idleTimeoutMillis: 30_000,                     // Close idle clients after 30 seconds
  connectionTimeoutMillis: 15_000,               // Allow Neon compute cold-starts to complete
  ssl: isNeon ? { rejectUnauthorized: false } : undefined
});

// Global error listener on idle pool clients
pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

/**
 * Executes a transactional database operation with automatic BEGIN, COMMIT, and ROLLBACK.
 * Ensures data integrity across multi-table operations (e.g., creating listing + images).
 *
 * @param work - Callback receiving the transaction client
 * @returns Result of the transaction callback
 */
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
