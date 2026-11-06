import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError } from '../utils/http-error.js';

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
