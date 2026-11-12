"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEY } from "@/config/brand";
import { initialState, persistedSchema, type AppState } from "./state";

/**
 * Minimal external store for Phase 1 demonstration state.
 * Persisted to localStorage in this browser only. Replace the persistence
 * functions with API calls when a backend exists; actions keep the same shape.
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

function persist(state: AppState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode / quota) — state stays in memory */
  }
}

function load(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = persistedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return initialState();
    // Merge onto defaults so newly added fields always exist.
    const base = initialState();
    const data = parsed.data as unknown as AppState;
    return {
      ...base,
      ...data,
      notificationPrefs: { ...base.notificationPrefs, ...data.notificationPrefs },
      privacy: { ...base.privacy, ...data.privacy },
      admin: { ...base.admin, ...data.admin, settings: { ...base.admin.settings, ...data.admin?.settings } },
    };
  } catch {
    return initialState();
  }
}

export function hydrateStore() {
  if (snapshot.hydrated) return;
  snapshot = { state: load(), hydrated: true };
  emit();
}

export function getState() {
  return snapshot.state;
}

export function setState(updater: (s: AppState) => AppState) {
  const next = updater(snapshot.state);
  if (next === snapshot.state) return;
  snapshot = { state: next, hydrated: snapshot.hydrated };
  persist(next);
  emit();
}

export function resetStore() {
  snapshot = { state: initialState(), hydrated: true };
  persist(snapshot.state);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      snapshot = { state: load(), hydrated: true };
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}

export function useAppState(): AppState {
  return useAppSnapshot().state;
}
