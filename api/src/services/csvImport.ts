import { randomUUID } from "node:crypto";
import { parse } from "csv-parse/sync";

export type RawRow = Record<string, string>;

/** Hidden key carrying the spreadsheet row number (header = row 1). */
export const LINE = "__line";

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

/** Every file the importer understands, its columns, and which are required. */
export const TABLES: Record<string, { columns: string[]; required: string[] }> = {
  organizations: { columns: ["name", "type"], required: ["name", "type"] },
  assets: {
    columns: ["external_id", "name", "type", "criticality", "environment", "business_unit", "owner"],
    required: ["name", "type", "criticality", "environment"],
  },
  applications: {
    columns: ["name", "category", "rto_hours", "rpo_hours", "sla_uptime_target", "business_owner", "technical_owner", "business_unit"],
    required: ["name", "category"],
  },
  risks: {
    columns: ["external_id", "category", "title", "description", "inherent_score", "residual_score", "status", "owner", "business_unit"],
    required: ["category", "title", "status"],
  },
  controls: {
    columns: ["external_id", "name", "framework", "type", "effectiveness_score", "owner"],
    required: ["name", "framework", "type"],
  },
  risk_controls: { columns: ["risk_external_id", "control_external_id"], required: ["risk_external_id", "control_external_id"] },
  incidents: {
    columns: [
      "external_id",
      "type",
      "severity",
      "start_time",
      "end_time",
      "impact_description",
      "impact_financial",
      "impact_regulatory",
      "business_unit",
    ],
    required: ["type", "severity", "start_time"],
  },
  incident_assets: {
    columns: ["incident_external_id", "asset_external_id"],
    required: ["incident_external_id", "asset_external_id"],
  },
  loss_events: { columns: ["type", "amount", "currency", "date", "cause", "business_unit"], required: ["type", "amount", "currency", "date"] },
  metrics: {
    columns: ["name", "category", "role_relevance", "value", "unit", "period_start", "period_end", "source_system"],
    required: ["name", "category", "role_relevance", "value", "unit", "period_start", "period_end"],
  },
};

/**
 * File bytes to text. Excel's "CSV UTF-8" is UTF-8; its plain "CSV" on Windows
 * is Windows-1252, where curly quotes, dashes and accents are single bytes that
 * aren't valid UTF-8. Anything that isn't valid UTF-8 is read as Windows-1252
 * rather than turned into replacement characters.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Parses one CSV file the way spreadsheets actually save them: tolerates a
 * UTF-8 BOM, CRLF, `;` separators (European Excel), blank rows, and headers
 * like "Business Unit". Rejects unknown or missing columns instead of
 * silently ignoring them.
 */
export function readTable(content: string, table: string): RawRow[] {
  const spec = TABLES[table];
  const file = `${table}.csv`;
  // (A UTF-8 BOM is removed by the parser's `bom` option below.)
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

  let headers: string[] = [];
  let parsed: { record: RawRow; info: { lines: number } }[];
  try {
    parsed = parse(content, {
      bom: true,
      delimiter,
      columns: (h: string[]) => (headers = h.map(normalizeHeader)),
      skip_empty_lines: true,
      skip_records_with_empty_values: true,
      trim: true,
      info: true,
    }) as { record: RawRow; info: { lines: number } }[];
  } catch (err) {
    throw new Error(`${file}: couldn't read the file as CSV — ${(err as Error).message}`);
  }

  const unknown = headers.filter((h) => h && !spec.columns.includes(h));
  if (unknown.length > 0) {
    throw new Error(
      `${file}: unknown column${unknown.length > 1 ? "s" : ""} ${unknown.map((u) => `"${u}"`).join(", ")}. ` +
        `Expected: ${spec.columns.join(", ")} (see db/templates/${file}).`
    );
  }
  const missing = spec.required.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    throw new Error(`${file}: missing required column${missing.length > 1 ? "s" : ""} ${missing.join(", ")}.`);
  }

  return parsed.map(({ record, info }) => ({ ...record, [LINE]: String(info.lines) }));
}

function context(file: string, row: RawRow, i: number): string {
  return `${file} row ${row[LINE] ?? i + 2}`;
}

function required(row: RawRow, field: string, ctx: string): string {
  const value = row[field]?.trim();
  if (!value) {
    throw new Error(`${ctx}: "${field}" is empty but required`);
  }
  return value;
}

