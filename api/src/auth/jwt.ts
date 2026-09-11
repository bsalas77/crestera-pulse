import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthUser, Role } from "../types";

export function signToken(payload: { sub: string; username: string; role: Role }): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, env.jwtSecret) as AuthUser;
}
