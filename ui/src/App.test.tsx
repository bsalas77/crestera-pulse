import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAuth } from "./hooks/useAuth";

vi.mock("./hooks/useAuth", () => ({ useAuth: vi.fn() }));

const trend = [{ period: "2026-08", value: 99.9 }];
const risk = { id: "r1", category: "cyber", title: "Sample risk", residual_score: 5, status: "open", owner: "x" };

vi.mock("./services/api", () => ({
  getCisoDashboard: async () => ({
    securityPostureScore: 78,
    securityPostureTrend: trend,
    vulnerabilitiesByCriticality: [],
    securityIncidentsSummary: { total: 0, bySeverity: {}, mttd: 0, mttr: 0 },
    thirdPartyCyberRiskSummary: [],
    topCyberRisks: [risk],
    controlEffectiveness: { averageByFramework: {} },
    regulatoryMetrics: [],
  }),
  getCioDashboard: async () => ({
    coreBankingUptime: { current: 99.9, trend },
    channelPerformance: { online: 99, mobile: 99, atm: 98, callCenter: 95 },
    changeRisk: { changeFailureRate: 5, incidentsLinkedToChanges: 1 },
    techDebtSummary: { legacyAssetCount: 1, endOfSupportAssetCount: 1 },
    capacityMetrics: { cpuUtilization: 50, memoryUtilization: 50, storageUtilization: 50 },
    applicationPortfolio: [],
    assetsByCriticality: [],
  }),
  getCroDashboard: async () => ({
    topRisks: [risk],
    lossEventsSummary: { totalAmount: 0, byType: {}, trend: [] },
    controlEffectiveness: { averageByFramework: {} },
    regulatoryPosture: { openIssuesCount: 0, upcomingDeadlinesCount: 0 },
    businessUnitRiskProfile: [],
    risksByCategory: [],
    incidentsWithImpact: [],
  }),
  getBoardDashboard: async () => ({
    overallSecurityPostureScore: 78,
    coreBankingUptime: { current: 99.9, trend },
    topEnterpriseRisks: [risk],
    lossEventsLast12Months: 0,
    lossEventsTrend: [],
    regulatoryComplianceStatus: { openIssuesCount: 0, upcomingDeadlinesCount: 0 },
  }),
}));

function renderAt(path: string, role: "CISO" | "CIO" | "CRO" | "BOARD") {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    role,
    username: role.toLowerCase(),
    login: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("App routing", () => {
  it("routes a BOARD user landing on / to the board dashboard", async () => {
    renderAt("/", "BOARD");
    expect(await screen.findByText(/board — executive summary/i)).toBeInTheDocument();
  });

  it("redirects a CIO user away from the CISO dashboard back to their own", async () => {
    renderAt("/ciso-dashboard", "CIO");
    expect(await screen.findByText(/cio — technology performance/i)).toBeInTheDocument();
  });

  it("shows only the CIO nav link for a CIO user", () => {
    renderAt("/cio-dashboard", "CIO");
    // The page title repeats the dashboard's name, so ask for the nav links.
    expect(screen.getByRole("link", { name: "CIO Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Board Dashboard" })).not.toBeInTheDocument();
  });
});
