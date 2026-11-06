import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/http-error.js';

/**
 * 404 Catch-All Handler
 * Returns standard JSON response when a requested route is not registered.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Route not found.' });
}

/**
 * Central Express Error Handling Middleware
 * Intercepts uncaught exceptions, HttpError instances, Multer limits, and PostgreSQL error codes.
 * Ensures consistent JSON responses across the entire application without leaking sensitive internals.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Application-defined HTTP errors (with status codes and validation details)
  if (error instanceof HttpError) {
    res.status(error.status).json({
      message: error.message,
      ...(error.details ? { errors: error.details } : {})
    });
    return;
  }

  if (error instanceof Error) {
    // Multer upload errors (file size or file quantity limits exceeded)
    if (error.name === 'MulterError') {
      res.status(400).json({ message: 'Upload failed. Use up to 6 files, max 50MB each.' });
      return;
    }

    // Malformed JSON payload syntax error
    if (error.name === 'SyntaxError' && 'body' in error) {
      res.status(400).json({ message: 'Invalid JSON payload.' });
      return;
    }

    // PostgreSQL specific error handling via SQLSTATE codes
    const pgError = error as Error & { code?: string };
    if (pgError.code === '23505') {
      // Unique constraint violation (e.g. duplicate email)
      res.status(409).json({ message: 'That record already exists.' });
      return;
    }
    if (pgError.code === '23503') {
      // Foreign key constraint violation (e.g. non-existent user or listing reference)
      res.status(400).json({ message: 'A referenced record does not exist.' });
      return;
    }

    console.error('Unhandled server error:', error);
  }

  // Generic 500 fallback for unknown exceptions
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
