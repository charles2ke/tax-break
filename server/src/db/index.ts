import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

/**
 * Path to the SQLite database file. Defaults to `<repo>/server/data/tax-break.sqlite3` so it
 * survives across restarts in development; override with DB_PATH in production. Use `:memory:`
 * for ephemeral storage (useful in tests).
 */
function resolveDbPath(): string {
  const configured = process.env.DB_PATH;
  if (configured === ':memory:') return configured;
  const resolved = configured
    ? path.resolve(process.cwd(), configured)
    : path.join(__dirname, '..', '..', 'data', 'tax-break.sqlite3');
  const dataDir = path.dirname(resolved);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return resolved;
}

let dbInstance: Database.Database | undefined;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(resolveDbPath());
    dbInstance.pragma('journal_mode = WAL');
    migrate(dbInstance);
  }
  return dbInstance;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tax_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assessment_year TEXT NOT NULL,
      label TEXT,
      input_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      efiling_status TEXT,
      efiling_ack_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tax_returns_user_id ON tax_returns(user_id);

    CREATE TABLE IF NOT EXISTS config_overrides (
      assessment_year TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/** Test-only helper to reset module state between test files that use in-memory databases. */
export function resetDbForTests(): void {
  dbInstance = undefined;
}
