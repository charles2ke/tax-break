import { getDb } from '../db';

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  /** Name of the OAuth provider the account was created with, when it was not a password signup. */
  oauth_provider: string | null;
  /** Stable account identifier at the OAuth provider. */
  oauth_subject: string | null;
  created_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

export function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

export function findUserByEmail(email: string): UserRecord | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase()) as UserRecord | undefined;
}

export function findUserById(id: number): UserRecord | undefined {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined;
}

export function createUser(email: string, passwordHash: string, role: 'user' | 'admin' = 'user'): UserRecord {
  const result = getDb()
    .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(email.toLowerCase(), passwordHash, role);
  return findUserById(Number(result.lastInsertRowid)) as UserRecord;
}

/**
 * Finds the account for an OAuth sign-in, linking the provider to an existing account with the
 * same (provider-verified) email address, and creating the account on first sign-in.
 */
export function findOrCreateOAuthUser(
  provider: string,
  subject: string,
  email: string,
  unusablePasswordHash: string,
): UserRecord {
  const db = getDb();
  const existingBySubject = db
    .prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_subject = ?')
    .get(provider, subject) as UserRecord | undefined;
  if (existingBySubject) return existingBySubject;

  const existingByEmail = findUserByEmail(email);
  if (existingByEmail) {
    db.prepare('UPDATE users SET oauth_provider = ?, oauth_subject = ? WHERE id = ?').run(
      provider,
      subject,
      existingByEmail.id,
    );
    return findUserById(existingByEmail.id) as UserRecord;
  }

  const role = countUsers() === 0 ? 'admin' : 'user';
  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, role, oauth_provider, oauth_subject)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(email.toLowerCase(), unusablePasswordHash, role, provider, subject);
  return findUserById(Number(result.lastInsertRowid)) as UserRecord;
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return row.count;
}
