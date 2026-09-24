#!/usr/bin/env -S npx tsx
/**
 * Creates or updates a login. Needed because a real deployment should never
 * ship with the demo accounts' published password — see README "Bring your
 * own data" / SEED_DEMO=false.
 *
 * Usage: npm run manage-users -- create <username> <password> <CISO|CIO|CRO|BOARD>
 */
import "./loadEnv";
import bcrypt from "bcryptjs";
import { pool } from "../src/db/pool";

const ROLES = ["CISO", "CIO", "CRO", "BOARD"];

async function main() {
  const [command, username, password, role] = process.argv.slice(2);

  if (command !== "create" || !username || !password || !role) {
    console.error("Usage: npm run manage-users -- create <username> <password> <CISO|CIO|CRO|BOARD>");
    process.exitCode = 1;
    return;
  }
  if (!ROLES.includes(role)) {
    console.error(`Role must be one of: ${ROLES.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role`,
      [username, hash, role]
    );
    console.log(`User "${username}" (${role}) is ready.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("manage-users failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
