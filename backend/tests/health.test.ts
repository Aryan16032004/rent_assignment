import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('RentHub API', () => {
  afterAll(async () => {
    await pool.end();
  });
  it('returns a health response', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('rejects unauthenticated access to protected endpoints', async () => {
    const response = await request(app).get('/api/listings/mine');
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication required');
  });

  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
  });
});
