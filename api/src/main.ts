import { createApp } from "./app";
import { checkEnv } from "./config/validateEnv";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { describeDbError } from "./db/dbErrors";
import { migrate } from "./db/migrate";

const report = checkEnv();
for (const warning of report.warnings) {
  console.warn(`[env] ${warning}`);
}
if (report.errors.length > 0) {
  for (const error of report.errors) {
    console.error(`[env] ${error}`);
  }
  console.error("Refusing to start with invalid production configuration. Fix the values above in your .env file.");
  process.exit(1);
}

// Check the database before accepting traffic, so a wrong DB_PASS shows up as
// a clear startup error instead of a healthy-looking API that fails every login.
async function waitForDatabase(): Promise<void> {
  const target = { host: env.db.host, port: env.db.port, user: env.db.user, database: env.db.database };
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query("SELECT 1 FROM users LIMIT 1");
      return;
    } catch (err) {
      const code = (err as { code?: string }).code;
      const transient = code === "ECONNREFUSED" || code === "57P03" || code === "EAI_AGAIN";
      if (transient && attempt < 30) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[db] ${describeDbError(err, target) ?? (err as Error).message}`);
      process.exit(1);
    }
  }
}

waitForDatabase()
  .then(() => migrate(pool))
  .then(() => {
    createApp().listen(env.port, () => {
      console.log(`Dashboard API listening on port ${env.port}`);
    });
  })
  .catch((err) => {
    console.error(`[db] Updating the database schema failed: ${(err as Error).message}`);
    process.exit(1);
  });
