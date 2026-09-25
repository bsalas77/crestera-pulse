import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { AuthProvider } from "../hooks/useAuth";

const loginMock = vi.fn();
const demoMock = vi.fn();

vi.mock("../services/api", () => ({
  loadStoredToken: () => null,
  setAuthToken: vi.fn(),
  login: (username: string, password: string) => loginMock(username, password),
  getDemoMode: () => demoMock(),
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

const httpError = (status?: number) =>
  new AxiosError("x", "ERR", undefined, undefined, status ? ({ status } as never) : undefined);

async function submit(username = "board", password = "password") {
  await userEvent.type(screen.getByLabelText("Username"), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

beforeEach(() => {
  loginMock.mockReset();
  demoMock.mockReset().mockResolvedValue(false);
});

describe("LoginPage", () => {
  it("shows the demo password hint only when the demo accounts are active", async () => {
    demoMock.mockResolvedValue(true);
    renderLoginPage();
    expect(await screen.findByText(/usernames: ciso, cio, cro, board/i)).toBeInTheDocument();
  });

  it("hides the demo hint on a real (non-demo) deployment", async () => {
    renderLoginPage();
    await vi.waitFor(() => expect(demoMock).toHaveBeenCalled());
    expect(screen.queryByText(/usernames: ciso/i)).not.toBeInTheDocument();
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("submits the entered credentials to the API client", async () => {
    loginMock.mockResolvedValueOnce({ token: "fake" });
    renderLoginPage();
    await submit();
    expect(loginMock).toHaveBeenCalledWith("board", "password");
  });

  it("keeps phone keyboards from capitalising the username, and ignores stray spaces", async () => {
    loginMock.mockResolvedValueOnce({ token: "fake" });
    renderLoginPage();
    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("autocapitalize", "none");
    expect(input).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    await submit(" board ", "password");
    expect(loginMock).toHaveBeenCalledWith("board", "password");
  });

  it("says the password is wrong on a 401", async () => {
    loginMock.mockRejectedValueOnce(httpError(401));
    renderLoginPage();
    await submit("board", "wrong");
    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });

  it("says to wait when the login rate limit is hit", async () => {
    loginMock.mockRejectedValueOnce(httpError(429));
    renderLoginPage();
    await submit();
    expect(await screen.findByText(/too many sign-in attempts/i)).toBeInTheDocument();
  });

  it("explains an unreachable API instead of blaming the password", async () => {
    loginMock.mockRejectedValueOnce(httpError());
    renderLoginPage();
    await submit();
    expect(await screen.findByText(/can't reach crestera pulse/i)).toBeInTheDocument();
    expect(screen.queryByText(/invalid username or password/i)).not.toBeInTheDocument();
  });

  it("points at the API log on a server error", async () => {
    loginMock.mockRejectedValueOnce(httpError(500));
    renderLoginPage();
    await submit();
    expect(await screen.findByText(/docker compose logs api/i)).toBeInTheDocument();
  });
});
