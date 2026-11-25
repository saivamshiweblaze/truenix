"use client";

import { toast } from "@/components/ui/toast";
import { supabaseBrowser, type TypedClient } from "@/lib/supabase/client";
import { getState } from "@/lib/store/store";
import { reloadAppData } from "./session";

/**
 * Write-through helper for member actions. The interface updates optimistically; the write then runs under
 * the member's own session (RLS). If the server refuses or fails, the member is told and the cache is reloaded
 * from the server so the screen never shows data that was not saved.
 */
type Result = { error: { message: string; code?: string } | null };

export function newId() {
  return crypto.randomUUID();
}

export function authUid(): string | null {
  return getState().authUserId;
}

/** Translates "me" (the interface's id for the signed-in member) back to their auth user id. */
export function dbId(id: string | undefined | null): string | null {
  if (!id) return null;
  return id === "me" ? authUid() : id;
}

function describe(err: { message: string; code?: string }) {
  if (err.code === "42501" || /row-level security|permission denied/i.test(err.message)) return "You don’t have permission to do that.";
  if (/violates check constraint|invalid input/i.test(err.message)) return "Some of the information isn’t in a valid format.";
  if (/duplicate key/i.test(err.message)) return "That already exists.";
  if (/Failed to fetch|NetworkError|network/i.test(err.message)) return "You appear to be offline. Your change wasn’t saved.";
  // Messages raised deliberately by database guards are written for people; pass those through.
  if (err.code === "P0001" || err.code === "42501") return err.message;
  return err.message.length < 160 ? err.message : "Something went wrong while saving.";
}

/**
 * Runs `op` (one or more sequential writes). Returns true when every write succeeded.
 * `refresh` reloads from the server afterwards so derived fields (counts, trigger results) are exact.
 */
export async function write(label: string, op: (sb: TypedClient, uid: string) => PromiseLike<Result | Result[] | void>, opts: { refresh?: boolean; quiet?: boolean } = {}) {
  const uid = authUid();
  if (!uid) {
    toast("Sign in to save changes", { body: label });
    return false;
  }
  try {
    const res = await op(supabaseBrowser(), uid);
    const errors = (Array.isArray(res) ? res : res ? [res] : []).map((r) => r.error).filter(Boolean) as { message: string; code?: string }[];
    if (errors.length) {
      toast(`Couldn’t save: ${label}`, { body: describe(errors[0]) });
      void reloadAppData();
      return false;
    }
    if (opts.refresh !== false) void reloadAppData();
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (!opts.quiet) toast(`Couldn’t save: ${label}`, { body: describe({ message }) });
    void reloadAppData();
    return false;
  }
}

/** Fire-and-forget variant used by synchronous action functions. */
export function sync(label: string, op: (sb: TypedClient, uid: string) => PromiseLike<Result | Result[] | void>, opts?: { refresh?: boolean }) {
  void write(label, op, opts);
}
