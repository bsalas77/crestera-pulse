import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MainLayout } from "./MainLayout";
import { useAuth } from "../hooks/useAuth";

vi.mock("../hooks/useAuth", () => ({ useAuth: vi.fn() }));

function renderLayout() {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    role: "BOARD",
    username: "board",
    login: vi.fn(),
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <MainLayout />
    </MemoryRouter>
  );
}

afterEach(() => vi.unstubAllEnvs());

describe("Crestera callout", () => {
  it("is plain text, never a dead link, when no URL is configured", () => {
    vi.stubEnv("VITE_CRESTERA_URL", "");
    renderLayout();
    expect(screen.getByText("Powered by Crestera")).toBeInTheDocument();
    expect(screen.queryByText(/see what crestera adds/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /powered by crestera/i })).not.toBeInTheDocument();
  });

  it("links to the configured URL", () => {
    vi.stubEnv("VITE_CRESTERA_URL", "https://example.com/crestera");
    renderLayout();
    expect(screen.getByRole("link", { name: /powered by crestera/i })).toHaveAttribute(
      "href",
      "https://example.com/crestera"
    );
  });
});
