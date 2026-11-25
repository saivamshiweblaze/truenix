import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

/**
 * Service-role client. Bypasses Row Level Security, so it may only be used in trusted server code AFTER the
 * caller's identity and permission have been verified (see src/lib/server/guards.ts).
 *
 * The key is read from SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY). It must never be given a
 * NEXT_PUBLIC_ prefix, and `server-only` makes any client-side import a build error.
 */
export function serviceRoleKeyConfigured() {
  return !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
}

export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !key) {
    throw new Error("Administrative operations are unavailable: SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }
  return createClient<Database>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
