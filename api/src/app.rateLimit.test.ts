import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";

// An empty body is rejected with 400 before any DB access, so these tests
// exercise the limiter alone (it counts every request, whatever the status).
async function attempts(app: ReturnType<typeof createApp>, count: number, forwardedFor: string) {
  const statuses: number[] = [];
  for (let i = 0; i < count; i++) {
    const res = await request(app).post("/auth/login").set("X-Forwarded-For", forwardedFor).send({});
    statuses.push(res.status);
  }
  return statuses;
}

describe("login rate limiter", () => {
  it("throttles the 11th attempt within a minute", async () => {
    const statuses = await attempts(createApp({ trustProxyHops: 0 }), 11, "9.9.9.9");
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("ignores a spoofed X-Forwarded-For when no proxy is trusted", async () => {
    const app = createApp({ trustProxyHops: 0 });
    await attempts(app, 10, "1.1.1.1");
    const [status] = await attempts(app, 1, "2.2.2.2");
    expect(status).toBe(429);
  });

  it("counts each client separately behind one trusted proxy", async () => {
    const app = createApp({ trustProxyHops: 1 });
    await attempts(app, 10, "1.1.1.1");
    expect((await attempts(app, 1, "1.1.1.1"))[0]).toBe(429);
    expect((await attempts(app, 1, "2.2.2.2"))[0]).toBe(400);
  });
});
