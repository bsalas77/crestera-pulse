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
}

export function TimeSeriesChart({ data, color = "#2563eb", unit = "", height = 220 }: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: number) => [`${value}${unit}`, "Value"]} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
