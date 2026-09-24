import { describe, expect, it } from "vitest";
import {
  buildAssets,
  buildIncidentAssetLinks,
  buildIncidents,
  buildLossEvents,
  buildMetrics,
  buildRiskControlLinks,
  buildRisks,
  collectWarnings,
  decodeCsvBytes,
  parseNumber,
  readTable,
  resolveOrganizations,
  type RawRow,
} from "./csvImport";

describe("resolveOrganizations", () => {
  it("assigns a UUID per unique name, looked up case-insensitively", () => {
    const rows: RawRow[] = [
      { name: "Retail Banking", type: "business_unit" },
      { name: "Commercial Banking", type: "business_unit" },
    ];
    const { records, byName } = resolveOrganizations(rows);
    expect(records).toHaveLength(2);
    expect(byName.get("retail banking")).toBe(records[0].id);
  });

  it("throws on a duplicate organization name, even with different case", () => {
    const rows: RawRow[] = [
      { name: "Retail Banking", type: "business_unit" },
      { name: "retail banking", type: "region" },
    ];
    expect(() => resolveOrganizations(rows)).toThrow(/appears more than once/);
  });

  it("reports the spreadsheet row (header is row 1) when a required field is missing", () => {
    expect(() => resolveOrganizations([{ name: "", type: "business_unit" }])).toThrow(/organizations\.csv row 2: "name" is empty/);
  });
});

describe("buildAssets", () => {
  const { byName: orgByName, records: orgs } = resolveOrganizations([{ name: "Retail Banking", type: "business_unit" }]);

  it("resolves a business_unit name regardless of case", () => {
    const { records } = buildAssets(
      [{ name: "Core Banking", type: "Server", criticality: "5", environment: "PROD", business_unit: "retail BANKING" }],
      orgByName
    );
    expect(records[0].business_unit_id).toBe(orgs[0].id);
    expect(records[0].type).toBe("server");
    expect(records[0].environment).toBe("prod");
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
      buildAssets([{ name: "Core Banking", type: "server", criticality: "5", environment: "prod", business_unit: "Nope" }], orgByName)
    ).toThrow(/business_unit "Nope" isn't in organizations\.csv/);
  });

  it("rejects a criticality outside 1-5", () => {
    expect(() =>
      buildAssets([{ name: "X", type: "server", criticality: "9", environment: "prod", business_unit: "" }], orgByName)
    ).toThrow(/criticality/);
  });

  it("rejects the same external_id used twice", () => {
    const row = { external_id: "AST-1", name: "A", type: "server", criticality: "5", environment: "prod" };
    expect(() => buildAssets([row, { ...row, name: "B" }], orgByName)).toThrow(/"AST-1" is used more than once/);
  });
});

describe("buildRisks + links", () => {
  it("links a risk to a control via external_id", () => {
    const { byExternalId: riskByExternalId } = buildRisks(
      [{ external_id: "R-1", category: "Cyber", title: "Ransomware", status: "Open" }],
      new Map()
    );
    const links = buildRiskControlLinks(
      [{ risk_external_id: "R-1", control_external_id: "C-1" }],
      riskByExternalId,
      new Map([["C-1", "control-id-1"]])
    );
    expect(links).toEqual([{ a: riskByExternalId.get("R-1"), b: "control-id-1" }]);
  });

  it("normalises category and status to lower case so the dashboards match them", () => {
    const { records } = buildRisks([{ category: "Cyber", title: "T", status: "OPEN" }], new Map());
    expect(records[0]).toMatchObject({ category: "cyber", status: "open" });
  });

  it("throws a clear error when a link references an unknown external_id", () => {
    expect(() =>
      buildRiskControlLinks([{ risk_external_id: "R-1", control_external_id: "C-missing" }], new Map([["R-1", "r"]]), new Map())
    ).toThrow(/no control with external_id "C-missing" in controls\.csv/);
  });

  it("resolves both sides of an incident/asset join", () => {
    const links = buildIncidentAssetLinks(
      [{ incident_external_id: "INC-1", asset_external_id: "AST-1" }],
      new Map([["INC-1", "i"]]),
      new Map([["AST-1", "a"]])
    );
    expect(links).toEqual([{ a: "i", b: "a" }]);
  });
});