function optional(row: RawRow, field: string): string | null {
  const value = row[field]?.trim();
  return value ? value : null;
}

function lower(value: string): string {
  return value.toLowerCase();
}

/** Accepts spreadsheet formatting like "$92,000.00" or "99.9%". */
export function parseNumber(raw: string): number {
  if (/\d,\d{1,2}$/.test(raw)) return NaN; // "1234,56" — a decimal comma is ambiguous
  const cleaned = raw.replace(/[\s$€£,%]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

function requiredNumber(row: RawRow, field: string, ctx: string): number {
  const raw = required(row, field, ctx);
  const value = parseNumber(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${ctx}: "${field}" must be a number, like 1234.56 (got "${raw}")`);
  }
  return value;
}

function optionalNumber(row: RawRow, field: string, ctx: string): number | null {
  const raw = row[field]?.trim();
  if (!raw) return null;
  const value = parseNumber(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${ctx}: "${field}" must be a number, like 1234.56 (got "${raw}")`);
  }
  return value;
}

function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** YYYY-MM-DD, optionally followed by a time (e.g. "2026-08-19 14:30"). */
export function parseDateTime(raw: string, field: string, ctx: string, dateOnly: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/.exec(raw);
  const ok =
    m &&
    isRealDate(+m[1], +m[2], +m[3]) &&
    (m[4] === undefined || (+m[4] < 24 && +m[5] < 60 && (m[6] === undefined || +m[6] < 60)));
  if (!m || !ok) {
    const example = dateOnly ? "2026-08-19" : "2026-08-19 or 2026-08-19 14:30";
    throw new Error(`${ctx}: "${field}" must be a date like ${example} (got "${raw}")`);
  }
  return dateOnly ? `${m[1]}-${m[2]}-${m[3]}` : raw.replace("T", " ");
}

function requiredDate(row: RawRow, field: string, ctx: string, dateOnly: boolean): string {
  return parseDateTime(required(row, field, ctx), field, ctx, dateOnly);
}

function optionalDate(row: RawRow, field: string, ctx: string, dateOnly: boolean): string | null {
  const raw = row[field]?.trim();
  return raw ? parseDateTime(raw, field, ctx, dateOnly) : null;
}

export function parseBoolean(raw: string | undefined, field: string, ctx: string): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  if (["", "false", "no", "n", "0"].includes(v)) return false;
  if (["true", "yes", "y", "1"].includes(v)) return true;
  throw new Error(`${ctx}: "${field}" must be true or false (got "${raw}")`);
}

function resolveOptionalBusinessUnit(row: RawRow, orgByName: Map<string, string>, ctx: string): string | null {
  const name = row.business_unit?.trim();
  if (!name) return null;
  const id = orgByName.get(name.toLowerCase());
  if (!id) {
    throw new Error(`${ctx}: business_unit "${name}" isn't in organizations.csv — add it there first (names must match)`);
  }
  return id;
}

function resolveByExternalId(map: Map<string, string>, externalId: string, ctx: string, kind: string, file: string): string {
  const id = map.get(externalId);
  if (!id) {
    throw new Error(`${ctx}: no ${kind} with external_id "${externalId}" in ${file}`);
  }
  return id;
}

function indexExternalId(map: Map<string, string>, row: RawRow, id: string, ctx: string): void {
  const externalId = row.external_id?.trim();
  if (!externalId) return;
  if (map.has(externalId)) {
    throw new Error(`${ctx}: external_id "${externalId}" is used more than once — each row needs its own`);
  }
  map.set(externalId, id);
}

export function resolveOrganizations(rows: RawRow[]): {
  records: OrganizationRecord[];
  byName: Map<string, string>;
} {
  const byName = new Map<string, string>();
  const records: OrganizationRecord[] = [];

  rows.forEach((row, i) => {
    const ctx = context("organizations.csv", row, i);
    const name = required(row, "name", ctx);
    if (byName.has(name.toLowerCase())) {
      throw new Error(`${ctx}: organization "${name}" appears more than once`);
    }
    const id = randomUUID();
    byName.set(name.toLowerCase(), id);
    records.push({ id, name, type: lower(required(row, "type", ctx)) });
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
    const ctx = context("assets.csv", row, i);
    const id = randomUUID();
    const criticality = requiredNumber(row, "criticality", ctx);
    if (criticality < 1 || criticality > 5 || !Number.isInteger(criticality)) {
      throw new Error(`${ctx}: "criticality" must be a whole number from 1 to 5 (got ${criticality})`);
    }
    records.push({
      id,
      name: required(row, "name", ctx),
      type: lower(required(row, "type", ctx)),
      criticality,
      environment: lower(required(row, "environment", ctx)),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, ctx),
      owner: optional(row, "owner"),
    });
    indexExternalId(byExternalId, row, id, ctx);
  });

  return { records, byExternalId };
}

