import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError } from '../utils/http-error.js';

/**
 * Zod Request Body Validation Middleware Factory
 * Validates and sanitizes incoming JSON request payloads against a specified schema.
 * Replaces req.body with parsed/coerced data on success or forwards structured 422 errors on failure.
 *
 * @param schema - Zod schema defining valid payload attributes
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        new HttpError(
          422,
          'Please check the submitted information.',
          result.error.flatten().fieldErrors
        )
      );
      return;
    }

    req.body = result.data;
    next();
  };
}
