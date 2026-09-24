import { useCallback, useEffect, useState } from "react";
import axios from "axios";

export function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "Can't reach the API. Check that it is running, that PUBLIC_API_URL is correct, and that PUBLIC_UI_URL matches the address in your browser.";
    }
    return `The API returned an error (HTTP ${err.response.status}). Check the API logs and try again.`;
  }
  return "Something went wrong loading this dashboard.";
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
