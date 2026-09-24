/**
 * Loads a folder of CSVs (templates in db/templates/) into Crestera Pulse.
 * See README "Bring your own data".
 *
 *   docker compose run --rm api node dist/cli/import-csv.js            (first load into an empty database)
 *   docker compose run --rm api node dist/cli/import-csv.js --replace  (refresh: swap all data, keep logins)
 *   npm run import-data -- [--replace] <folder>                        (development, on the host)
 *
 * Either way it is all-or-nothing: one bad row and the database is left exactly as it was.
 */
import "./loadEnv";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { env } from "../config/env";
import { pool } from "../db/pool";
import { describeDbError } from "../db/dbErrors";
import { isDemoActive } from "../services/authService";
import {
  TABLES,
  buildApplications,
  buildAssets,
  buildControls,
  buildIncidentAssetLinks,
  buildIncidents,
  buildLossEvents,
  buildMetrics,
  buildRiskControlLinks,
  buildRisks,
  collectWarnings,
  decodeCsvBytes,
  readTable,
  resolveOrganizations,
  type RawRow,
} from "../services/csvImport";

const DATA_TABLES = ["organizations", "assets", "applications", "risks", "controls", "incidents", "loss_events", "metrics"];
// Everything --replace clears. Logins (users) are never touched.
const REPLACED_TABLES = [...DATA_TABLES, "metric_dimensions", "risk_controls", "incident_assets"];

class UserError extends Error {}

function loadFolder(dir: string): { tables: Record<string, RawRow[]>; ignored: string[] } {
  let entries: string[];
  try {
    if (!statSync(dir).isDirectory()) throw new UserError(`${dir} is a file, not a folder.`);
    entries = readdirSync(dir);
  } catch (err) {
    if (err instanceof UserError) throw err;
    const code = (err as { code?: string }).code;
    if (code === "ENOENT") throw new UserError(`Folder not found: ${dir}`);
    if (code === "EACCES") throw new UserError(`Can't open ${dir} — permission denied. Make it readable: chmod -R a+rX <folder>`);
    throw err;
  }

  const tables: Record<string, RawRow[]> = {};
  const ignored: string[] = [];
  for (const name of entries) {
    if (!name.toLowerCase().endsWith(".csv")) continue;
    const table = name.slice(0, -4).toLowerCase().replace(/[\s-]+/g, "_");
    if (!(table in TABLES)) {
      ignored.push(name);
      continue;
    }
    let content: string;
    try {
      content = decodeCsvBytes(readFileSync(path.join(dir, name)));
    } catch (err) {
      if ((err as { code?: string }).code === "EACCES") {
        throw new UserError(`Can't read ${name} — permission denied. Make the files readable: chmod -R a+rX <folder>`);
      }
      throw err;
    }
    tables[table] = readTable(content, table);
  }
  return { tables, ignored };
}

