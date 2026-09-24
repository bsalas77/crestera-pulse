import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { query, queryOne } from "../db/pool";
import { signToken } from "../auth/jwt";
import type { AuthUser, Role } from "../types";

interface UserRow {
  id: string;
  username: string;
  password: string;
  role: Role;
}

// Compared against when the username doesn't exist, so a login attempt takes
// the same time either way and can't be used to discover valid usernames.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), 10);

export async function login(username: string, password: string): Promise<string | null> {
  const user = await queryOne<UserRow>("SELECT id, username, password, role FROM users WHERE username = $1", [
    username,
  ]);

  const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !valid) return null;

  return signToken({ sub: user.id, username: user.username, role: user.role });
}

/**
 * A signed, unexpired token still has to match the account as it is now:
 * deleted users, role changes and password changes take effect on the next
 * request instead of when the token expires.
 */
export async function sessionStillValid(user: AuthUser): Promise<boolean> {
  const row = await queryOne<{ role: Role; changed: string }>(
    "SELECT role, floor(extract(epoch FROM password_changed_at))::bigint::text AS changed FROM users WHERE id = $1",
    [user.sub]
  );
  if (!row || row.role !== user.role) return false;
  return (user.iat ?? 0) >= Number(row.changed);
}

const DEMO_USERNAMES =["ciso", "cio", "cro", "board"];
const DEMO_PASSWORD = "password";
const DEMO_CACHE_MS = 30_000;
let demoCache: { value: boolean; at: number } | null = null;

/**
 * True while any built-in demo account still has the published demo password,
 * so the login page only advertises it when it actually works.
 */
export async function isDemoActive(now = Date.now()): Promise<boolean> {
  if (demoCache && now - demoCache.at < DEMO_CACHE_MS) return demoCache.value;
  const rows = await query<{ password: string }>("SELECT password FROM users WHERE username = ANY($1)", [
    DEMO_USERNAMES,
  ]);
  let value = false;
  for (const row of rows) {
    if (await bcrypt.compare(DEMO_PASSWORD, row.password)) {
      value = true;
      break;
    }
  }
  demoCache = { value, at: now };
  return value;
}

export function resetDemoCache(): void {
  demoCache = null;
}
