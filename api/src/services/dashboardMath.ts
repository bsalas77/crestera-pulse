export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : parseFloat(value);
}

export function toPeriod(date: string | Date): string {
  const iso = date instanceof Date ? date.toISOString() : date;
  return iso.slice(0, 7);
}

export interface TrendPoint {
  period: string;
  value: number;
}

/** "2026-08" → "2026-09" (months are 1-based in the string). */
function nextPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

/**
 * Sums an `amount` column into monthly buckets, sorted chronologically. Months
 * between the first and last loss with nothing in them appear as 0, so a quiet
 * month reads as quiet rather than vanishing from the chart.
 */
export function sumAmountByMonth(rows: { date: string | Date; amount: string | number }[]): TrendPoint[] {
  const totals = rows.reduce<Record<string, number>>((acc, r) => {
    const period = toPeriod(r.date);
    acc[period] = (acc[period] ?? 0) + toNumber(r.amount);
    return acc;
  }, {});
  const periods = Object.keys(totals).sort();
  if (periods.length === 0) return [];

  const trend: TrendPoint[] = [];
  const last = periods[periods.length - 1];
  for (let p = periods[0]; p <= last; p = nextPeriod(p)) {
    trend.push({ period: p, value: totals[p] ?? 0 });
  }
  return trend;
}
