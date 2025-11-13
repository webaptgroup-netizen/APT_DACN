import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthTokenPayload } from '../types/auth';

const TOKEN_TTL: SignOptions['expiresIn'] = '24h';

export const signToken = (payload: AuthTokenPayload, expiresIn: SignOptions['expiresIn'] = TOKEN_TTL) => {
  const secret: Secret = env.JWT_SECRET;
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): AuthTokenPayload => {
  const secret: Secret = env.JWT_SECRET;
  return jwt.verify(token, secret) as AuthTokenPayload;
};
