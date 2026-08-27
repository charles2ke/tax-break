import { Router } from 'express';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME, signAuthToken } from '../auth/jwt';
import { requireAuth } from '../auth/middleware';
import { hashPassword, verifyPassword } from '../auth/password';
import { countUsers, createUser, findUserByEmail, toPublicUser } from '../auth/userRepository';
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
