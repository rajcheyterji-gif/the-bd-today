// Minimal fetch-query hook (the target repo has no @tanstack/react-query
// dependency, so data hooks use plain fetch + useState/useEffect).
// Mirrors the react-query surface components relied on: data / isPending /
// isError / error / refetch.

import { useCallback, useEffect, useRef, useState } from "react";

export interface QueryResult<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { enabled?: boolean },
): QueryResult<T> {
  const enabled = opts?.enabled ?? true;
  const [data, setData] = useState<T | undefined>(undefined);
  const [isPending, setIsPending] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setIsPending(false);
      return;
    }
    let cancelled = false;
    setIsPending(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsPending(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-run when the key or the manual refetch nonce changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce, enabled]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { data, isPending, isError: error !== null, error, refetch };
}
