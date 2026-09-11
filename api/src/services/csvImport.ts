import { randomUUID } from "node:crypto";

export type RawRow = Record<string, string>;

export interface OrganizationRecord {
  id: string;
  name: string;
  type: string;
}

export interface AssetRecord {
  id: string;
  name: string;
  type: string;
  criticality: number;
  environment: string;
  business_unit_id: string | null;
  owner: string | null;
}

export interface ApplicationRecord {
  id: string;
  name: string;
  category: string;
  rto_hours: number | null;
  rpo_hours: number | null;
  sla_uptime_target: number | null;
  business_owner: string | null;
  technical_owner: string | null;
  business_unit_id: string | null;
}

export interface RiskRecord {
  id: string;
  category: string;
  title: string;
  description: string | null;
  inherent_score: number | null;
  residual_score: number | null;
  status: string;
  owner: string | null;
  business_unit_id: string | null;
}

export interface ControlRecord {
  id: string;
  name: string;
  framework: string;
  type: string;
  effectiveness_score: number | null;
  owner: string | null;
}

export interface IncidentRecord {
  id: string;
  type: string;
  severity: string;
  start_time: string;
  end_time: string | null;
  impact_description: string | null;
  impact_financial: number | null;
  impact_regulatory: boolean;
  business_unit_id: string | null;
}

export interface LossEventRecord {
  id: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  cause: string | null;
  business_unit_id: string | null;
}

export interface MetricRecord {
  id: string;
  name: string;
  category: string;
  role_relevance: string[];
  value: number;
  unit: string;
  period_start: string;
  period_end: string;
  source_system: string | null;
}

export interface LinkRecord {
  a: string;
  b: string;
}

function required(row: RawRow, field: string, context: string): string {
  const value = row[field]?.trim();
  if (!value) {
    throw new Error(`${context}: missing required field "${field}"`);
  }
  return value;
}

function optional(row: RawRow, field: string): string | null {
  const value = row[field]?.trim();
  return value ? value : null;
}

function requiredNumber(row: RawRow, field: string, context: string): number {
  const raw = required(row, field, context);
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${context}: field "${field}" is not a number ("${raw}")`);
  }
  return value;
}

function optionalNumber(row: RawRow, field: string, context: string): number | null {
  const raw = row[field]?.trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${context}: field "${field}" is not a number ("${raw}")`);
  }
  return value;
}

function resolveByName(map: Map<string, string>, name: string, context: string, kind: string): string {
  const id = map.get(name);
  if (!id) {
    throw new Error(`${context}: unknown ${kind} "${name}" — it must appear in organizations.csv first`);
  }
  return id;
}

function resolveOptionalBusinessUnit(row: RawRow, orgByName: Map<string, string>, context: string): string | null {
  const name = row.business_unit?.trim();
  if (!name) return null;
  return resolveByName(orgByName, name, context, "organization");
}

function resolveByExternalId(map: Map<string, string>, externalId: string, context: string, kind: string): string {
  const id = map.get(externalId);
  if (!id) {
    throw new Error(`${context}: unknown ${kind} external_id "${externalId}"`);
  }
  return id;
}

export function resolveOrganizations(rows: RawRow[]): {
  records: OrganizationRecord[];
  byName: Map<string, string>;
} {
  const byName = new Map<string, string>();
  const records: OrganizationRecord[] = [];

  rows.forEach((row, i) => {
    const context = `organizations.csv row ${i + 1}`;
    const name = required(row, "name", context);
    if (byName.has(name)) {
      throw new Error(`${context}: duplicate organization name "${name}"`);
    }
    const id = randomUUID();
    byName.set(name, id);
    records.push({ id, name, type: required(row, "type", context) });
  });

  return { records, byName };
}

export function buildAssets(
  rows: RawRow[],
  orgByName: Map<string, string>
): { records: AssetRecord[]; byExternalId: Map<string, string> } {
  const byExternalId = new Map<string, string>();
  const records: AssetRecord[] = [];

  rows.forEach((row, i) => {
    const context = `assets.csv row ${i + 1}`;
    const id = randomUUID();
    const criticality = requiredNumber(row, "criticality", context);
    if (criticality < 1 || criticality > 5 || !Number.isInteger(criticality)) {
      throw new Error(`${context}: "criticality" must be a whole number 1-5, got ${criticality}`);
    }
    records.push({
      id,
      name: required(row, "name", context),
      type: required(row, "type", context),
      criticality,
      environment: required(row, "environment", context),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, context),
      owner: optional(row, "owner"),
    });
    const externalId = row.external_id?.trim();
    if (externalId) byExternalId.set(externalId, id);
  });

  return { records, byExternalId };
}

export function buildApplications(rows: RawRow[], orgByName: Map<string, string>): ApplicationRecord[] {
  return rows.map((row, i) => {
    const context = `applications.csv row ${i + 1}`;
    return {
      id: randomUUID(),
      name: required(row, "name", context),
      category: required(row, "category", context),
      rto_hours: optionalNumber(row, "rto_hours", context),
      rpo_hours: optionalNumber(row, "rpo_hours", context),
      sla_uptime_target: optionalNumber(row, "sla_uptime_target", context),
      business_owner: optional(row, "business_owner"),
      technical_owner: optional(row, "technical_owner"),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, context),
    };
  });
}

