import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { describe, expect, it, vi } from "vitest";
import { useDashboard } from "./useDashboard";

describe("useDashboard", () => {
  it("returns the data once loaded", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useDashboard(fetcher));
    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
    expect(result.current.error).toBeNull();
  });

  it("explains an unreachable API (no response)", async () => {
    const fetcher = vi.fn().mockRejectedValue(new AxiosError("Network Error"));
    const { result } = renderHook(() => useDashboard(fetcher));
    await waitFor(() => expect(result.current.error).toMatch(/Can't reach Crestera Pulse.*docker compose ps/));
  });

  it("says the API is down when nginx answers 502 for it", async () => {
    const err = new AxiosError("bad gateway", "ERR_BAD_RESPONSE", undefined, undefined, { status: 502 } as never);
    const fetcher = vi.fn().mockRejectedValue(err);
    const { result } = renderHook(() => useDashboard(fetcher));
    await waitFor(() => expect(result.current.error).toMatch(/API isn't answering.*docker compose logs api/));
  });

  it("reports the HTTP status when the API returns an error", async () => {
    const err = new AxiosError("boom", "ERR_BAD_RESPONSE", undefined, undefined, { status: 500 } as never);
    const fetcher = vi.fn().mockRejectedValue(err);
    const { result } = renderHook(() => useDashboard(fetcher));
    await waitFor(() => expect(result.current.error).toMatch(/HTTP 500/));
  });

  it("stays quiet on a 401, which is handled by the redirect to login", async () => {
    const err = new AxiosError("no", "ERR_BAD_REQUEST", undefined, undefined, { status: 401 } as never);
    const fetcher = vi.fn().mockRejectedValue(err);
    const { result } = renderHook(() => useDashboard(fetcher));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.error).toBeNull();
  });

  it("retries after a failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new AxiosError("Network Error")).mockResolvedValue({ n: 1 });
    const { result } = renderHook(() => useDashboard(fetcher));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    expect(result.current.error).toBeNull();
  });
});
