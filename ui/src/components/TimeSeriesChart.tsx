import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TimeSeriesPoint {
  period: string;
  value: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  color?: string;
  unit?: string;
  height?: number;
  /** Fit the value axis to the data instead of starting at 0 (e.g. uptime, where 99.6 vs 99.97 matters). */
  zoom?: boolean;
  emptyLabel?: string;
}

export function TimeSeriesChart({
  data,
  color = "#2563eb",
  unit = "",
  height = 220,
  zoom = false,
  emptyLabel = "No data imported yet",
}: TimeSeriesChartProps) {
  // Only real, imported points are charted; say so plainly rather than draw a line from one point.
  if (data.length === 0) return <div className="table-empty">{emptyLabel}</div>;
  if (data.length === 1) {
    return (
      <div className="table-empty">
        One month of data so far ({data[0].period}: {data[0].value}
        {unit}). The trend line appears once a second month is imported.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={zoom ? ["auto", "auto"] : [0, "auto"]} />
        <Tooltip formatter={(value) => [`${value ?? ""}${unit}`, "Value"]} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