export function buildApplications(rows: RawRow[], orgByName: Map<string, string>): ApplicationRecord[] {
  return rows.map((row, i) => {
    const ctx = context("applications.csv", row, i);
    return {
      id: randomUUID(),
      name: required(row, "name", ctx),
      category: lower(required(row, "category", ctx)),
      rto_hours: optionalNumber(row, "rto_hours", ctx),
      rpo_hours: optionalNumber(row, "rpo_hours", ctx),
      sla_uptime_target: optionalNumber(row, "sla_uptime_target", ctx),
      business_owner: optional(row, "business_owner"),
      technical_owner: optional(row, "technical_owner"),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, ctx),
    };
  });
}

export function buildRisks(
  rows: RawRow[],
  orgByName: Map<string, string>
): { records: RiskRecord[]; byExternalId: Map<string, string> } {
  const byExternalId = new Map<string, string>();
  const records: RiskRecord[] = rows.map((row, i) => {
    const ctx = context("risks.csv", row, i);
    const id = randomUUID();
    const record: RiskRecord = {
      id,
      category: lower(required(row, "category", ctx)),
      title: required(row, "title", ctx),
      description: optional(row, "description"),
      inherent_score: optionalNumber(row, "inherent_score", ctx),
      residual_score: optionalNumber(row, "residual_score", ctx),
      status: lower(required(row, "status", ctx)),
      owner: optional(row, "owner"),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, ctx),
    };
    indexExternalId(byExternalId, row, id, ctx);
    return record;
  });

  return { records, byExternalId };
}

export function buildControls(rows: RawRow[]): { records: ControlRecord[]; byExternalId: Map<string, string> } {
  const byExternalId = new Map<string, string>();
  const records: ControlRecord[] = rows.map((row, i) => {
    const ctx = context("controls.csv", row, i);
    const id = randomUUID();
    const record: ControlRecord = {
      id,
      name: required(row, "name", ctx),
      framework: required(row, "framework", ctx).toUpperCase(),
      type: lower(required(row, "type", ctx)),
      effectiveness_score: optionalNumber(row, "effectiveness_score", ctx),
      owner: optional(row, "owner"),
    };
    indexExternalId(byExternalId, row, id, ctx);
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
    const ctx = context("incidents.csv", row, i);
    const id = randomUUID();
    const record: IncidentRecord = {
      id,
      type: lower(required(row, "type", ctx)),
      severity: lower(required(row, "severity", ctx)),
      start_time: requiredDate(row, "start_time", ctx, false),
      end_time: optionalDate(row, "end_time", ctx, false),
      impact_description: optional(row, "impact_description"),
      impact_financial: optionalNumber(row, "impact_financial", ctx),
      impact_regulatory: parseBoolean(row.impact_regulatory, "impact_regulatory", ctx),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, ctx),
    };
    indexExternalId(byExternalId, row, id, ctx);
    return record;
  });

  return { records, byExternalId };
}

export function buildLossEvents(rows: RawRow[], orgByName: Map<string, string>): LossEventRecord[] {
  return rows.map((row, i) => {
    const ctx = context("loss_events.csv", row, i);
    return {
      id: randomUUID(),
      type: lower(required(row, "type", ctx)),
      amount: requiredNumber(row, "amount", ctx),
      currency: required(row, "currency", ctx).toUpperCase(),
      date: requiredDate(row, "date", ctx, true),
      cause: optional(row, "cause"),
      business_unit_id: resolveOptionalBusinessUnit(row, orgByName, ctx),
    };
  });
}

