import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../hooks/useAuth";

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
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated && role) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? defaultRouteForRole(role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid username or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Crestera Pulse</h1>
        <p className="login-subtitle">Free executive risk preview — sign in to view your role-specific dashboard</p>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        <div className="login-hint">Demo users: ciso / cio / cro / board — password: password</div>
      </form>
    </div>
  );
}
