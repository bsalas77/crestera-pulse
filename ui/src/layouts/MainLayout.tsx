import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// The shell is the Crestera suite's (GRC, ITSM, Vuln, Control): navy sidebar
// with the product tile, a white top bar with the page title, light page.
// Pulse uses GRC's teal: it is the free counterpart of GRC's executive views.

const DASHBOARDS = [
  { to: "/ciso-dashboard", label: "CISO Dashboard", roles: ["CISO", "BOARD"], icon: "shield" },
  { to: "/cio-dashboard", label: "CIO Dashboard", roles: ["CIO", "BOARD"], icon: "server" },
  { to: "/cro-dashboard", label: "CRO Dashboard", roles: ["CRO", "BOARD"], icon: "gauge" },
  { to: "/board-dashboard", label: "Board Dashboard", roles: ["BOARD"], icon: "briefcase" },
] as const;

// Icon shapes from Lucide (ISC license; see THIRD-PARTY-NOTICES.md).
const ICONS: Record<string, string> = {
  shield:
    "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
  server:
    "M4 2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM6 6h.01M6 18h.01",
  gauge: "m12 14 4-4M3.34 19a10 10 0 1 1 17.32 0",
  briefcase:
    "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z",
};

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function MainLayout() {
  const { username, role, logout } = useAuth();
  const { pathname } = useLocation();
  const items = DASHBOARDS.filter((d) => role !== null && (d.roles as readonly string[]).includes(role));
  const title = DASHBOARDS.find((d) => d.to === pathname)?.label ?? "Dashboard";

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="app-tile">CP</span>
          <div className="app-brand-text">
            <div className="app-brand-name">Crestera Pulse</div>
            <div className="app-brand-sub">Free preview</div>
          </div>
        </div>
        <nav className="app-nav" aria-label="Dashboards">
          <div className="app-nav-section">Dashboards</div>
          {items.map((d) => (
            <NavLink key={d.to} to={d.to} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon name={d.icon} />
              <span>{d.label}</span>
            </NavLink>
          ))}
        </nav>
        <UpgradeCallout />
        <div className="app-user">
          <div className="app-user-name">{username}</div>
          <div className="app-brand-sub">{role}</div>
          <button className="btn-link" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <div className="app-page">
        <header className="app-topbar">
          <h1>{title}</h1>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function UpgradeCallout() {
  // Build-time setting (CRESTERA_URL in .env). Without a URL this is plain text, never a dead link.
  const url = import.meta.env.VITE_CRESTERA_URL;
  const body = (
    <>
      <div className="upgrade-callout-title">Powered by Crestera</div>
      <p>
        This is a free, read-only preview. Crestera adds automated evidence collection, audit trails, and FFIEC/NCUA
        framework crosswalks.
      </p>
      {url && <span className="upgrade-callout-cta">See what Crestera adds →</span>}
    </>
  );

  return url ? (
    <a className="upgrade-callout" href={url} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <div className="upgrade-callout">{body}</div>
  );
}
