import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { AuthProvider } from "../hooks/useAuth";

const loginMock = vi.fn();

vi.mock("../services/api", () => ({
  loadStoredToken: () => null,
  setAuthToken: vi.fn(),
  login: (username: string, password: string) => loginMock(username, password),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("renders username/password fields and a demo-credentials hint", () => {
    renderLoginPage();
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByText(/usernames: ciso, cio, cro, board/i)).toBeInTheDocument();
  });

  it("submits the entered credentials to the API client", async () => {
    loginMock.mockResolvedValueOnce({ token: "fake" });
    renderLoginPage();

    await userEvent.type(screen.getByLabelText("Username"), "board");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(loginMock).toHaveBeenCalledWith("board", "password");
  });

  it("shows an error message when login rejects", async () => {
    loginMock.mockRejectedValueOnce(new Error("bad credentials"));
    renderLoginPage();

    await userEvent.type(screen.getByLabelText("Username"), "board");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });
});
