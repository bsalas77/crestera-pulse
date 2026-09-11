import { describe, expect, it } from "vitest";
import { validateEnv } from "./validateEnv";

const goodEnv = {
  JWT_SECRET: "a".repeat(40),
  DB_PASS: "a-real-password",
  CORS_ORIGIN: "https://dashboard.example.com",
};

describe("validateEnv", () => {
  it("passes with a fully configured production env", () => {
    const report = validateEnv(goodEnv, true);
    expect(report.errors).toEqual([]);
  });

  it("errors in production when JWT_SECRET is missing", () => {
    const report = validateEnv({ ...goodEnv, JWT_SECRET: undefined }, true);
    expect(report.errors).toContain("JWT_SECRET is required to sign tokens.");
  });

  it("errors in production when JWT_SECRET is the default placeholder", () => {
    const report = validateEnv({ ...goodEnv, JWT_SECRET: "some-dev-secret" }, true);
    expect(report.errors.some((e) => e.includes("example/default value"))).toBe(true);
  });

  it("errors in production when JWT_SECRET is too short", () => {
    const report = validateEnv({ ...goodEnv, JWT_SECRET: "short" }, true);
    expect(report.errors.some((e) => e.includes("32 characters"))).toBe(true);
  });

  it("errors in production when DB_PASS is the default", () => {
    const report = validateEnv({ ...goodEnv, DB_PASS: "dashboard_pass" }, true);
    expect(report.errors.some((e) => e.includes("DB_PASS"))).toBe(true);
  });

  it("errors in production when CORS_ORIGIN is a wildcard", () => {
    const report = validateEnv({ ...goodEnv, CORS_ORIGIN: "*" }, true);
    expect(report.errors.some((e) => e.includes("CORS_ORIGIN"))).toBe(true);
  });

  it("downgrades the same issues to warnings outside production", () => {
    const report = validateEnv({ JWT_SECRET: "some-dev-secret" }, false);
    expect(report.errors).toEqual([]);
    expect(report.warnings.length).toBeGreaterThan(0);
  });
});
