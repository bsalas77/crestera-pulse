import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "../hooks/useAuth";

interface ProtectedRouteProps {
  allow: Role[];
  children: ReactNode;
}

export function ProtectedRoute({ allow, children }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
