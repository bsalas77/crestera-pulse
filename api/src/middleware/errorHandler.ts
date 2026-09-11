import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
