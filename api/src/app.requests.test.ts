import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";

// No database needed: the body parser rejects these before any route runs.
describe("malformed requests get a 4xx, not a server error", () => {
  const app = createApp();

  it("answers malformed JSON with 400", async () => {
    const res = await request(app).post("/auth/login").set("Content-Type", "application/json").send("{not json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Malformed request body" });
  });

  it("answers an oversized body with 413", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "x".repeat(20_000), password: "y" });
    expect(res.status).toBe(413);
  });

  it("does not advertise Express", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