async function insertAll(built: ReturnType<typeof buildAll>, replace: boolean): Promise<number> {
  const { orgs, assets, applications, risks, controls, incidents, lossEvents, metrics, riskControlLinks, incidentAssetLinks } = built;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const counts = await client.query<{ n: string }>(
      `SELECT (${DATA_TABLES.map((t) => `(SELECT count(*) FROM ${t})`).join(" + ")})::text AS n`
    );
    const existing = Number(counts.rows[0].n);
    if (replace) {
      // Inside the transaction: if any insert below fails, the old data comes back untouched.
      await client.query(`TRUNCATE ${REPLACED_TABLES.join(", ")}`);
    } else if (existing > 0) {
      throw new UserError(
        `The database already holds ${existing} data rows, so nothing was imported (loading again would duplicate ` +
          "everything). To swap all of it for the files in this folder, keeping your logins, run the same command " +
          "with --replace at the end."
      );
    }

    for (const o of orgs) {
      await client.query("INSERT INTO organizations (id, name, type) VALUES ($1, $2, $3)", [o.id, o.name, o.type]);
    }
    for (const a of assets) {
      await client.query(
        "INSERT INTO assets (id, name, type, criticality, environment, business_unit_id, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [a.id, a.name, a.type, a.criticality, a.environment, a.business_unit_id, a.owner]
      );
    }
    for (const app of applications) {
      await client.query(
        `INSERT INTO applications
          (id, name, category, rto_hours, rpo_hours, sla_uptime_target, business_owner, technical_owner, business_unit_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [app.id, app.name, app.category, app.rto_hours, app.rpo_hours, app.sla_uptime_target, app.business_owner, app.technical_owner, app.business_unit_id]
      );
    }
    for (const r of risks) {
      await client.query(
        `INSERT INTO risks (id, category, title, description, inherent_score, residual_score, status, owner, business_unit_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.id, r.category, r.title, r.description, r.inherent_score, r.residual_score, r.status, r.owner, r.business_unit_id]
      );
    }
    for (const c of controls) {
      await client.query(
        "INSERT INTO controls (id, name, framework, type, effectiveness_score, owner) VALUES ($1,$2,$3,$4,$5,$6)",
        [c.id, c.name, c.framework, c.type, c.effectiveness_score, c.owner]
      );
    }
    for (const inc of incidents) {
      await client.query(
        `INSERT INTO incidents
          (id, type, severity, start_time, end_time, impact_description, impact_financial, impact_regulatory, business_unit_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [inc.id, inc.type, inc.severity, inc.start_time, inc.end_time, inc.impact_description, inc.impact_financial, inc.impact_regulatory, inc.business_unit_id]
      );
    }
    for (const le of lossEvents) {
      await client.query(
        "INSERT INTO loss_events (id, type, amount, currency, date, cause, business_unit_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [le.id, le.type, le.amount, le.currency, le.date, le.cause, le.business_unit_id]
      );
    }
    for (const m of metrics) {
      await client.query(
        `INSERT INTO metrics (id, name, category, role_relevance, value, unit, period_start, period_end, source_system)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [m.id, m.name, m.category, m.role_relevance, m.value, m.unit, m.period_start, m.period_end, m.source_system]
      );
    }
    for (const link of riskControlLinks) {
      await client.query("INSERT INTO risk_controls (risk_id, control_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [link.a, link.b]);
    }
    for (const link of incidentAssetLinks) {
      await client.query("INSERT INTO incident_assets (incident_id, asset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [link.a, link.b]);
    }

    await client.query("COMMIT");
    return existing;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

function buildAll(t: Record<string, RawRow[]>) {
  const rows = (name: string) => t[name] ?? [];
  const { records: orgs, byName: orgByName } = resolveOrganizations(rows("organizations"));
  const { records: assets, byExternalId: assetById } = buildAssets(rows("assets"), orgByName);
  const applications = buildApplications(rows("applications"), orgByName);
  const { records: risks, byExternalId: riskById } = buildRisks(rows("risks"), orgByName);
  const { records: controls, byExternalId: controlById } = buildControls(rows("controls"));
  const { records: incidents, byExternalId: incidentById } = buildIncidents(rows("incidents"), orgByName);
  const lossEvents = buildLossEvents(rows("loss_events"), orgByName);
  const metrics = buildMetrics(rows("metrics"));
  const riskControlLinks = buildRiskControlLinks(rows("risk_controls"), riskById, controlById);
  const incidentAssetLinks = buildIncidentAssetLinks(rows("incident_assets"), incidentById, assetById);
  return { orgs, assets, applications, risks, controls, incidents, lossEvents, metrics, riskControlLinks, incidentAssetLinks };
}

async function main() {
  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const unknown = args.filter((a) => a.startsWith("-") && a !== "--replace");
  if (unknown.length) throw new UserError(`Unknown option ${unknown[0]}. The only option is --replace.`);
  // Defaults to the import/ folder mounted by docker compose, so the documented
  // command has no path in it for a shell (e.g. Git Bash on Windows) to rewrite.
  const dir = args.find((a) => !a.startsWith("-")) ?? "/import";

  const { tables, ignored } = loadFolder(dir);
  const found = Object.keys(tables);
  for (const name of ignored) {
    console.warn(`Skipped ${name}: not a recognised file name. Expected: ${Object.keys(TABLES).map((t) => `${t}.csv`).join(", ")}`);
  }
  if (found.length === 0) {
    throw new UserError(
      `No data files found in ${dir}. Copy the templates from db/templates/ into that folder and fill them in ` +
        "(file names must match, e.g. risks.csv)."
    );
  }

  const built = buildAll(tables);
  for (const w of collectWarnings(built.risks, built.incidents, built.metrics)) console.warn(`Note: ${w}`);

  const previous = await insertAll(built, replace);

  console.log(replace && previous > 0 ? `Import complete (replaced ${previous} previous data rows; logins kept):` : "Import complete:");
  const summary: [string, number][] = [
    ["organizations", built.orgs.length],
    ["assets", built.assets.length],
    ["applications", built.applications.length],
    ["risks", built.risks.length],
    ["controls", built.controls.length],
    ["incidents", built.incidents.length],
    ["loss_events", built.lossEvents.length],
    ["metrics", built.metrics.length],
    ["risk_controls links", built.riskControlLinks.length],
    ["incident_assets links", built.incidentAssetLinks.length],
  ];
  for (const [label, n] of summary) console.log(`  ${label}: ${n}`);

  if (await isDemoActive()) {
    console.warn(
      "\nWarning: the demo logins (ciso, cio, cro, board) still work with the published password \"password\".\n" +
        "Before anyone else can reach this dashboard, delete them — for example:\n" +
        "  docker compose run --rm api node dist/cli/manage-users.js delete board\n" +
        "(repeat for ciso, cio and cro) after creating your own login with manage-users create."
    );
  }
}

main()
  .catch((err) => {
    const target = { host: env.db.host, port: env.db.port, user: env.db.user, database: env.db.database };
    const message = err instanceof UserError ? err.message : describeDbError(err, target) ?? (err as Error).message;
    console.error(`Import failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
