import { Bar, BarChart as RechartsBarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  color?: string;
  /** Per-bar color keyed by `label`, e.g. severity. Overrides `color` for matching bars. */
  colorByLabel?: Record<string, string>;
  height?: number;
}

export function BarChart({ data, color = "#2563eb", colorByLabel, height = 220 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]}>
          {colorByLabel &&
            data.map((d) => <Cell key={d.label} fill={colorByLabel[d.label] ?? color} />)}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
