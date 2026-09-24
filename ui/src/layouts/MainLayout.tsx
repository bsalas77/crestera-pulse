import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function MainLayout() {
  const { username, role, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          Crestera Pulse <span className="app-title-tag">free preview</span>
        </div>
        <div className="app-user">
          <span>
            {username} · {role}
          </span>
          <button className="btn-link" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <div className="app-body">
        <div className="app-side">
          <nav className="app-nav">
            {(role === "CISO" || role === "BOARD") && (
              <NavLink to="/ciso-dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
                CISO Dashboard
              </NavLink>
            )}
            {(role === "CIO" || role === "BOARD") && (
              <NavLink to="/cio-dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
                CIO Dashboard
              </NavLink>
            )}
            {(role === "CRO" || role === "BOARD") && (
              <NavLink to="/cro-dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
                CRO Dashboard
              </NavLink>
            )}
            {role === "BOARD" && (
              <NavLink to="/board-dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
                Board Dashboard
              </NavLink>
            )}
          </nav>
          <UpgradeCallout />
        </div>
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
