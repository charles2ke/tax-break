import crypto from 'crypto';
import { Router } from 'express';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME, signAuthToken } from '../auth/jwt';
import { requireAuth } from '../auth/middleware';
import { hashPassword, verifyPassword } from '../auth/password';
import {
  countUsers,
  createUser,
  findOrCreateOAuthUser,
  findUserByEmail,
  toPublicUser,
} from '../auth/userRepository';
import {
  OAuthError,
  buildAuthorizationUrl,
  exchangeCodeForProfile,
  isOAuthProviderName,
  listEnabledOAuthProviders,
} from '../services/oauthProviders';
import { ValidationError } from '../validation';

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;
const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email: string): boolean {
  if (email.length === 0 || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export const authRouter = Router();

authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || !isValidEmail(email)) {
      throw new ValidationError('A valid email address is required');
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (findUserByEmail(email)) {
      throw new ValidationError('An account with this email already exists');
    }

    // The very first registered account is granted the admin role so the admin config panel is
    // reachable without manual database access.
    const role = countUsers() === 0 ? 'admin' : 'user';
    const passwordHash = await hashPassword(password);
    const user = createUser(email, passwordHash, role);

    const token = signAuthToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new ValidationError('email and password are required');
    }
    const user = findUserByEmail(email);
    const passwordMatches = user ? await verifyPassword(password, user.password_hash) : false;
    if (!user || !passwordMatches) {
      throw new ValidationError('Invalid email or password');
    }

    const token = signAuthToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).send();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// --- OAuth sign-in ---

const OAUTH_STATE_COOKIE = 'tax_break_oauth_state';
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction(),
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

/** Constant-time comparison of the state parameter with the value stored in the cookie. */
function statesMatch(expected: unknown, received: unknown): boolean {
  if (typeof expected !== 'string' || typeof received !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Lists the OAuth providers this server is configured for, so the UI can show the buttons. */
authRouter.get('/oauth/providers', (_req, res) => {
  res.json({ providers: listEnabledOAuthProviders() });
});

authRouter.get('/oauth/:provider/start', (req, res, next) => {
  try {
    const provider = req.params.provider;
    if (!isOAuthProviderName(provider)) {
      throw new OAuthError('Unknown sign-in provider.', 404);
    }
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });
    res.redirect(buildAuthorizationUrl(provider, state));
  } catch (err) {
    next(err);
  }
});

authRouter.get('/oauth/:provider/callback', async (req, res, next) => {
  try {
    const provider = req.params.provider;
    if (!isOAuthProviderName(provider)) {
      throw new OAuthError('Unknown sign-in provider.', 404);
    }
    const { code, state } = req.query;
    if (typeof code !== 'string' || !code) {
      throw new OAuthError('The sign-in was cancelled or returned no authorization code.');
    }
    if (!statesMatch(req.cookies?.[OAUTH_STATE_COOKIE], state)) {
      throw new OAuthError('The sign-in request could not be verified. Please try again.');
    }
    res.clearCookie(OAUTH_STATE_COOKIE);

    const profile = await exchangeCodeForProfile(provider, code);
    // OAuth accounts never sign in with a password, so an unguessable hash is stored instead.
    const unusablePasswordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
    const user = findOrCreateOAuthUser(
      provider,
      profile.subject,
      profile.email,
      unusablePasswordHash,
    );

    const token = signAuthToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
    res.redirect(process.env.OAUTH_SUCCESS_REDIRECT_URL ?? '/');
  } catch (err) {
    next(err);
  }
});
