import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../hooks/useAuth";
import { describeLoginError } from "../hooks/useDashboard";
import { getDemoMode } from "../services/api";

function defaultRouteForRole(role: Role): string {
  switch (role) {
    case "CISO":
      return "/ciso-dashboard";
    case "CIO":
      return "/cio-dashboard";
    case "CRO":
      return "/cro-dashboard";
    case "BOARD":
      return "/board-dashboard";
  }
}

export function LoginPage() {
  const { isAuthenticated, role, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demo, setDemo] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    getDemoMode()
      .then((isDemo) => !cancelled && setDemo(isDemo))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (isAuthenticated && role) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? defaultRouteForRole(role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(describeLoginError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="app-tile">CP</span>
          <div>
            <h1>Crestera Pulse</h1>
            <div className="login-brand-sub">Executive risk dashboard</div>
          </div>
        </div>
        <p className="login-subtitle">Free executive risk preview — sign in to view your role-specific dashboard</p>
        <label>
          Username
          {/* Phone keyboards would otherwise capitalise "board" to "Board", and usernames are case-sensitive. */}
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        {demo && (
          <div className="login-hint">
            Every demo account's password is <strong>password</strong>. Usernames: ciso, cio, cro, board.
          </div>
        )}
      </form>
    </div>
  );
}
