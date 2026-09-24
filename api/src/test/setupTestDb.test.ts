import { describe, expect, it } from "vitest";
import { assertSafeToReset } from "./setupTestDb";

describe("assertSafeToReset", () => {
  it("allows a database named *_test", () => {
    expect(() => assertSafeToReset("dashboard_test", undefined)).not.toThrow();
  });

  it("refuses the default application database", () => {
    expect(() => assertSafeToReset("dashboard", undefined)).toThrow(/Refusing to wipe/);
  });

  it("allows any database with an explicit opt-in", () => {
    expect(() => assertSafeToReset("dashboard", "true")).not.toThrow();
  });
});
