import { RequestHandler } from 'express';
import type { UserRole } from '../types/auth';
import { AppError } from '../utils/appError';
import { verifyToken } from '../utils/jwt';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401);
  }

  try {
    const payload = verifyToken(header.substring('Bearer '.length));
    req.user = payload;
    return next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
};

export const requireRoles = (...roles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Forbidden', 403);
    }

    return next();
  };
};
