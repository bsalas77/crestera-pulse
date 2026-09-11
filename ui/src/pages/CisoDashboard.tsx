import { useEffect, useState } from "react";
import { BarChart } from "../components/BarChart";
import { MetricCard } from "../components/MetricCard";
import { Table } from "../components/Table";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { getCisoDashboard } from "../services/api";

interface CisoData {
  securityPostureScore: number;
  securityPostureTrend: { period: string; value: number }[];
  vulnerabilitiesByCriticality: { severity: string; count: number }[];
  securityIncidentsSummary: { total: number; bySeverity: Record<string, number>; mttd: number; mttr: number };
  thirdPartyCyberRiskSummary: { id: string; title: string; residual_score: number; owner: string }[];
  regulatoryMetrics: { id: string; name: string; value: number; unit: string }[];
}

export function CisoDashboard() {
  const [data, setData] = useState<CisoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCisoDashboard().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading || !data) return <div className="loading">Loading CISO dashboard...</div>;

  return (
    <div className="dashboard">
      <h2>CISO — Cyber Risk & Security Posture</h2>

      <div className="grid-3">
        <MetricCard title="Security Posture Score" value={data.securityPostureScore} tone="good" />
        <MetricCard title="Open Security Incidents" value={data.securityIncidentsSummary.total} />
        <MetricCard
          title="MTTD / MTTR"
          value={`${data.securityIncidentsSummary.mttd}h / ${data.securityIncidentsSummary.mttr}h`}
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Security Posture Trend</h3>
          <TimeSeriesChart data={data.securityPostureTrend} />
        </div>
        <div className="card">
          <h3>Vulnerabilities by Criticality</h3>
          <BarChart
            data={data.vulnerabilitiesByCriticality.map((v) => ({ label: v.severity, value: v.count }))}
            color="#b91c1c"
          />
        </div>
      </div>

      <div className="card">
        <h3>Third-Party Cyber Risk</h3>
        <Table
          columns={[
            { header: "Risk", accessor: (r) => r.title },
            { header: "Residual Score", accessor: (r) => r.residual_score },
            { header: "Owner", accessor: (r) => r.owner },
          ]}
          rows={data.thirdPartyCyberRiskSummary}
          keyFn={(r) => r.id}
          emptyLabel="No third-party cyber risks recorded"
        />
      </div>

      <div className="card">
        <h3>Regulatory Metrics (FFIEC)</h3>
        <Table
          columns={[
            { header: "Metric", accessor: (m) => m.name },
            { header: "Value", accessor: (m) => `${m.value} ${m.unit}` },
          ]}
          rows={data.regulatoryMetrics}
          keyFn={(m) => m.id}
          emptyLabel="No regulatory metrics recorded"
        />
      </div>
    </div>
  );
}
