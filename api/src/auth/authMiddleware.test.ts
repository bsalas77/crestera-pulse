import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requireRole } from "./authMiddleware";
import type { AuthUser } from "../types";

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function mockReq(user?: AuthUser): Request {
  return { user } as unknown as Request;
}

describe("requireRole", () => {
  it("calls next for an allowed role", () => {
    const next = vi.fn();
    const req = mockReq({ sub: "1", username: "board", role: "BOARD" });
    requireRole("BOARD", "CISO")(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 for a role not in the allow list", () => {
    const next = vi.fn();
    const res = mockRes();
    const req = mockReq({ sub: "1", username: "cio", role: "CIO" });
    requireRole("CISO", "BOARD")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 401 when there is no authenticated user", () => {
    const next = vi.fn();
    const res = mockRes();
    requireRole("CISO")(mockReq(undefined), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
