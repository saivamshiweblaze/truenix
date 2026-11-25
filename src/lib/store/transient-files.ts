"use client";

import { useSyncExternalStore } from "react";

/**
 * Memory-only holder for files a person attaches (resume, profile photo).
 *
 * Phase 1.5 has no secure server-side storage, so file contents are NEVER written to
 * localStorage or any other persistent store. Files live in this module for the
 * current tab only and disappear on reload or sign-out. Persisted state keeps
 * metadata only (name, size, type) — see FileMeta in lib/types.ts.
 *
 * Phase 2 integration point: replace `attach` with an upload to secure storage
 * and persist the returned object key instead of the in-memory File.
 */

/** "resume" and "photo" for onboarding; admin uploads use "admin:<record>:<field>" keys. */
export type TransientSlot = string;

interface Entry {
  file: File;
  url: string;
}

let files: Record<TransientSlot, Entry | undefined> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function attachTransientFile(slot: TransientSlot, file: File) {
  const prev = files[slot];
  if (prev) URL.revokeObjectURL(prev.url);
  files = { ...files, [slot]: { file, url: URL.createObjectURL(file) } };
  emit();
}

export function removeTransientFile(slot: TransientSlot) {
  const prev = files[slot];
  if (!prev) return;
  URL.revokeObjectURL(prev.url);
  const next = { ...files };
  delete next[slot];
  files = next;
  emit();
}

export function clearTransientFiles() {
  Object.values(files).forEach((e) => e && URL.revokeObjectURL(e.url));
  files = {};
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Current file in a slot (for uploading it to storage). */
export function getTransientFile(slot: TransientSlot): File | undefined {
  return files[slot]?.file;
}

export function useTransientFile(slot: TransientSlot): Entry | undefined {
  return useSyncExternalStore(
    subscribe,
    () => files[slot],
    () => undefined,
  );
}
