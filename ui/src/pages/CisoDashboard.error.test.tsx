import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { describe, expect, it, vi } from "vitest";
import { CisoDashboard } from "./CisoDashboard";

const getCisoDashboard = vi.fn();
vi.mock("../services/api", () => ({ getCisoDashboard: (...a: unknown[]) => getCisoDashboard(...a) }));

describe("dashboard error state", () => {
  it("shows a clear message with a retry instead of loading forever", async () => {
    getCisoDashboard.mockRejectedValueOnce(new AxiosError("Network Error"));
    render(<CisoDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach crestera pulse/i);

    getCisoDashboard.mockReturnValue(new Promise(() => {})); // retry → loading again
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText(/loading ciso dashboard/i)).toBeInTheDocument();
  });
});
