import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./pages/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

// Each dashboard (and the charting library behind it) loads when it is first
// opened, so the sign-in page stays small.
const CisoDashboard = lazy(() => import("./pages/CisoDashboard").then((m) => ({ default: m.CisoDashboard })));
const CioDashboard = lazy(() => import("./pages/CioDashboard").then((m) => ({ default: m.CioDashboard })));
const CroDashboard = lazy(() => import("./pages/CroDashboard").then((m) => ({ default: m.CroDashboard })));
const BoardDashboard = lazy(() => import("./pages/BoardDashboard").then((m) => ({ default: m.BoardDashboard })));

function HomeRedirect() {
  const { role } = useAuth();
  switch (role) {
    case "CISO":
      return <Navigate to="/ciso-dashboard" replace />;
    case "CIO":
      return <Navigate to="/cio-dashboard" replace />;
    case "CRO":
      return <Navigate to="/cro-dashboard" replace />;
    case "BOARD":
      return <Navigate to="/board-dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route index element={<HomeRedirect />} />
        <Route
          path="ciso-dashboard"
          element={
            <ProtectedRoute allow={["CISO", "BOARD"]}>
              <Suspense fallback={<div className="loading">Loading…</div>}>
                <CisoDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="cio-dashboard"
          element={
            <ProtectedRoute allow={["CIO", "BOARD"]}>
              <Suspense fallback={<div className="loading">Loading…</div>}>
                <CioDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="cro-dashboard"
          element={
            <ProtectedRoute allow={["CRO", "BOARD"]}>
              <Suspense fallback={<div className="loading">Loading…</div>}>
                <CroDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="board-dashboard"
          element={
            <ProtectedRoute allow={["BOARD"]}>
              <Suspense fallback={<div className="loading">Loading…</div>}>
                <BoardDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
