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
        origin === 'https://renthub-frontend-lemon.vercel.app' ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200
  })
);
app.use(express.json({ limit: '30mb' }));
app.use(morgan(env.NODE_ENV === 'test' ? 'tiny' : 'dev'));

// Normalize req.url when rewritten by Vercel serverless layer
app.use((req, _res, next) => {
  if ((req.url === '/api' || req.url === '/api/') && req.originalUrl && req.originalUrl !== req.url) {
    req.url = req.originalUrl;
  }
  next();
});

app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

app.get('/', (_req, res) => {
  res.json({
    name: 'RentHub API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      listings: '/api/listings',
      auth: '/api/auth'
    }
  });
});

const healthCheckHandler = async (_req: express.Request, res: express.Response) => {
  try {
    const result = await pool.query<{ now: string }>('SELECT NOW()::text AS now');
    res.json({
      status: 'ok',
      database: 'connected',
      databaseTime: result.rows[0]?.now,
      cloudinary: isCloudinaryConfigured() ? 'configured' : 'disabled',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err?.message || String(err),
      timestamp: new Date().toISOString()
    });
  }
};

app.get('/api/health', healthCheckHandler);
app.get('/health', healthCheckHandler);

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
