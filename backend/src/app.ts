import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { env } from './config/env.js';
import { authRouter } from './modules/auth.routes.js';
import { usersRouter } from './modules/users.routes.js';
import { listingsRouter } from './modules/listings.routes.js';
import { favouritesRouter } from './modules/favourites.routes.js';
import { inquiriesRouter } from './modules/inquiries.routes.js';
import { commentsRouter } from './modules/comments.routes.js';
import { dashboardRouter } from './modules/dashboard.routes.js';
import { uploadsRouter } from './modules/uploads.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { pool } from './db/pool.js';
import { isCloudinaryConfigured } from './services/cloudinary.service.js';

export const app = express();

const helmetFn: any = (helmet as any)?.default || helmet;
app.use(helmetFn({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);
app.use(express.json({ limit: '30mb' }));
app.use(morgan(env.NODE_ENV === 'test' ? 'tiny' : 'dev'));

app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query<{ now: string }>('SELECT NOW()::text AS now');
    res.json({
      status: 'ok',
      database: 'connected',
      databaseTime: result.rows[0]?.now,
      cloudinary: isCloudinaryConfigured() ? 'configured' : 'disabled',
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/listings', listingsRouter);
app.use('/api', favouritesRouter);
app.use('/api', inquiriesRouter);
app.use('/api', commentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/uploads', uploadsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
