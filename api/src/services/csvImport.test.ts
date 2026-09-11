import { describe, expect, it } from "vitest";
import {
  buildAssets,
  buildIncidentAssetLinks,
  buildMetrics,
  buildRiskControlLinks,
  buildRisks,
  resolveOrganizations,
  type RawRow,
} from "./csvImport";

describe("resolveOrganizations", () => {
  it("assigns a UUID per unique name", () => {
    const rows: RawRow[] = [
      { name: "Retail Banking", type: "business_unit" },
      { name: "Commercial Banking", type: "business_unit" },
    ];
    const { records, byName } = resolveOrganizations(rows);
    expect(records).toHaveLength(2);
    expect(byName.get("Retail Banking")).toBe(records[0].id);
  });

  it("throws on a duplicate organization name", () => {
    const rows: RawRow[] = [
      { name: "Retail Banking", type: "business_unit" },
      { name: "Retail Banking", type: "region" },
    ];
    expect(() => resolveOrganizations(rows)).toThrow(/duplicate organization name/);
  });

  it("throws with row context when a required field is missing", () => {
    const rows: RawRow[] = [{ name: "", type: "business_unit" }];
    expect(() => resolveOrganizations(rows)).toThrow(/organizations\.csv row 1/);
  });
});

describe("buildAssets", () => {
  const orgByName = new Map([["Retail Banking", "org-1"]]);

  it("resolves a known business_unit name to its id", () => {
    const { records } = buildAssets(
      [{ name: "Core Banking", type: "server", criticality: "5", environment: "prod", business_unit: "Retail Banking" }],
      orgByName
    );
    expect(records[0].business_unit_id).toBe("org-1");
  });

  it("leaves business_unit_id null when the column is blank", () => {
    const { records } = buildAssets(
      [{ name: "Core Banking", type: "server", criticality: "5", environment: "prod", business_unit: "" }],
      orgByName
    );
    expect(records[0].business_unit_id).toBeNull();
  });

  it("throws a clear error for an unknown business_unit name", () => {
    expect(() =>
      buildAssets(
        [{ name: "Core Banking", type: "server", criticality: "5", environment: "prod", business_unit: "Nope" }],
        orgByName
      )
    ).toThrow(/unknown organization "Nope"/);
  });

  it("rejects a criticality outside 1-5", () => {
    expect(() =>
      buildAssets([{ name: "X", type: "server", criticality: "9", environment: "prod", business_unit: "" }], orgByName)
    ).toThrow(/criticality/);
  });

  it("indexes rows with an external_id for later joins", () => {
    const { byExternalId } = buildAssets(
      [{ external_id: "AST-1", name: "Core Banking", type: "server", criticality: "5", environment: "prod", business_unit: "" }],
      orgByName
    );
    expect(byExternalId.has("AST-1")).toBe(true);
  });
});

describe("buildRisks + buildRiskControlLinks", () => {
  it("links a risk to a control via external_id", () => {
    const { byExternalId: riskByExternalId } = buildRisks(
      [{ external_id: "R-1", category: "cyber", title: "Ransomware", status: "open" }],
      new Map()
    );
    const controlByExternalId = new Map([["C-1", "control-id-1"]]);

    const links = buildRiskControlLinks(
      [{ risk_external_id: "R-1", control_external_id: "C-1" }],
      riskByExternalId,
      controlByExternalId
    );

    expect(links).toEqual([{ a: riskByExternalId.get("R-1"), b: "control-id-1" }]);
  });

  it("throws a clear error when a link references an unknown external_id", () => {
    const riskByExternalId = new Map([["R-1", "risk-id-1"]]);
    const controlByExternalId = new Map<string, string>();

    expect(() =>
      buildRiskControlLinks(
        [{ risk_external_id: "R-1", control_external_id: "C-missing" }],
        riskByExternalId,
        controlByExternalId
      )
    ).toThrow(/unknown control external_id "C-missing"/);
  });
});

describe("buildIncidentAssetLinks", () => {
  it("resolves both sides of the join", () => {
    const incidentByExternalId = new Map([["INC-1", "incident-id-1"]]);
    const assetByExternalId = new Map([["AST-1", "asset-id-1"]]);

    const links = buildIncidentAssetLinks(
      [{ incident_external_id: "INC-1", asset_external_id: "AST-1" }],
      incidentByExternalId,
      assetByExternalId
    );

    expect(links).toEqual([{ a: "incident-id-1", b: "asset-id-1" }]);
  });
});

describe("buildMetrics", () => {
  it("splits role_relevance on semicolons", () => {
    const [metric] = buildMetrics([
      {
        name: "Security Posture Score",
        category: "security",
        role_relevance: "CISO;BOARD",
        value: "78",
        unit: "score",
        period_start: "2026-08-01",
        period_end: "2026-08-31",
      },
    ]);
    expect(metric.role_relevance).toEqual(["CISO", "BOARD"]);
  });

  it("rejects a non-numeric value", () => {
    expect(() =>
      buildMetrics([
        {
          name: "X",
          category: "security",
          role_relevance: "CISO",
          value: "not-a-number",
          unit: "score",
          period_start: "2026-08-01",
          period_end: "2026-08-31",
        },
      ])
    ).toThrow(/not a number/);
  });
});
