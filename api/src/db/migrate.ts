import type { Pool } from "pg";

/**
 * Schema changes made after a database was first created, so updating to a
 * newer version keeps existing data (README "Backups, restores and updates").
 * db/schema.sql already includes all of them for new databases. Every entry
 * runs on every start, so each must be safe to repeat. Only ever append.
 */
export const MIGRATIONS = [
  // Sessions end when a user's password changes (see sessionStillValid).
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now()",
];

export async function migrate(pool: Pool): Promise<void> {
  for (const sql of MIGRATIONS) await pool.query(sql);
}
