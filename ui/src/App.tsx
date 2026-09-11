import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { BoardDashboard } from "./pages/BoardDashboard";
import { CioDashboard } from "./pages/CioDashboard";
import { CisoDashboard } from "./pages/CisoDashboard";
import { CroDashboard } from "./pages/CroDashboard";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./pages/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

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
              <CisoDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="cio-dashboard"
          element={
            <ProtectedRoute allow={["CIO", "BOARD"]}>
              <CioDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="cro-dashboard"
          element={
            <ProtectedRoute allow={["CRO", "BOARD"]}>
              <CroDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="board-dashboard"
          element={
            <ProtectedRoute allow={["BOARD"]}>
              <BoardDashboard />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
