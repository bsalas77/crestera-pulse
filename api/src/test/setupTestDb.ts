import { readFileSync } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";
import { env } from "../config/env";

/**
 * The integration suite drops every table, so it must never run against a
 * database anyone cares about. Require a disposable-looking name (…_test) or
 * an explicit opt-in.
 */
export function assertSafeToReset(dbName: string, allowReset = process.env.ALLOW_DB_RESET): void {
  if (allowReset === "true" || /_test$/i.test(dbName)) return;
  throw new Error(
    `Refusing to wipe database "${dbName}": the integration tests drop every table. ` +
      `Point DB_NAME at a disposable database whose name ends in "_test" (or set ALLOW_DB_RESET=true).`
  );
}

/**
 * Wipes the connected database and reloads db/schema.sql + db/seed.sql.
 * Safe to re-run against a dirty test DB (a fresh CI postgres service
 * container or a reused local scratch DB).
 */
export async function resetTestDatabase(pool: Pool): Promise<void> {
  assertSafeToReset(env.db.database);

  const dbDir = path.resolve(__dirname, "../../../db");
  const schema = readFileSync(path.join(dbDir, "schema.sql"), "utf8");
  const seed = readFileSync(path.join(dbDir, "seed.sql"), "utf8");

  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.query(schema);
  await pool.query(seed);
}
