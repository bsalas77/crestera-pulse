import { useCallback, useEffect, useState } from "react";
import axios from "axios";

export const UNREACHABLE_API =
  "Can't reach Crestera Pulse. Check that it is running with: docker compose ps";

// 502/503/504 come from the UI's nginx when the API container behind it isn't answering.
const API_DOWN =
  "The Crestera Pulse API isn't answering. Check it with: docker compose ps — and for the reason: docker compose logs api";

function isGatewayError(status: number | undefined): boolean {
  return status === 502 || status === 503 || status === 504;
}

export function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return UNREACHABLE_API;
    if (isGatewayError(err.response.status)) return API_DOWN;
    return `The API returned an error (HTTP ${err.response.status}). Check its log with: docker compose logs api`;
  }
  return "Something went wrong loading this dashboard.";
}

/** Login-specific wording: a wrong password, throttling and an unreachable API look very different to a user. */
export function describeLoginError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (!err.response) return UNREACHABLE_API;
    if (isGatewayError(status)) return API_DOWN;
    if (status === 401) return "Invalid username or password.";
    if (status === 429) return "Too many sign-in attempts. Wait a minute, then try again.";
    return `Sign-in failed because of a server problem (HTTP ${status}). Check its log with: docker compose logs api`;
  }
  return "Sign-in failed. Please try again.";
}

/** Loads a dashboard once, exposing loading/error state and a retry. */
export function useDashboard<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetcher()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        // A 401 is handled globally (redirect to login); don't flash an error first.
        if (cancelled || (axios.isAxiosError(err) && err.response?.status === 401)) return;
        setError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, retry };
}
