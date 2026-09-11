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

export async function login(username: string, password: string): Promise<string | null> {
  const user = await queryOne<UserRow>("SELECT id, username, password, role FROM users WHERE username = $1", [
    username,
  ]);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return signToken({ sub: user.id, username: user.username, role: user.role });
}
