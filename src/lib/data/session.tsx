"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getState, markHydrated, replaceState, resetStore, setState } from "@/lib/store/store";
import { loadAppState } from "./load";

/**
 * Keeps the client read model in step with the Supabase session.
 *
 *  - On mount: resolves the session (getUser() validates it with Supabase Auth) and loads the member's data.
 *  - On sign-in / sign-out in any tab: reloads or clears.
 *  - When the tab becomes visible again, and every two minutes while visible: re-reads, so changes made by other
 *    members (comments, review decisions, access grants and revocations) appear without a manual refresh.
 */
const REFRESH_MS = 120_000;
let inflight: Promise<void> | null = null;
let queued = false;

export function reloadAppData(): Promise<void> {
  if (!isSupabaseConfigured()) {
    markHydrated();
    return Promise.resolve();
  }
  if (inflight) {
    queued = true;
    return inflight;
  }
  inflight = (async () => {
    const sb = supabaseBrowser();
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) {
      if (getState().signedIn || !getState().loadedAt) resetStore();
      else markHydrated();
      return;
    }
    if (getState().authUserId !== data.user.id) setState((s) => ({ ...s, dataStatus: "loading" }));
    try {
      const next = await loadAppState(sb, data.user);
      replaceState(next);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      // Keep whatever was already loaded; surface the failure instead of pretending the data is current.
      replaceState({ ...getState(), signedIn: true, authUserId: data.user.id, dataStatus: "error", dataError: message });
    }
  })().finally(() => {
    inflight = null;
    if (queued) {
      queued = false;
      void reloadAppData();
    }
  });
  return inflight;
}

export function SessionSync() {
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      markHydrated();
      return;
    }
    void reloadAppData();
    const sb = supabaseBrowser();
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetStore();
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // Avoid calling Supabase inside the callback itself (documented deadlock risk).
        setTimeout(() => void reloadAppData(), 0);
      }
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && getState().signedIn) void reloadAppData();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && getState().signedIn) void reloadAppData();
    }, REFRESH_MS);
    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
