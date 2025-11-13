import { ZodTypeAny } from 'zod';
import { RequestHandler } from 'express';
import { AppError } from '../utils/appError';

export const validateRequest = (schema: ZodTypeAny): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      throw new AppError('Validation failed', 422, result.error.flatten());
    }

    const parsed = result.data as { body?: unknown; params?: unknown; query?: unknown };
    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }
    if (parsed.params !== undefined) {
      req.params = parsed.params as any;
    }
    if (parsed.query !== undefined) {
      req.query = parsed.query as any;
    }
    next();
  };
};
