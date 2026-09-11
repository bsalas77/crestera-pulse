interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}

const toneColors: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  neutral: "#334155",
  good: "#15803d",
  warn: "#b45309",
  bad: "#b91c1c",
};

export function MetricCard({ title, value, subtitle, tone = "neutral" }: MetricCardProps) {
  return (
    <div className="card metric-card">
      <div className="metric-card-title">{title}</div>
      <div className="metric-card-value" style={{ color: toneColors[tone] }}>
        {value}
      </div>
      {subtitle && <div className="metric-card-subtitle">{subtitle}</div>}
    </div>
  );
}
