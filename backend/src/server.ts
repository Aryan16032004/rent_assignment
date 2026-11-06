import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

async function start(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    app.listen(env.PORT, () => {
      console.log(`RentHub API running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('Unable to start RentHub API. Check DATABASE_URL and PostgreSQL.', error);
    process.exit(1);
  }
}

void start();
