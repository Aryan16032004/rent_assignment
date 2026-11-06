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

/**
 * RentHub Express Application
 * Configures middleware, security policies, CORS, routing, and database health endpoints.
 */
export const app = express();

// Security headers: protect against common web vulnerabilities while allowing cross-origin image sharing
const helmetFn: any = (helmet as any)?.default || helmet;
app.use(helmetFn({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Cross-Origin Resource Sharing (CORS): allows production Vercel frontend, local dev, and handles preflight OPTIONS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or curl requests with no origin header
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
    optionsSuccessStatus: 200 // Ensures legacy browsers and preflight checks receive standard 200 OK
  })
);

// Body parsing middleware for JSON payloads with high limit for base64/upload transfers
app.use(express.json({ limit: '30mb' }));

// HTTP request logger: compact in test environment, formatted in development/production
app.use(morgan(env.NODE_ENV === 'test' ? 'tiny' : 'dev'));

// URL normalization middleware: restores original path when rewritten by Vercel serverless layer
app.use((req, _res, next) => {
  if ((req.url === '/api' || req.url === '/api/') && req.originalUrl && req.originalUrl !== req.url) {
    req.url = req.originalUrl;
  }
  next();
});

// Static directory for uploaded files (used during local development fallback)
app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

/**
 * Root Welcome Endpoint
 * Returns API information, service status, and link to documentation/health check.
 */
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

/**
 * Health Check Handler
 * Verifies live PostgreSQL database connection and Cloudinary CDN configuration.
 */
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

// Route health checks under both /api/health and /health
app.get('/api/health', healthCheckHandler);
app.get('/health', healthCheckHandler);

// Feature Route Modules
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/listings', listingsRouter);
app.use('/api', favouritesRouter);
app.use('/api', inquiriesRouter);
app.use('/api', commentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/uploads', uploadsRouter);

// Global Error & 404 Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
