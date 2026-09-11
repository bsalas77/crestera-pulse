import { describe, expect, it } from "vitest";
import { synthesizeTrend, toNumber, toPeriod } from "./dashboardMath";

describe("toNumber", () => {
  it("returns 0 for null/undefined", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });

  it("parses numeric strings from Postgres NUMERIC columns", () => {
    expect(toNumber("78.5")).toBe(78.5);
  });

  it("passes numbers through unchanged", () => {
    expect(toNumber(42)).toBe(42);
  });
});

describe("toPeriod", () => {
  it("truncates an ISO date string to YYYY-MM", () => {
    expect(toPeriod("2026-08-19")).toBe("2026-08");
  });

  it("handles a JS Date object (what pg returns for DATE columns)", () => {
    expect(toPeriod(new Date(Date.UTC(2026, 7, 19)))).toBe("2026-08");
  });
});

describe("synthesizeTrend", () => {
  it("ends on the current value for the most recent period", () => {
    const trend = synthesizeTrend(99.97, 6, 0.002);
    expect(trend).toHaveLength(6);
    expect(trend[trend.length - 1].value).toBe(99.97);
  });

  it("clamps synthesized points to maxValue when given", () => {
    const trend = synthesizeTrend(99.97, 6, 0.05, 100);
    for (const point of trend) {
      expect(point.value).toBeLessThanOrEqual(100);
    }
  });

  it("produces chronologically increasing YYYY-MM periods", () => {
    const trend = synthesizeTrend(50, 4);
    const periods = trend.map((p) => p.period);
    expect(periods).toEqual([...periods].sort());
  });
});
