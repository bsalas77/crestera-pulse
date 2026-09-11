import { query, queryOne } from "../db/pool";
import { synthesizeTrend, toNumber, toPeriod } from "./dashboardMath";

interface MetricRow {
  id: string;
  name: string;
  category: string;
  role_relevance: string[];
  value: string;
  unit: string;
  period_start: string;
  period_end: string;
  source_system: string;
}

async function getMetricByName(name: string): Promise<MetricRow | null> {
  return queryOne<MetricRow>("SELECT * FROM metrics WHERE name = $1 LIMIT 1", [name]);
}

export async function getCisoDashboard() {
  const [postureMetric, incidents, cyberRisks, regulatoryMetrics, mttd, mttr] = await Promise.all([
    getMetricByName("Security Posture Score"),
    query<{ severity: string; type: string }>("SELECT severity, type FROM incidents WHERE type = 'security'"),
    query(
      `SELECT r.* FROM risks r
       JOIN organizations o ON o.id = r.business_unit_id
       WHERE r.category = 'cyber' AND (o.name ILIKE '%vendor%' OR o.name ILIKE '%third-party%')`
    ),
    query(
      `SELECT m.* FROM metrics m
       JOIN metric_dimensions md ON md.metric_id = m.id
       WHERE m.category = 'security' AND md.key = 'framework' AND md.value = 'FFIEC'`
    ),
    getMetricByName("Mean Time to Detect"),
    getMetricByName("Mean Time to Respond"),
  ]);

  const vulnerabilityMetrics = await query<MetricRow>(
    "SELECT * FROM metrics WHERE name ILIKE '%Vulnerabilities Open%' ORDER BY name"
  );

  const bySeverity = incidents.reduce<Record<string, number>>((acc, row) => {
    acc[row.severity] = (acc[row.severity] ?? 0) + 1;
    return acc;
  }, {});

  const securityPostureScore = toNumber(postureMetric?.value);

  return {
    securityPostureScore,
    securityPostureTrend: synthesizeTrend(securityPostureScore),
    vulnerabilitiesByCriticality: vulnerabilityMetrics.map((m) => ({
      severity: m.name.replace(" Vulnerabilities Open", ""),
      count: toNumber(m.value),
    })),
    securityIncidentsSummary: {
      total: incidents.length,
      bySeverity,
      mttd: toNumber(mttd?.value),
      mttr: toNumber(mttr?.value),
    },
    thirdPartyCyberRiskSummary: cyberRisks,
    regulatoryMetrics,
  };
}

export async function getCioDashboard() {
  const [coreUptime, onlineUptime, mobileUptime, atmUptime, callCenter, changeFailureRate, cpu, memory, storage] =
    await Promise.all([
      getMetricByName("Core Banking Uptime"),
      getMetricByName("Online Banking Uptime"),
      getMetricByName("Mobile Banking Uptime"),
      getMetricByName("ATM Availability"),
      getMetricByName("Call Center SLA Adherence"),
      getMetricByName("Change Failure Rate"),
      getMetricByName("CPU Utilization"),
      getMetricByName("Memory Utilization"),
      getMetricByName("Storage Utilization"),
    ]);

  const [itIncidents, legacyAssets, eolRisks] = await Promise.all([
    query<{ id: string }>("SELECT id FROM incidents WHERE type = 'it'"),
    query<{ id: string }>("SELECT id FROM assets WHERE name ILIKE '%legacy%'"),
    query<{ id: string }>("SELECT id FROM risks WHERE title ILIKE '%EOL%' OR title ILIKE '%end-of-support%'"),
  ]);

  const coreUptimeValue = toNumber(coreUptime?.value);

  return {
    coreBankingUptime: {
      current: coreUptimeValue,
      trend: synthesizeTrend(coreUptimeValue, 6, 0.002, 100),
    },
    channelPerformance: {
      online: toNumber(onlineUptime?.value),
      mobile: toNumber(mobileUptime?.value),
      atm: toNumber(atmUptime?.value),
      callCenter: toNumber(callCenter?.value),
    },
    changeRisk: {
      changeFailureRate: toNumber(changeFailureRate?.value),
      incidentsLinkedToChanges: itIncidents.length,
    },
    techDebtSummary: {
      legacyAssetCount: legacyAssets.length,
      endOfSupportAssetCount: eolRisks.length,
    },
    capacityMetrics: {
      cpuUtilization: toNumber(cpu?.value),
      memoryUtilization: toNumber(memory?.value),
      storageUtilization: toNumber(storage?.value),
    },
  };
}

