"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { assertSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

export type TypedClient = SupabaseClient<Database>;

let browserClient: TypedClient | null = null;

/**
 * Browser client. Uses the signed-in member's session (cookie based, shared with the server), so every query
 * runs under Row Level Security as that member. Never use it for privileged work.
 */
export function supabaseBrowser(): TypedClient {
  if (browserClient) return browserClient;
  assertSupabaseConfigured();
  browserClient = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
  return browserClient;
}
