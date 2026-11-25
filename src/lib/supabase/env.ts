/**
 * Public Supabase configuration. Only the project URL and the publishable (anon) key may be referenced here:
 * both are designed to be shipped to browsers, and every table is protected by Row Level Security.
 *
 * The service-role key is read exclusively in src/lib/supabase/admin.ts (server-only).
 * The literal `process.env.NEXT_PUBLIC_…` references are required so Next.js can inline them at build time.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured() {
  return /^https?:\/\//.test(supabaseUrl) && supabasePublishableKey.length > 20;
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see README → Environment).",
    );
  }
}
