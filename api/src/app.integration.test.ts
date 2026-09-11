import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { pool } from "./db/pool";
import { resetTestDatabase } from "./test/setupTestDb";

/**
 * Exercises the app against a real Postgres — the same login/RBAC/dashboard
 * checks that were run manually with curl and a browser during development.
 * Needs a reachable, disposable Postgres (see api/.env.example); CI provides
 * one as a service container.
 */

const app = createApp();

// Cached per role so the suite logs in once per role, not once per assertion —
// matching how a real client behaves (log in once, reuse the JWT) and staying
// under the /auth/login rate limiter.
const tokenCache = new Map<string, string>();

async function loginAs(role: "ciso" | "cio" | "cro" | "board"): Promise<string> {
  const cached = tokenCache.get(role);
  if (cached) return cached;
  const res = await request(app).post("/auth/login").send({ username: role, password: "password" });
  const token = res.body.token as string;
  tokenCache.set(role, token);
  return token;
}

beforeAll(async () => {
  await resetTestDatabase(pool);
}, 30_000);

afterAll(async () => {
  await pool.end();
});

describe("POST /auth/login", () => {
  it("returns a token for valid demo credentials", async () => {
    const res = await request(app).post("/auth/login").send({ username: "board", password: "password" });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });

  it("rejects an invalid password", async () => {
    const res = await request(app).post("/auth/login").send({ username: "board", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown username", async () => {
    const res = await request(app).post("/auth/login").send({ username: "nobody", password: "password" });
    expect(res.status).toBe(401);
  });
});

describe("GET /assets", () => {
  it("rejects requests with no token", async () => {
    const res = await request(app).get("/assets");
    expect(res.status).toBe(401);
  });

  it("returns assets for an authenticated user", async () => {
    const token = await loginAs("board");
    const res = await request(app).get("/assets").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe("role-gated dashboards", () => {
  const cases: [role: "ciso" | "cio" | "cro" | "board", path: string, allowed: boolean][] = [
    ["ciso", "/dashboard/ciso", true],
    ["ciso", "/dashboard/cio", false],
    ["cio", "/dashboard/cio", true],
    ["cio", "/dashboard/cro", false],
    ["cro", "/dashboard/cro", true],
    ["cro", "/dashboard/board", false],
    ["board", "/dashboard/ciso", true],
    ["board", "/dashboard/cio", true],
    ["board", "/dashboard/cro", true],
    ["board", "/dashboard/board", true],
  ];

  it.each(cases)("%s hitting %s is allowed=%s", async (role, path, allowed) => {
    const token = await loginAs(role);
    const res = await request(app).get(path).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(allowed ? 200 : 403);
  });
});

describe("GET /dashboard/ciso shape", () => {
  it("returns the expected top-level fields", async () => {
    const token = await loginAs("ciso");
    const res = await request(app).get("/dashboard/ciso").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      securityPostureScore: expect.any(Number),
      securityIncidentsSummary: expect.objectContaining({ total: expect.any(Number) }),
    });
  });
});