export function buildMetrics(rows: RawRow[]): MetricRecord[] {
  return rows.map((row, i) => {
    const ctx = context("metrics.csv", row, i);
    const roleRelevance = required(row, "role_relevance", ctx)
      .split(/[;,|]/)
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    const invalid = roleRelevance.filter((r) => !["CISO", "CIO", "CRO", "BOARD"].includes(r));
    if (invalid.length > 0) {
      throw new Error(`${ctx}: "role_relevance" may only list CISO, CIO, CRO, BOARD (got ${invalid.join(", ")})`);
    }
    return {
      id: randomUUID(),
      name: required(row, "name", ctx),
      category: lower(required(row, "category", ctx)),
      role_relevance: roleRelevance,
      value: requiredNumber(row, "value", ctx),
      unit: required(row, "unit", ctx),
      period_start: requiredDate(row, "period_start", ctx, false),
      period_end: requiredDate(row, "period_end", ctx, false),
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
    const ctx = context("risk_controls.csv", row, i);
    return {
      a: resolveByExternalId(riskByExternalId, required(row, "risk_external_id", ctx), ctx, "risk", "risks.csv"),
      b: resolveByExternalId(controlByExternalId, required(row, "control_external_id", ctx), ctx, "control", "controls.csv"),
    };
  });
}

export function buildIncidentAssetLinks(
  rows: RawRow[],
  incidentByExternalId: Map<string, string>,
  assetByExternalId: Map<string, string>
): LinkRecord[] {
  return rows.map((row, i) => {
    const ctx = context("incident_assets.csv", row, i);
    return {
      a: resolveByExternalId(incidentByExternalId, required(row, "incident_external_id", ctx), ctx, "incident", "incidents.csv"),
      b: resolveByExternalId(assetByExternalId, required(row, "asset_external_id", ctx), ctx, "asset", "assets.csv"),
    };
  });
}

const KNOWN_RISK_CATEGORIES = ["cyber", "operational", "credit", "market", "liquidity", "compliance"];
const KNOWN_INCIDENT_TYPES = ["security", "it", "operational", "fraud"];

/** Metric names a dashboard looks up (case doesn't matter). README "What the dashboards read" lists them too. */
export const DASHBOARD_METRIC_NAMES = [
  "Security Posture Score",
  "Mean Time to Detect",
  "Mean Time to Respond",
  "Core Banking Uptime",
  "Online Banking Uptime",
  "Mobile Banking Uptime",
  "ATM Availability",
  "Call Center SLA Adherence",
  "Change Failure Rate",
  "CPU Utilization",
  "Memory Utilization",
  "Storage Utilization",
  "Open Regulatory Issues",
  "Upcoming Regulatory Deadlines",
];

/** Non-fatal notes about values the dashboards won't recognise. */
export function collectWarnings(risks: RiskRecord[], incidents: IncidentRecord[], metrics: MetricRecord[] = []): string[] {
  const warnings: string[] = [];
  const known = new Set(DASHBOARD_METRIC_NAMES.map((n) => n.toLowerCase()));
  const oddMetrics = [...new Set(metrics.map((m) => m.name))].filter(
    (n) => !known.has(n.toLowerCase()) && !/vulnerabilities open/i.test(n)
  );
  if (oddMetrics.length > 0) {
    const many = oddMetrics.length > 1;
    warnings.push(
      `metrics.csv: ${oddMetrics.map((n) => `"${n}"`).join(", ")} ${many ? "aren't names" : "isn't a name"} any dashboard ` +
        `reads, so ${many ? "they're" : "it's"} stored but not shown. Check the spelling against README "What the dashboards read".`
    );
  }
  const oddCategories = [...new Set(risks.map((r) => r.category))].filter((c) => !KNOWN_RISK_CATEGORIES.includes(c));
  if (oddCategories.length > 0) {
    warnings.push(
      `risks.csv: categor${oddCategories.length > 1 ? "ies" : "y"} ${oddCategories.map((c) => `"${c}"`).join(", ")} ` +
        `will show on the CRO chart but not the CISO views (those read "cyber"). Known: ${KNOWN_RISK_CATEGORIES.join(", ")}.`
    );
  }
  const oddTypes = [...new Set(incidents.map((i) => i.type))].filter((t) => !KNOWN_INCIDENT_TYPES.includes(t));
  if (oddTypes.length > 0) {
    warnings.push(
      `incidents.csv: type${oddTypes.length > 1 ? "s" : ""} ${oddTypes.map((t) => `"${t}"`).join(", ")} ` +
        `won't count toward the CISO ("security") or CIO ("it") numbers. Known: ${KNOWN_INCIDENT_TYPES.join(", ")}.`
    );
  }
  return warnings;
}
