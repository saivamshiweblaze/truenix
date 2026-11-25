"use client";

import { useSyncExternalStore } from "react";
import { initialState, type AppState } from "./state";

/**
 * Client-side read model for the signed-in member.
 *
 * Phase 2: the store is a cache of what Supabase returned under the member's own session (Row Level Security
 * decides what is in it). It is filled by lib/data/session.ts and is never written to browser storage, so
 * records are not left on shared devices and cannot be tampered with to gain access. Actions update the cache
 * optimistically and write through to Supabase; the server's answer always wins on the next reload.
 */

interface Snapshot {
  state: AppState;
  hydrated: boolean;
}

const serverSnapshot: Snapshot = { state: initialState(), hydrated: false };
let snapshot: Snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Kept for API compatibility: hydration now happens when the Supabase session resolves (see SessionSync). */
export function hydrateStore() {}

/** Replaces the whole cache with server data and marks the store hydrated. */
export function replaceState(next: AppState) {
  snapshot = { state: next, hydrated: true };
  emit();
}

export function markHydrated() {
  if (snapshot.hydrated) return;
  snapshot = { state: snapshot.state, hydrated: true };
  emit();
}

export function getState() {
  return snapshot.state;
}

export function isHydrated() {
  return snapshot.hydrated;
}

export function setState(updater: (s: AppState) => AppState) {
  const next = updater(snapshot.state);
  if (next === snapshot.state) return;
  snapshot = { state: next, hydrated: snapshot.hydrated };
  emit();
}

/** Clears every cached record (sign-out). */
export function resetStore() {
  snapshot = { state: initialState(), hydrated: true };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}

export function useAppState(): AppState {
  return useAppSnapshot().state;
}
