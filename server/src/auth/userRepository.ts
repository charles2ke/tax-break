import { getDb } from '../db';

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
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

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return row.count;
}
