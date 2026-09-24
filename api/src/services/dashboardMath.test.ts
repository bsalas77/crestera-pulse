import { describe, expect, it } from "vitest";
import { sumAmountByMonth, toNumber, toPeriod } from "./dashboardMath";

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

  it("shows months with no losses as 0 instead of dropping them, across a year end", () => {
    const result = sumAmountByMonth([
      { date: "2025-11-03", amount: 10 },
      { date: "2026-02-20", amount: 5 },
    ]);
    expect(result).toEqual([
      { period: "2025-11", value: 10 },
      { period: "2025-12", value: 0 },
      { period: "2026-01", value: 0 },
      { period: "2026-02", value: 5 },
    ]);
  });

  it("returns an empty array for no rows", () => {
    expect(sumAmountByMonth([])).toEqual([]);
  });
});
