import { describe, expect, it } from "vitest";
import { describeDbError } from "./dbErrors";

const target = { host: "db", port: 5432, user: "dashboard", database: "dashboard" };

describe("describeDbError", () => {
  it("explains an unreachable database", () => {
    expect(describeDbError({ code: "ECONNREFUSED" }, target)).toMatch(/Can't reach the database at db:5432/);
  });

  it("explains a DB_PASS that no longer matches the volume", () => {
    expect(describeDbError({ code: "28P01" }, target)).toMatch(/DB_PASS in \.env doesn't match.*docker compose down -v/s);
  });

  it("explains a renamed database", () => {
    expect(describeDbError({ code: "3D000" }, target)).toMatch(/"dashboard" doesn't exist/);
  });

  it("returns null for anything else", () => {
    expect(describeDbError(new Error("boom"), target)).toBeNull();
    expect(describeDbError(undefined, target)).toBeNull();
  });
});
