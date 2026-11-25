"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Reads data from Supabase for one screen section (always under the member's own session) and exposes
 * loading / error / ready states plus a reload. Use for data that is only needed on one page.
 */
export function useLiveQuery<T>(fetcher: () => PromiseLike<{ data: T | null; error: { message: string } | null }>, deps: unknown[]) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; data: T | null; error: string | null }>({ status: "loading", data: null, error: null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let ignore = false;
    Promise.resolve(fetcher()).then(
      (res) => {
        if (ignore) return;
        setState(res.error ? { status: "error", data: null, error: res.error.message } : { status: "ready", data: res.data, error: null });
      },
      (e: unknown) => !ignore && setState({ status: "error", data: null, error: e instanceof Error ? e.message : "Couldn’t load" }),
    );
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass the fetcher's own dependencies
  }, [...deps, version]);

  return { ...state, reload };
}
