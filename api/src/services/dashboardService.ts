import { query, queryOne } from "../db/pool";
import { sumAmountByMonth, synthesizeTrend, toNumber } from "./dashboardMath";

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

/** Average control effectiveness_score per framework — shared by the CISO and CRO views. */
async function getControlEffectivenessByFramework(): Promise<Record<string, number>> {
  const controls = await query<{ framework: string; effectiveness_score: string }>(
    "SELECT framework, effectiveness_score FROM controls"
  );

  const totals = controls.reduce<Record<string, { sum: number; count: number }>>((acc, c) => {
    const bucket = acc[c.framework] ?? { sum: 0, count: 0 };
    bucket.sum += toNumber(c.effectiveness_score);
    bucket.count += 1;
    acc[c.framework] = bucket;
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(totals).map(([framework, { sum, count }]) => [framework, Math.round((sum / count) * 10) / 10])
  );
}

export async function getCisoDashboard() {
  const [postureMetric, incidents, cyberRisks, topCyberRisks, controlEffectivenessByFramework, regulatoryMetrics, mttd, mttr] =
    await Promise.all([
      getMetricByName("Security Posture Score"),
      query<{ severity: string; type: string }>("SELECT severity, type FROM incidents WHERE type = 'security'"),
      query(
        `SELECT r.* FROM risks r
         JOIN organizations o ON o.id = r.business_unit_id
         WHERE r.category = 'cyber' AND (o.name ILIKE '%vendor%' OR o.name ILIKE '%third-party%')`
      ),
      query("SELECT * FROM risks WHERE category = 'cyber' ORDER BY residual_score DESC NULLS LAST LIMIT 5"),
      getControlEffectivenessByFramework(),
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
    topCyberRisks,
    controlEffectiveness: { averageByFramework: controlEffectivenessByFramework },
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

  const [itIncidents, legacyAssets, eolRisks, applications, assetsByCriticality] = await Promise.all([
    query<{ id: string }>("SELECT id FROM incidents WHERE type = 'it'"),
    query<{ id: string }>("SELECT id FROM assets WHERE name ILIKE '%legacy%'"),
    query<{ id: string }>("SELECT id FROM risks WHERE title ILIKE '%EOL%' OR title ILIKE '%end-of-support%'"),
    query<{ id: string; name: string; category: string; rto_hours: number | null; rpo_hours: number | null; sla_uptime_target: string | null }>(
      "SELECT id, name, category, rto_hours, rpo_hours, sla_uptime_target FROM applications ORDER BY name"
    ),
    query<{ criticality: number; count: string }>(
      "SELECT criticality, COUNT(*) AS count FROM assets GROUP BY criticality ORDER BY criticality DESC"
    ),
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
    applicationPortfolio: applications.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      rtoHours: a.rto_hours,
      rpoHours: a.rpo_hours,
      slaUptimeTarget: toNumber(a.sla_uptime_target),
    })),
    assetsByCriticality: assetsByCriticality.map((row) => ({
      criticality: row.criticality,
      count: toNumber(row.count),
    })),
  };
}

export async function getCroDashboard() {
  const [
    topRisks,
    lossEvents,
    controlEffectivenessByFramework,
    openIssues,
    upcomingDeadlines,
    businessUnitRisk,
    risksByCategory,
    incidentsWithImpact,
  ] = await Promise.all([
    query("SELECT * FROM risks ORDER BY residual_score DESC NULLS LAST LIMIT 5"),
    query<{ type: string; amount: string; date: string | Date }>(
      "SELECT type, amount, date FROM loss_events ORDER BY date"
    ),
    getControlEffectivenessByFramework(),
    getMetricByName("Open Regulatory Issues"),
    getMetricByName("Upcoming Regulatory Deadlines"),
    query<{ business_unit: string; risk_score: string }>(
      `SELECT o.name AS business_unit, AVG(r.residual_score) AS risk_score
       FROM risks r JOIN organizations o ON o.id = r.business_unit_id
       GROUP BY o.name ORDER BY risk_score DESC NULLS LAST`
    ),
    query<{ category: string; count: string }>("SELECT category, COUNT(*) AS count FROM risks GROUP BY category ORDER BY category"),
    query<{
      id: string;
      type: string;
      severity: string;
      start_time: string;
      impact_description: string | null;
      impact_financial: string | null;
      impact_regulatory: boolean;
    }>(
      `SELECT id, type, severity, start_time, impact_description, impact_financial, impact_regulatory
       FROM incidents
       WHERE impact_financial IS NOT NULL OR impact_regulatory = TRUE
       ORDER BY start_time DESC
       LIMIT 10`
    ),
  ]);

  const totalAmount = lossEvents.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const byType = lossEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + toNumber(e.amount);
    return acc;
  }, {});

  return {
    topRisks,
    lossEventsSummary: {
      totalAmount,
      byType,
      trend: sumAmountByMonth(lossEvents),
    },
    controlEffectiveness: { averageByFramework: controlEffectivenessByFramework },
    regulatoryPosture: {
      openIssuesCount: toNumber(openIssues?.value),
      upcomingDeadlinesCount: toNumber(upcomingDeadlines?.value),
    },
    businessUnitRiskProfile: businessUnitRisk.map((row) => ({
      businessUnit: row.business_unit,
      riskScore: Math.round(toNumber(row.risk_score) * 10) / 10,
    })),
    risksByCategory: risksByCategory.map((row) => ({ category: row.category, count: toNumber(row.count) })),
    incidentsWithImpact: incidentsWithImpact.map((inc) => ({
      ...inc,
      impact_financial: inc.impact_financial === null ? null : toNumber(inc.impact_financial),
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
    lossEventsTrend: sumAmountByMonth(lossEvents),
    regulatoryComplianceStatus: {
      openIssuesCount: toNumber(openIssues?.value),
      upcomingDeadlinesCount: toNumber(upcomingDeadlines?.value),
    },
  };
}
