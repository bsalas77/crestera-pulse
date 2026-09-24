import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Client mistakes the body parser rejects (malformed JSON, oversized body)
  // carry their own 4xx status; answer them as such, without logging noise.
  const status = (err as { status?: number; statusCode?: number }).status ?? (err as { statusCode?: number }).statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const message = status === 413 ? "Request body too large" : status === 400 ? "Malformed request body" : "Bad request";
    return res.status(status).json({ error: message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
