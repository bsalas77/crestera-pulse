/**
 * Manages logins. See README "Managing logins".
 *
 *   docker compose run --rm api node dist/cli/manage-users.js create <username> <ROLE>
 *   docker compose run --rm api node dist/cli/manage-users.js list
 *   docker compose run --rm api node dist/cli/manage-users.js delete <username>
 *
 * The password is asked for (hidden) so it never lands in shell history. It can
 * also be passed as an argument before the role, or piped on stdin. Changing a
 * password, changing a role or deleting a user ends that user's open sessions.
 */
import "./loadEnv";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { pool } from "../db/pool";
import { describeDbError } from "../db/dbErrors";
import { migrate } from "../db/migrate";
import { firstLineOfInput } from "./secretInput";

const ROLES = ["CISO", "CIO", "CRO", "BOARD"];
const USAGE =
  "Usage:\n" +
  "  node dist/cli/manage-users.js create <username> [password] <CISO|CIO|CRO|BOARD>\n" +
  "      Add a login, or change an existing one's password and role.\n" +
  "      Leave out the password to be asked for it (recommended).\n" +
  "  node dist/cli/manage-users.js list\n" +
  "  node dist/cli/manage-users.js delete <username>";

class UserError extends Error {}

/** Reads one line from a terminal without echoing it, or from piped stdin. */
function readSecret(prompt: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    // Piped input, or a terminal Docker couldn't attach as one (e.g. Git Bash):
    // take the first line as soon as it arrives rather than waiting for end-of-input.
    process.stdout.write(prompt);
    return new Promise((resolve) => {
      let data = "";
      const done = () => {
        stdin.pause();
        resolve(firstLineOfInput(data));
      };
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => {
        data += chunk;
        if (/\r|\n/.test(data)) done();
      });
      stdin.on("end", done);
    });
  }
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function list() {
  const { rows } = await pool.query<{ username: string; role: string }>("SELECT username, role FROM users ORDER BY username");
  if (rows.length === 0) {
    console.log("No logins yet. Add one with: create <username> <ROLE>");
    return;
  }
  const width = Math.max(8, ...rows.map((r) => r.username.length));
  console.log(`${"USERNAME".padEnd(width)}  ROLE`);
  for (const r of rows) console.log(`${r.username.padEnd(width)}  ${r.role}`);
}

async function remove(username: string) {
  const { rowCount } = await pool.query("DELETE FROM users WHERE username = $1", [username]);
  if (!rowCount) throw new UserError(`There is no login called "${username}" — nothing was changed. See who exists with: list`);
  console.log(`User "${username}" deleted. Any open session they had has ended.`);
}

async function main() {
  // The API normally does this at start; run it here too in case it hasn't been restarted since an update.
  await migrate(pool);
  const [command, username, ...rest] = process.argv.slice(2);
  if (command === "list" && !username) return list();
  if (command === "delete" && username && rest.length === 0) return remove(username);
  if (command !== "create" || !username || rest.length < 1 || rest.length > 2) throw new UserError(USAGE);

  const role = rest[rest.length - 1].toUpperCase();
  if (!ROLES.includes(role)) throw new UserError(`Role must be one of: ${ROLES.join(", ")} (got "${rest[rest.length - 1]}").\n${USAGE}`);

  let password = rest.length === 2 ? rest[0] : "";
  if (rest.length === 1) {
    password = await readSecret("Password (at least 8 characters): ");
    if (process.stdin.isTTY) {
      const again = await readSecret("Repeat password: ");
      if (again !== password) throw new UserError("The passwords didn't match — nothing was changed.");
    }
  }
  if (password.length < 8) throw new UserError("Password must be at least 8 characters — nothing was changed.");

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query<{ inserted: boolean }>(
    `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, password_changed_at = now()
     RETURNING (xmax = 0) AS inserted`,
    [username, hash, role]
  );
  const created = result.rows[0]?.inserted;
  console.log(
    created
      ? `User "${username}" (${role}) created. You can sign in now.`
      : `User "${username}" (${role}) updated. Their open sessions have ended; they sign in with the new password.`
  );
}

main()
  .catch((err) => {
    const target = { host: env.db.host, port: env.db.port, user: env.db.user, database: env.db.database };
    const message = err instanceof UserError ? err.message : describeDbError(err, target) ?? (err as Error).message;
    console.error(message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
