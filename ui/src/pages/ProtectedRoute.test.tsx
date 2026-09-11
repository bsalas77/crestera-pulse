import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../hooks/useAuth";

vi.mock("../hooks/useAuth", () => ({ useAuth: vi.fn() }));

function renderProtected(allow: ("CISO" | "CIO" | "CRO" | "BOARD")[]) {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Home page</div>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute allow={allow}>
              <div>Secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("redirects to /login when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      role: null,
      username: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderProtected(["BOARD"]);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects home when the user's role isn't in the allow list", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      role: "CIO",
      username: "cio",
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderProtected(["CISO", "BOARD"]);
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });

  it("renders children when the role is allowed", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      role: "BOARD",
      username: "board",
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderProtected(["CISO", "BOARD"]);
    expect(screen.getByText("Secret content")).toBeInTheDocument();
  });
});
