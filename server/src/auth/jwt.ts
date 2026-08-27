import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: 'user' | 'admin';
}

/**
 * JWT signing secret. In production this must be supplied via the JWT_SECRET environment
 * variable so that sessions survive restarts and are shared across instances. When unset (e.g.
 * local development), a random secret is generated per process start - this invalidates
 * previously issued tokens on every restart, which is acceptable for local dev only.
 */
function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= 16) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set (min 16 characters) in production');
  }
  if (!devSecret) {
    devSecret = crypto.randomBytes(32).toString('hex');
    // eslint-disable-next-line no-console
    console.warn(
      'JWT_SECRET is not set; using an ephemeral development secret. Set JWT_SECRET for stable sessions.',
    );
  }
  return devSecret;
}

let devSecret: string | undefined;

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as AuthTokenPayload;
}

export const AUTH_COOKIE_NAME = 'tax_break_token';
export const AUTH_COOKIE_MAX_AGE_MS = TOKEN_TTL_SECONDS * 1000;