export async function getCroDashboard() {
  const [topRisks, lossEvents, controls, openIssues, upcomingDeadlines, businessUnitRisk] = await Promise.all([
    query("SELECT * FROM risks ORDER BY residual_score DESC NULLS LAST LIMIT 5"),
    query<{ type: string; amount: string; date: string | Date }>(
      "SELECT type, amount, date FROM loss_events ORDER BY date"
    ),
    query<{ framework: string; effectiveness_score: string }>(
      "SELECT framework, effectiveness_score FROM controls"
    ),
    getMetricByName("Open Regulatory Issues"),
    getMetricByName("Upcoming Regulatory Deadlines"),
    query<{ business_unit: string; risk_score: string }>(
      `SELECT o.name AS business_unit, AVG(r.residual_score) AS risk_score
       FROM risks r JOIN organizations o ON o.id = r.business_unit_id
       GROUP BY o.name ORDER BY risk_score DESC NULLS LAST`
    ),
  ]);

  const totalAmount = lossEvents.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const byType = lossEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + toNumber(e.amount);
    return acc;
  }, {});
  const trendByMonth = lossEvents.reduce<Record<string, number>>((acc, e) => {
    const period = toPeriod(e.date);
    acc[period] = (acc[period] ?? 0) + toNumber(e.amount);
    return acc;
  }, {});

  const frameworkTotals = controls.reduce<Record<string, { sum: number; count: number }>>((acc, c) => {
    const bucket = acc[c.framework] ?? { sum: 0, count: 0 };
    bucket.sum += toNumber(c.effectiveness_score);
    bucket.count += 1;
    acc[c.framework] = bucket;
    return acc;
  }, {});
  const averageByFramework = Object.fromEntries(
    Object.entries(frameworkTotals).map(([framework, { sum, count }]) => [
      framework,
      Math.round((sum / count) * 10) / 10,
    ])
  );

  return {
    topRisks,
    lossEventsSummary: {
      totalAmount,
      byType,
      trend: Object.entries(trendByMonth).map(([period, value]) => ({ period, value })),
    },
    controlEffectiveness: { averageByFramework },
    regulatoryPosture: {
      openIssuesCount: toNumber(openIssues?.value),
      upcomingDeadlinesCount: toNumber(upcomingDeadlines?.value),
    },
    businessUnitRiskProfile: businessUnitRisk.map((row) => ({
      businessUnit: row.business_unit,
      riskScore: Math.round(toNumber(row.risk_score) * 10) / 10,
    })),
  };
}

export async function getBoardDashboard() {
  const [postureMetric, coreUptime, topRisks, lossEvents, openIssues, upcomingDeadlines] = await Promise.all([
    getMetricByName("Security Posture Score"),
    getMetricByName("Core Banking Uptime"),
    query("SELECT * FROM risks ORDER BY residual_score DESC NULLS LAST LIMIT 5"),
    query<{ amount: string; date: string }>(
      "SELECT amount, date FROM loss_events WHERE date >= (CURRENT_DATE - INTERVAL '12 months')"
    ),
    getMetricByName("Open Regulatory Issues"),
    getMetricByName("Upcoming Regulatory Deadlines"),
  ]);

  const coreUptimeValue = toNumber(coreUptime?.value);
  const lossEventsLast12Months = lossEvents.reduce((sum, e) => sum + toNumber(e.amount), 0);

  return {
    overallSecurityPostureScore: toNumber(postureMetric?.value),
    coreBankingUptime: {
      current: coreUptimeValue,
      trend: synthesizeTrend(coreUptimeValue, 6, 0.002, 100),
    },
    topEnterpriseRisks: topRisks,
    lossEventsLast12Months,
    regulatoryComplianceStatus: {
      openIssuesCount: toNumber(openIssues?.value),
      upcomingDeadlinesCount: toNumber(upcomingDeadlines?.value),
    },
  };
}
