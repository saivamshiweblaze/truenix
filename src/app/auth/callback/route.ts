import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";

/**
 * OAuth / PKCE callback. Supabase redirects here with ?code= after email confirmation, password recovery and,
 * once configured, Google sign-in (signInWithOAuth({ provider: "google", options: { redirectTo: …/auth/callback } })).
 * The same route serves every provider, so adding Google later needs configuration only.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), "/home");
  const providerError = url.searchParams.get("error_description");

  if (providerError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(providerError.slice(0, 200))}`, url.origin));
  }
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    // Email links are verified by Supabase before redirecting here. If the code can't be exchanged (for example the
    // link was opened in another browser), the address is already confirmed but there is no session in this browser.
    if (next === "/reset-password") {
      return NextResponse.redirect(new URL("/forgot-password?error=link", url.origin));
    }
    return NextResponse.redirect(new URL("/login?verified=1", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
}
