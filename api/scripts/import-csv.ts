#!/usr/bin/env -S npx tsx
/**
 * Loads a folder of CSVs (see db/templates/ for the expected shape) into a
 * fresh Crestera Pulse schema. Run once against an empty, freshly-migrated
 * database — see README "Bring your own data".
 *
 * Usage: npm run import-data -- /path/to/csv-folder
 */
import "./loadEnv";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { pool } from "../src/db/pool";
import {
  buildApplications,
  buildAssets,
  buildControls,
  buildIncidentAssetLinks,
  buildIncidents,
  buildLossEvents,
  buildMetrics,
  buildRiskControlLinks,
  buildRisks,
  resolveOrganizations,
  type RawRow,
} from "../src/services/csvImport";

function readCsv(dir: string, filename: string): RawRow[] {
  const filePath = path.join(dir, filename);
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf8");
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as RawRow[];
}

async function insertAll(params: {
  orgs: ReturnType<typeof resolveOrganizations>["records"];
  assets: ReturnType<typeof buildAssets>["records"];
  applications: ReturnType<typeof buildApplications>;
  risks: ReturnType<typeof buildRisks>["records"];
  controls: ReturnType<typeof buildControls>["records"];
  incidents: ReturnType<typeof buildIncidents>["records"];
  lossEvents: ReturnType<typeof buildLossEvents>;
  metrics: ReturnType<typeof buildMetrics>;
  riskControlLinks: ReturnType<typeof buildRiskControlLinks>;
  incidentAssetLinks: ReturnType<typeof buildIncidentAssetLinks>;
}) {
  const { orgs, assets, applications, risks, controls, incidents, lossEvents, metrics, riskControlLinks, incidentAssetLinks } =
    params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

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
        [
          app.id,
          app.name,
          app.category,
          app.rto_hours,
          app.rpo_hours,
          app.sla_uptime_target,
          app.business_owner,
          app.technical_owner,
          app.business_unit_id,
        ]
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
        [
          inc.id,
          inc.type,
          inc.severity,
          inc.start_time,
          inc.end_time,
          inc.impact_description,
          inc.impact_financial,
          inc.impact_regulatory,
          inc.business_unit_id,
        ]
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
      await client.query("INSERT INTO risk_controls (risk_id, control_id) VALUES ($1, $2)", [link.a, link.b]);
    }
    for (const link of incidentAssetLinks) {
      await client.query("INSERT INTO incident_assets (incident_id, asset_id) VALUES ($1, $2)", [link.a, link.b]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: npm run import-data -- /path/to/csv-folder");
    process.exitCode = 1;
    return;
  }
  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exitCode = 1;
    return;
  }

  const { records: orgs, byName: orgByName } = resolveOrganizations(readCsv(dir, "organizations.csv"));
  const { records: assets, byExternalId: assetByExternalId } = buildAssets(readCsv(dir, "assets.csv"), orgByName);
  const applications = buildApplications(readCsv(dir, "applications.csv"), orgByName);
  const { records: risks, byExternalId: riskByExternalId } = buildRisks(readCsv(dir, "risks.csv"), orgByName);
  const { records: controls, byExternalId: controlByExternalId } = buildControls(readCsv(dir, "controls.csv"));
  const { records: incidents, byExternalId: incidentByExternalId } = buildIncidents(
    readCsv(dir, "incidents.csv"),
    orgByName
  );
  const lossEvents = buildLossEvents(readCsv(dir, "loss_events.csv"), orgByName);
  const metrics = buildMetrics(readCsv(dir, "metrics.csv"));
  const riskControlLinks = buildRiskControlLinks(
    readCsv(dir, "risk_controls.csv"),
    riskByExternalId,
    controlByExternalId
  );
  const incidentAssetLinks = buildIncidentAssetLinks(
    readCsv(dir, "incident_assets.csv"),
    incidentByExternalId,
    assetByExternalId
  );

  try {
    await insertAll({
      orgs,
      assets,
      applications,
      risks,
      controls,
      incidents,
      lossEvents,
      metrics,
      riskControlLinks,
      incidentAssetLinks,
    });
  } finally {
    await pool.end();
  }

  console.log("Import complete:");
  console.log(`  organizations: ${orgs.length}`);
  console.log(`  assets: ${assets.length}`);
  console.log(`  applications: ${applications.length}`);
  console.log(`  risks: ${risks.length}`);
  console.log(`  controls: ${controls.length}`);
  console.log(`  incidents: ${incidents.length}`);
  console.log(`  loss_events: ${lossEvents.length}`);
  console.log(`  metrics: ${metrics.length}`);
  console.log(`  risk_controls links: ${riskControlLinks.length}`);
  console.log(`  incident_assets links: ${incidentAssetLinks.length}`);
}

main().catch((err) => {
  console.error("Import failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
