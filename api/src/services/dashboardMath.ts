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

/** Sums an `amount` column into monthly buckets, sorted chronologically. */
export function sumAmountByMonth(rows: { date: string | Date; amount: string | number }[]): TrendPoint[] {
  const totals = rows.reduce<Record<string, number>>((acc, r) => {
    const period = toPeriod(r.date);
    acc[period] = (acc[period] ?? 0) + toNumber(r.amount);
    return acc;
  }, {});
  return Object.entries(totals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }));
}

/**
 * Seed data only carries a single point-in-time value per metric.
 * Trends are synthesized around that value so charts have something to render;
 * a real integration would source this from a metrics time-series table.
 */
export function synthesizeTrend(current: number, points = 6, spread = 0.03, maxValue?: number): TrendPoint[] {
  const trend: TrendPoint[] = [];
  const now = new Date();
  for (let i = points - 1; i >= 0; i--) {
    const periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const wobble = 1 + spread * Math.sin(i * 1.3) * (i === 0 ? 0 : 1);
    let value = i === 0 ? current : Math.round(current * wobble * 100) / 100;
    if (maxValue !== undefined) value = Math.min(value, maxValue);
    trend.push({ period: periodDate.toISOString().slice(0, 7), value });
  }
  return trend;
}
