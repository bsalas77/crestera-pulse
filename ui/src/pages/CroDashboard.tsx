import { BarChart } from "../components/BarChart";
import { Heatmap } from "../components/Heatmap";
import { MetricCard } from "../components/MetricCard";
import { Table } from "../components/Table";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { ErrorPanel } from "../components/ErrorPanel";
import { useDashboard } from "../hooks/useDashboard";
import { getCroDashboard } from "../services/api";

interface Risk {
  id: string;
  category: string;
  title: string;
  residual_score: number;
  status: string;
  owner: string;
}

interface IncidentWithImpact {
  id: string;
  type: string;
  severity: string;
  start_time: string;
  impact_description: string | null;
  impact_financial: number | null;
  impact_regulatory: boolean;
}

interface CroData {
  topRisks: Risk[];
  lossEventsSummary: { totalAmount: number; byType: Record<string, number>; trend: { period: string; value: number }[] };
  controlEffectiveness: { averageByFramework: Record<string, number> };
  regulatoryPosture: { openIssuesCount: number; upcomingDeadlinesCount: number };
  businessUnitRiskProfile: { businessUnit: string; riskScore: number }[];
  risksByCategory: { category: string; count: number }[];
  incidentsWithImpact: IncidentWithImpact[];
}

export function CroDashboard() {
  const { data, error, retry } = useDashboard<CroData>(getCroDashboard);

  if (error) return <ErrorPanel message={error} onRetry={retry} />;
  if (!data) return <div className="loading">Loading CRO dashboard...</div>;

  const frameworkBars = Object.entries(data.controlEffectiveness.averageByFramework).map(([label, value]) => ({
    label,
    value,
  }));

  return (
    <div className="dashboard">
      <h2>CRO — Enterprise & Financial Risk</h2>

      <div className="grid-3">
        <MetricCard title="Trailing Loss Total" value={`$${data.lossEventsSummary.totalAmount.toLocaleString()}`} tone="bad" />
        <MetricCard title="Open Regulatory Issues" value={data.regulatoryPosture.openIssuesCount} tone="warn" />
        <MetricCard title="Upcoming Deadlines" value={data.regulatoryPosture.upcomingDeadlinesCount} />
      </div>

      <div className="card">
        <h3>Top Risks Heatmap</h3>
        <Heatmap risks={data.topRisks} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Loss Events Trend</h3>
          <TimeSeriesChart data={data.lossEventsSummary.trend} color="#b91c1c" unit=" USD" emptyLabel="No loss events recorded" />
        </div>
        <div className="card">
          <h3>Control Effectiveness by Framework</h3>
          <BarChart data={frameworkBars} color="#15803d" />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Risks by Category</h3>
          <BarChart
            data={data.risksByCategory.map((r) => ({ label: r.category, value: r.count }))}
            color="#7c3aed"
          />
        </div>
        <div className="card">
          <h3>Business Unit Risk Profile</h3>
          <Table
            columns={[
              { header: "Business Unit", accessor: (r) => r.businessUnit },
              { header: "Avg. Residual Risk Score", accessor: (r) => r.riskScore },
            ]}
            rows={data.businessUnitRiskProfile}
            keyFn={(r) => r.businessUnit}
          />
        </div>
      </div>

      <div className="card">
        <h3>Incidents with Financial or Regulatory Impact</h3>
        <Table
          columns={[
            { header: "Type", accessor: (i) => i.type },
            { header: "Severity", accessor: (i) => i.severity },
            { header: "Date", accessor: (i) => new Date(i.start_time).toLocaleDateString() },
            { header: "Financial Impact", accessor: (i) => (i.impact_financial != null ? `$${i.impact_financial.toLocaleString()}` : "—") },
            { header: "Regulatory", accessor: (i) => (i.impact_regulatory ? "Yes" : "No") },
          ]}
          rows={data.incidentsWithImpact}
          keyFn={(i) => i.id}
          emptyLabel="No incidents with financial or regulatory impact"
        />
      </div>
    </div>
  );
}
