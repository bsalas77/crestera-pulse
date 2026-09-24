import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { queryOne } from "../db/pool";
import { signToken } from "../auth/jwt";
import type { Role } from "../types";

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
