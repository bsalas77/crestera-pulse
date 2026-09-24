export type Role = "CISO" | "CIO" | "CRO" | "BOARD";

export interface AuthUser {
  sub: string;
  username: string;
  role: Role;
  /** Issued-at, seconds since epoch (set by jsonwebtoken). */
  iat?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
