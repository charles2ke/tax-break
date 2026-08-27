import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const CSRF_COOKIE_NAME = 'tax_break_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Ensures every client has a CSRF token cookie. The cookie is intentionally *not* httpOnly so
 * that client-side JavaScript running on our own origin can read it and echo it back in a request
 * header (the "double-submit cookie" pattern). A cross-site attacker cannot read cookies set for
 * this origin (browsers enforce the same-origin policy for `document.cookie` reads), so they
 * cannot forge a matching header value even though the cookie itself is automatically attached to
 * cross-site requests.
 */
export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: isProduction(),
    });
    req.cookies = { ...req.cookies, [CSRF_COOKIE_NAME]: token };
  }
  next();
}

/**
 * Validates the double-submit CSRF token for state-changing requests. A request is only accepted
 * if the `X-CSRF-Token` header matches the value of the `tax_break_csrf` cookie, which a
 * cross-origin attacker cannot read or set on the victim's behalf.
 */
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);
  if (
    typeof cookieToken === 'string' &&
    typeof headerToken === 'string' &&
    cookieToken.length > 0 &&
    cookieToken === headerToken
  ) {
    next();
    return;
  }
  res.status(403).json({ error: 'Missing or invalid CSRF token' });
}
