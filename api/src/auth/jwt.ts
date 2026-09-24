import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthUser, Role } from "../types";

// Pin the algorithm on both sides so a token signed with a different one (or
// "none") can never be accepted.
const ALGORITHM = "HS256";

export function signToken(payload: { sub: string; username: string; role: Role }): string {
  return jwt.sign(payload, env.jwtSecret, { algorithm: ALGORITHM, expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] }) as AuthUser;
}
