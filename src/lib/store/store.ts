"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEY } from "@/config/brand";
import { initialState, persistedSchema, type AppState } from "./state";
import { seedPlatform, SEED_VERSION, type PlatformState } from "./platform";

/** Uses the stored platform data when it matches the current seed version; otherwise seeds once. */
function mergePlatform(base: PlatformState, stored: PlatformState | undefined): PlatformState {
  if (!stored || stored.seedVersion !== SEED_VERSION) return base;
  return {
    ...base,
    ...stored,
    config: {
      ...base.config,
      ...stored.config,
      identity: { ...base.config.identity, ...stored.config?.identity },
      features: { ...base.config.features, ...stored.config?.features },
      moderation: { ...base.config.moderation, ...stored.config?.moderation },
      notifications: { ...base.config.notifications, ...stored.config?.notifications },
      retention: { ...base.config.retention, ...stored.config?.retention },
      maintenance: { ...base.config.maintenance, ...stored.config?.maintenance },
      security: { ...base.config.security, ...stored.config?.security },
      taxonomy: { ...base.config.taxonomy, ...stored.config?.taxonomy },
    },
  };
}

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
      platform: mergePlatform(base.platform, data.platform),
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

/**
 * Rebuilds the platform data set from the seed files. The audit log is append-only, so it is
 * kept, and the reset itself is recorded by the caller (see admin-actions resetDemoData).
 */
export function resetPlatformData(update: (s: AppState) => AppState) {
  setState((s) => update({ ...s, platform: seedPlatform() }));
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
