import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./jwt";
import { sessionStillValid } from "../services/authService";
import type { AuthUser, Role } from "../types";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  let user: AuthUser;
  try {
    user = verifyToken(header.slice("Bearer ".length));
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    if (!(await sessionStillValid(user))) {
      return res.status(401).json({ error: "This account was changed or removed — sign in again" });
    }
  } catch (err) {
    return next(err);
  }
  req.user = user;
  next();
}

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role for this resource" });
    }
    next();
  };
}
