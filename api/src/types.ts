export type Role = "CISO" | "CIO" | "CRO" | "BOARD";

export interface AuthUser {
  sub: string;
  username: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
