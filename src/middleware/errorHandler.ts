import { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/appError';
import { isProduction } from '../config/env';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details
    });
  }

  console.error(err);
  res.status(500).json({
    message: 'Internal server error',
    ...(isProduction ? {} : { details: err instanceof Error ? err.message : err })
  });
};
