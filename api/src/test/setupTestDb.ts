import { readFileSync } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

/**
 * Wipes the connected database and reloads db/schema.sql + db/seed.sql.
 * Only ever point this at a disposable test database — it drops everything
 * in the public schema first so it's safe to re-run against a dirty DB
 * (a fresh CI postgres service container or a reused local scratch DB).
 */
export async function resetTestDatabase(pool: Pool): Promise<void> {
  const dbDir = path.resolve(__dirname, "../../../db");
  const schema = readFileSync(path.join(dbDir, "schema.sql"), "utf8");
  const seed = readFileSync(path.join(dbDir, "seed.sql"), "utf8");

  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.query(schema);
  await pool.query(seed);
}
