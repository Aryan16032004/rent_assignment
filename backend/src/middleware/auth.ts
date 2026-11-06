import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthUser, UserRole } from '../types.js';
import { HttpError } from '../utils/http-error.js';

interface TokenPayload extends jwt.JwtPayload {
  sub: string;
  role: UserRole;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(header.slice(7), env.JWT_SECRET) as TokenPayload;
    if (decoded.sub && decoded.role) {
      req.user = { id: decoded.sub, role: decoded.role };
    }
  } catch {
    // Invalid tokens are treated as anonymous for public endpoints.
  }

  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Authentication required.'));
    return;
  }

  try {
    const decoded = jwt.verify(header.slice(7), env.JWT_SECRET) as TokenPayload;
    if (!decoded.sub || !decoded.role) {
      next(new HttpError(401, 'Invalid session.'));
      return;
    }
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired session.'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'Authentication required.'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, 'You do not have permission to perform this action.'));
      return;
    }

    next();
  };
}
