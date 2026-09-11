import { describe, expect, it } from "vitest";
import { sumAmountByMonth, synthesizeTrend, toNumber, toPeriod } from "./dashboardMath";

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

describe("sumAmountByMonth", () => {
  it("sums amounts within the same month", () => {
    const result = sumAmountByMonth([
      { date: "2026-08-01", amount: "100" },
      { date: "2026-08-19", amount: 50 },
    ]);
    expect(result).toEqual([{ period: "2026-08", value: 150 }]);
  });

  it("sorts buckets chronologically regardless of input order", () => {
    const result = sumAmountByMonth([
      { date: "2026-09-01", amount: 1 },
      { date: "2026-07-01", amount: 1 },
      { date: "2026-08-01", amount: 1 },
    ]);
    expect(result.map((r) => r.period)).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("returns an empty array for no rows", () => {
    expect(sumAmountByMonth([])).toEqual([]);
  });
});