export function buildRisks(
  rows: RawRow[],
  orgByName: Map<string, string>
): { records: RiskRecord[]; byExternalId: Map<string, string> } {
  const byExternalId = new Map<string, string>();
  const records: RiskRecord[] = rows.map((row, i) => {
    const context = `risks.csv row ${i + 1}`;
    const id = randomUUID();
    const record: RiskRecord = {
      id,
      category: required(row, "category", context),
      title: required(row, "title", context),
      description: optional(row, "description"),
      inherent_score: optionalNumber(row, "inherent_score", context),
      residual_score: optionalNumber(row, "residual_score", context),
      status: required(row, "status", context),
      owner: optional(row, "owner"),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, context),
    };
    const externalId = row.external_id?.trim();
    if (externalId) byExternalId.set(externalId, id);
    return record;
  });

  return { records, byExternalId };
}

export function buildControls(rows: RawRow[]): { records: ControlRecord[]; byExternalId: Map<string, string> } {
  const byExternalId = new Map<string, string>();
  const records: ControlRecord[] = rows.map((row, i) => {
    const context = `controls.csv row ${i + 1}`;
    const id = randomUUID();
    const record: ControlRecord = {
      id,
      name: required(row, "name", context),
      framework: required(row, "framework", context),
      type: required(row, "type", context),
      effectiveness_score: optionalNumber(row, "effectiveness_score", context),
      owner: optional(row, "owner"),
    };
    const externalId = row.external_id?.trim();
    if (externalId) byExternalId.set(externalId, id);
    return record;
  });

  return { records, byExternalId };
}

export function buildIncidents(
  rows: RawRow[],
  orgByName: Map<string, string>
): { records: IncidentRecord[]; byExternalId: Map<string, string> } {
  const byExternalId = new Map<string, string>();
  const records: IncidentRecord[] = rows.map((row, i) => {
    const context = `incidents.csv row ${i + 1}`;
    const id = randomUUID();
    const record: IncidentRecord = {
      id,
      type: required(row, "type", context),
      severity: required(row, "severity", context),
      start_time: required(row, "start_time", context),
      end_time: optional(row, "end_time"),
      impact_description: optional(row, "impact_description"),
      impact_financial: optionalNumber(row, "impact_financial", context),
      impact_regulatory: (row.impact_regulatory?.trim() ?? "").toLowerCase() === "true",
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, context),
    };
    const externalId = row.external_id?.trim();
    if (externalId) byExternalId.set(externalId, id);
    return record;
  });

  return { records, byExternalId };
}

export function buildLossEvents(rows: RawRow[], orgByName: Map<string, string>): LossEventRecord[] {
  return rows.map((row, i) => {
    const context = `loss_events.csv row ${i + 1}`;
    return {
      id: randomUUID(),
      type: required(row, "type", context),
      amount: requiredNumber(row, "amount", context),
      currency: required(row, "currency", context),
      date: required(row, "date", context),
      cause: optional(row, "cause"),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, context),
    };
  });
}

export function buildMetrics(rows: RawRow[]): MetricRecord[] {
  return rows.map((row, i) => {
    const context = `metrics.csv row ${i + 1}`;
    const roleRelevance = required(row, "role_relevance", context)
      .split(";")
      .map((r) => r.trim())
      .filter(Boolean);
    if (roleRelevance.length === 0) {
      throw new Error(`${context}: "role_relevance" must list at least one role, e.g. "CISO;BOARD"`);
    }
    return {
      id: randomUUID(),
      name: required(row, "name", context),
      category: required(row, "category", context),
      role_relevance: roleRelevance,
      value: requiredNumber(row, "value", context),
      unit: required(row, "unit", context),
      period_start: required(row, "period_start", context),
      period_end: required(row, "period_end", context),
      source_system: optional(row, "source_system"),
    };
  });
}

export function buildRiskControlLinks(
  rows: RawRow[],
  riskByExternalId: Map<string, string>,
  controlByExternalId: Map<string, string>
): LinkRecord[] {
  return rows.map((row, i) => {
    const context = `risk_controls.csv row ${i + 1}`;
    const riskExternalId = required(row, "risk_external_id", context);
    const controlExternalId = required(row, "control_external_id", context);
    return {
      a: resolveByExternalId(riskByExternalId, riskExternalId, context, "risk"),
      b: resolveByExternalId(controlByExternalId, controlExternalId, context, "control"),
    };
  });
}

export function buildIncidentAssetLinks(
  rows: RawRow[],
  incidentByExternalId: Map<string, string>,
  assetByExternalId: Map<string, string>
): LinkRecord[] {
  return rows.map((row, i) => {
    const context = `incident_assets.csv row ${i + 1}`;
    const incidentExternalId = required(row, "incident_external_id", context);
    const assetExternalId = required(row, "asset_external_id", context);
    return {
      a: resolveByExternalId(incidentByExternalId, incidentExternalId, context, "incident"),
      b: resolveByExternalId(assetByExternalId, assetExternalId, context, "asset"),
    };
  });
}
