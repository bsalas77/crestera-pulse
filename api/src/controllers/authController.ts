import type { NextFunction, Request, Response } from "express";
import { isDemoActive, login } from "../services/authService";

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body ?? {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "username and password are required" });
    }

    const token = await login(username, password);
    if (!token) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ token });
  } catch (err) {
    next(err);
  }
}

export async function demoModeHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ demo: await isDemoActive() });
  } catch (err) {
    next(err);
  }
}
