import { useEffect, useState } from "react";
import { Heatmap } from "../components/Heatmap";
import { MetricCard } from "../components/MetricCard";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { getBoardDashboard } from "../services/api";

interface Risk {
  id: string;
  category: string;
  title: string;
  residual_score: number;
}

interface BoardData {
  overallSecurityPostureScore: number;
  coreBankingUptime: { current: number; trend: { period: string; value: number }[] };
  topEnterpriseRisks: Risk[];
  lossEventsLast12Months: number;
  regulatoryComplianceStatus: { openIssuesCount: number; upcomingDeadlinesCount: number };
}

export function BoardDashboard() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBoardDashboard().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading || !data) return <div className="loading">Loading Board dashboard...</div>;

  return (
    <div className="dashboard">
      <h2>Board — Executive Summary</h2>

      <div className="grid-4">
        <MetricCard title="Security Posture" value={data.overallSecurityPostureScore} tone="good" />
        <MetricCard title="Core Banking Uptime" value={`${data.coreBankingUptime.current}%`} tone="good" />
        <MetricCard title="Losses (12mo)" value={`$${data.lossEventsLast12Months.toLocaleString()}`} tone="bad" />
        <MetricCard
          title="Regulatory Issues Open"
          value={data.regulatoryComplianceStatus.openIssuesCount}
          tone="warn"
        />
      </div>

      <div className="card">
        <h3>Core Banking Uptime Trend</h3>
        <TimeSeriesChart data={data.coreBankingUptime.trend} unit="%" />
      </div>

      <div className="card">
        <h3>Top Enterprise Risks</h3>
        <Heatmap risks={data.topEnterpriseRisks} />
      </div>
    </div>
  );
}
