import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "./app";
import { pool } from "./db/pool";
import { migrate } from "./db/migrate";
import { resetDemoCache } from "./services/authService";
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

  it("never throttles successful sign-ins from a shared address", async () => {
    const shared = createApp();
    for (let i = 0; i < 12; i++) {
      const res = await request(shared).post("/auth/login").send({ username: "cro", password: "password" });
      expect(res.status).toBe(200);
    }
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

describe("demo data stays current", () => {
  it("keeps every seeded loss event inside the Board's 12-month window, whatever today is", async () => {
    const token = await loginAs("board");
    const res = await request(app).get("/dashboard/board").set("Authorization", `Bearer ${token}`);
    expect(res.body.lossEventsLast12Months).toBe(649500);
    expect(res.body.lossEventsTrend.length).toBeGreaterThan(2);
  });
});

describe("GET /auth/demo", () => {
  it("reports demo mode while the demo accounts still use the published password", async () => {
    resetDemoCache();
    const res = await request(app).get("/auth/demo");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ demo: true });
  });

  it("stops reporting demo mode once those passwords are changed", async () => {
    const hash = bcrypt.hashSync("a-real-secret-password", 4);
    await pool.query("UPDATE users SET password = $1 WHERE username = ANY($2)", [hash, ["ciso", "cio", "cro", "board"]]);
    resetDemoCache();
    const res = await request(app).get("/auth/demo");
    expect(res.body).toEqual({ demo: false });
    await resetTestDatabase(pool); // restore the demo accounts for the tests below
    tokenCache.clear();
    resetDemoCache();
  });
});

describe("an open session ends when its account changes", () => {
  const signIn = async () => {
    await pool.query(
      `INSERT INTO users (username, password, role) VALUES ('leaver', $1, 'BOARD')
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = 'BOARD', password_changed_at = now() - INTERVAL '1 minute'`,
      [await bcrypt.hash("leaver-pass-1", 4)]
    );
    const res = await request(app).post("/auth/login").send({ username: "leaver", password: "leaver-pass-1" });
    return res.body.token as string;
  };
  const assets = (token: string) => request(app).get("/assets").set("Authorization", `Bearer ${token}`);

  it("keeps working while nothing changes", async () => {
    expect((await assets(await signIn())).status).toBe(200);
  });

  it("ends when the user is deleted", async () => {
    const token = await signIn();
    await pool.query("DELETE FROM users WHERE username = 'leaver'");
    expect((await assets(token)).status).toBe(401);
  });

  it("ends when the role changes", async () => {
    const token = await signIn();
    await pool.query("UPDATE users SET role = 'CIO' WHERE username = 'leaver'");
    expect((await assets(token)).status).toBe(401);
  });

  it("ends when the password changes", async () => {
    const token = await signIn();
    // A second later than the token, as a real change would be.
    await pool.query("UPDATE users SET password_changed_at = now() + INTERVAL '2 seconds' WHERE username = 'leaver'");
    expect((await assets(token)).status).toBe(401);
  });
});

describe("trend charts use imported history only", () => {
  it("charts one point per imported month, oldest first, ending on the latest value", async () => {
    const token = await loginAs("board");
    const ciso = await request(app).get("/dashboard/ciso").set("Authorization", `Bearer ${token}`);
    const posture = ciso.body.securityPostureTrend as { period: string; value: number }[];
    expect(posture.map((p) => p.value)).toEqual([70, 72, 71, 74, 76, 78]);
    expect(posture.map((p) => p.period)).toEqual([...posture.map((p) => p.period)].sort());

    const board = await request(app).get("/dashboard/board").set("Authorization", `Bearer ${token}`);
    expect(board.body.coreBankingUptime.trend.at(-1).value).toBe(99.97);
    expect(board.body.coreBankingUptime.trend).toHaveLength(6);
  });
});

describe("metric names", () => {
  it("lists vulnerability severities most severe first", async () => {
    const token = await loginAs("ciso");
    const res = await request(app).get("/dashboard/ciso").set("Authorization", `Bearer ${token}`);
    expect(res.body.vulnerabilitiesByCriticality.map((v: { severity: string }) => v.severity)).toEqual([
      "Critical",
      "High",
      "Medium",
      "Low",
    ]);
  });

  it("finds a metric whatever its capitalisation", async () => {
    await pool.query("UPDATE metrics SET name = 'change failure rate' WHERE name = 'Change Failure Rate'");
    const token = await loginAs("cio");
    const res = await request(app).get("/dashboard/cio").set("Authorization", `Bearer ${token}`);
    expect(res.body.changeRisk.changeFailureRate).toBe(8.2);
  });
});

describe("metric history", () => {
  const insert = (value: number, start: string, end: string) =>
    pool.query(
      `INSERT INTO metrics (name, category, role_relevance, value, unit, period_start, period_end)
       VALUES ('Security Posture Score', 'security', ARRAY['CISO','BOARD'], $1, 'score', $2, $3)`,
      [value, start, end]
    );
  const posture = async () => {
    const token = await loginAs("ciso");
    const res = await request(app).get("/dashboard/ciso").set("Authorization", `Bearer ${token}`);
    return res.body.securityPostureScore as number;
  };

  it("shows the most recent period when several are imported, not an arbitrary one", async () => {
    await insert(10, "2000-01-01", "2000-01-31"); // older than the seeded (last month) value of 78
    expect(await posture()).toBe(78);
    await insert(91, "2099-01-01", "2099-01-31"); // newer
    expect(await posture()).toBe(91);
  });
});

// Last: it rewrites every user's password_changed_at, which ends cached sessions.
describe("updating an older database", () => {
  it("adds the columns a newer version needs, and is safe to repeat", async () => {
    await pool.query("ALTER TABLE users DROP COLUMN password_changed_at"); // a database from before sessions could be revoked
    await migrate(pool);
    await migrate(pool);
    tokenCache.clear();
    const token = await loginAs("board");
    const res = await request(app).get("/dashboard/board").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
