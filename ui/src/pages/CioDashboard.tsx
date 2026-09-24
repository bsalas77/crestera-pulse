import { BarChart } from "../components/BarChart";
import { MetricCard } from "../components/MetricCard";
import { Table } from "../components/Table";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { ErrorPanel } from "../components/ErrorPanel";
import { useDashboard } from "../hooks/useDashboard";
import { getCioDashboard } from "../services/api";

interface Application {
  id: string;
  name: string;
  category: string;
  rtoHours: number | null;
  rpoHours: number | null;
  slaUptimeTarget: number;
}

interface CioData {
  coreBankingUptime: { current: number; trend: { period: string; value: number }[] };
  channelPerformance: { online: number; mobile: number; atm: number; callCenter: number };
  changeRisk: { changeFailureRate: number; incidentsLinkedToChanges: number };
  techDebtSummary: { legacyAssetCount: number; endOfSupportAssetCount: number };
  capacityMetrics: { cpuUtilization: number; memoryUtilization: number; storageUtilization: number };
  applicationPortfolio: Application[];
  assetsByCriticality: { criticality: number; count: number }[];
}

export function CioDashboard() {
  const { data, error, retry } = useDashboard<CioData>(getCioDashboard);

  if (error) return <ErrorPanel message={error} onRetry={retry} />;
  if (!data) return <div className="loading">Loading CIO dashboard...</div>;

  return (
    <div className="dashboard">
      <h2>CIO — Technology Performance & Resilience</h2>

      <div className="grid-3">
        <MetricCard title="Core Banking Uptime" value={`${data.coreBankingUptime.current}%`} tone="good" />
        <MetricCard title="Change Failure Rate" value={`${data.changeRisk.changeFailureRate}%`} tone="warn" />
        <MetricCard title="Incidents Linked to Changes" value={data.changeRisk.incidentsLinkedToChanges} />
      </div>

      <div className="card">
        <h3>Core Banking Uptime Trend</h3>
        <TimeSeriesChart data={data.coreBankingUptime.trend} unit="%" />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Channel Performance</h3>
          <div className="grid-4">
            <MetricCard title="Online Banking" value={`${data.channelPerformance.online}%`} />
            <MetricCard title="Mobile Banking" value={`${data.channelPerformance.mobile}%`} />
            <MetricCard title="ATM Network" value={`${data.channelPerformance.atm}%`} />
            <MetricCard title="Call Center SLA" value={`${data.channelPerformance.callCenter}%`} />
          </div>
        </div>
        <div className="card">
          <h3>Capacity Utilization</h3>
          <BarChart
            data={[
              { label: "CPU", value: data.capacityMetrics.cpuUtilization },
              { label: "Memory", value: data.capacityMetrics.memoryUtilization },
              { label: "Storage", value: data.capacityMetrics.storageUtilization },
            ]}
            color="#2563eb"
          />
        </div>
      </div>

      <div className="card">
        <h3>Tech Debt Summary</h3>
        <div className="grid-2">
          <MetricCard title="Legacy Assets" value={data.techDebtSummary.legacyAssetCount} tone="warn" />
          <MetricCard title="End-of-Support Risks" value={data.techDebtSummary.endOfSupportAssetCount} tone="warn" />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Application Portfolio</h3>
          <Table
            columns={[
              { header: "Application", accessor: (a) => a.name },
              { header: "Category", accessor: (a) => a.category },
              { header: "RTO (h)", accessor: (a) => a.rtoHours ?? "—" },
              { header: "RPO (h)", accessor: (a) => a.rpoHours ?? "—" },
              { header: "SLA Target", accessor: (a) => `${a.slaUptimeTarget}%` },
            ]}
            rows={data.applicationPortfolio}
            keyFn={(a) => a.id}
            emptyLabel="No applications recorded"
          />
        </div>
        <div className="card">
          <h3>Assets by Criticality</h3>
          <BarChart
            data={data.assetsByCriticality.map((a) => ({ label: `Level ${a.criticality}`, value: a.count }))}
            color="#2563eb"
          />
        </div>
      </div>
    </div>
  );
}
