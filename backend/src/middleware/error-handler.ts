import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/http-error.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Route not found.' });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      message: error.message,
      ...(error.details ? { errors: error.details } : {})
    });
    return;
  }

  if (error instanceof Error) {
    if (error.name === 'MulterError') {
      res.status(400).json({ message: 'Upload failed. Use up to 6 files, max 50MB each.' });
      return;
    }
    if (error.name === 'SyntaxError' && 'body' in error) {
      res.status(400).json({ message: 'Invalid JSON payload.' });
      return;
    }

    const pgError = error as Error & { code?: string };
    if (pgError.code === '23505') {
      res.status(409).json({ message: 'That record already exists.' });
      return;
    }
    if (pgError.code === '23503') {
      res.status(400).json({ message: 'A referenced record does not exist.' });
      return;
    }

    console.error(error);
  }

  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
