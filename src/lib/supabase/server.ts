import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { assertSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Server client bound to the request's session cookies (Server Components, Server Actions, Route Handlers).
 * Queries run under Row Level Security as the signed-in member.
 */
export async function supabaseServer() {
  assertSupabaseConfigured();
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Verified identity of the caller, or null. Uses getUser(), which validates the session with Supabase Auth
 * (a cookie alone is never trusted for authorisation).
 */
export async function currentUser() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}