describe("values as spreadsheets write them", () => {
  it("accepts currency, thousands separators and percent signs", () => {
    expect(parseNumber("$92,000.00")).toBe(92000);
    expect(parseNumber("99.9%")).toBe(99.9);
    expect(parseNumber(" 1 234 ")).toBe(1234);
  });

  it("refuses an ambiguous decimal comma instead of guessing", () => {
    expect(parseNumber("1234,56")).toBeNaN();
  });

  it("accepts yes/no style booleans and rejects nonsense", () => {
    const base = { type: "security", severity: "High", start_time: "2026-06-02 03:14" };
    expect(buildIncidents([{ ...base, impact_regulatory: "Yes" }], new Map()).records[0].impact_regulatory).toBe(true);
    expect(buildIncidents([{ ...base, impact_regulatory: "FALSE" }], new Map()).records[0].impact_regulatory).toBe(false);
    expect(() => buildIncidents([{ ...base, impact_regulatory: "maybe" }], new Map())).toThrow(/true or false/);
  });

  it("explains the expected date format when given a US-style date", () => {
    expect(() =>
      buildLossEvents([{ type: "fraud", amount: "10", currency: "usd", date: "8/19/2026" }], new Map())
    ).toThrow(/"date" must be a date like 2026-08-19 \(got "8\/19\/2026"\)/);
  });

  it("rejects an impossible calendar date", () => {
    expect(() => buildLossEvents([{ type: "fraud", amount: "10", currency: "USD", date: "2026-02-30" }], new Map())).toThrow(
      /must be a date/
    );
  });

  it("accepts ISO timestamps with a T separator", () => {
    const { records } = buildIncidents([{ type: "it", severity: "low", start_time: "2026-06-02T03:14:00" }], new Map());
    expect(records[0].start_time).toBe("2026-06-02 03:14:00");
  });
});

describe("buildMetrics", () => {
  const metric = {
    name: "Security Posture Score",
    category: "security",
    role_relevance: "CISO;BOARD",
    value: "78",
    unit: "score",
    period_start: "2026-08-01",
    period_end: "2026-08-31",
  };

  it("splits role_relevance on ; , or | and upper-cases it", () => {
    expect(buildMetrics([{ ...metric, role_relevance: "ciso, board" }])[0].role_relevance).toEqual(["CISO", "BOARD"]);
  });

  it("rejects an unknown role", () => {
    expect(() => buildMetrics([{ ...metric, role_relevance: "CISO;CFO" }])).toThrow(/CFO/);
  });

  it("rejects a non-numeric value", () => {
    expect(() => buildMetrics([{ ...metric, value: "n/a" }])).toThrow(/must be a number/);
  });
});

describe("readTable", () => {
  it("reads an Excel 'CSV UTF-8' file: BOM, CRLF, blank comma rows, spaced headers", () => {
    const content = "﻿Name,Type\r\nRetail Banking,business_unit\r\n,\r\n\r\nWealth,business_unit\r\n";
    const rows = readTable(content, "organizations");
    expect(rows.map((r) => r.name)).toEqual(["Retail Banking", "Wealth"]);
    expect(rows[1].__line).toBe("5");
  });

  it("reads a semicolon-separated file (European Excel)", () => {
    const rows = readTable("name;type\nRetail;business_unit\n", "organizations");
    expect(rows[0]).toMatchObject({ name: "Retail", type: "business_unit" });
  });

  it("maps 'Business Unit' style headers to business_unit", () => {
    const rows = readTable("Name,Type,Criticality,Environment,Business Unit\nX,server,3,prod,Retail\n", "assets");
    expect(rows[0].business_unit).toBe("Retail");
  });

  it("rejects a misspelled column instead of silently ignoring it", () => {
    expect(() => readTable("name,type,buisness_unit\nX,y,z\n", "organizations")).toThrow(/unknown column "buisness_unit"/);
  });

  it("rejects a file missing a required column", () => {
    expect(() => readTable("name\nX\n", "organizations")).toThrow(/missing required column type/);
  });
});

describe("decodeCsvBytes", () => {
  it("reads UTF-8 as UTF-8", () => {
    expect(decodeCsvBytes(new TextEncoder().encode("Café — “quoted”"))).toBe("Café — “quoted”");
  });

  it("reads Excel's Windows-1252 'CSV' without replacement characters", () => {
    // "Café — “quoted”" as Excel's plain CSV saves it on Windows
    const bytes = Uint8Array.from([0x43, 0x61, 0x66, 0xe9, 0x20, 0x97, 0x20, 0x93, 0x71, 0x75, 0x6f, 0x74, 0x65, 0x64, 0x94]);
    expect(decodeCsvBytes(bytes)).toBe("Café — “quoted”");
  });
});

describe("collectWarnings", () => {
  it("flags categories and types the dashboards won't pick up", () => {
    const risks = buildRisks([{ category: "Cybersecurity", title: "T", status: "open" }], new Map()).records;
    const incidents = buildIncidents([{ type: "breach", severity: "high", start_time: "2026-01-01" }], new Map()).records;
    const warnings = collectWarnings(risks, incidents);
    expect(warnings.join(" ")).toMatch(/"cybersecurity".*"breach"/s);
  });

  it("stays quiet for the known values", () => {
    const risks = buildRisks([{ category: "cyber", title: "T", status: "open" }], new Map()).records;
    expect(collectWarnings(risks, [])).toEqual([]);
  });

  it("flags metric names no dashboard reads, ignoring case and the vulnerability family", () => {
    const row = (name: string) => ({
      name,
      category: "it",
      role_relevance: "CIO",
      value: "1",
      unit: "%",
      period_start: "2026-08-01",
      period_end: "2026-08-31",
    });
    const metrics = buildMetrics([row("core banking uptime"), row("Critical Vulnerabilities Open"), row("Core Bank Uptime")]);
    const warnings = collectWarnings([], [], metrics);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/"Core Bank Uptime" isn't a name any dashboard reads/);
  });
});
