import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase session cookie on every request so Server Components, Server Actions and the browser
 * share one up-to-date session, and sends signed-out visitors to sign in before protected pages render.
 *
 * This redirect is a convenience, not the security boundary: data access is enforced by Row Level Security and
 * every privileged operation re-verifies the caller on the server.
 */
const PROTECTED = [
  "/home", "/discover", "/ideas", "/research", "/validate", "/community", "/opportunities", "/workspace", "/profile",
  "/people", "/notifications", "/messages", "/settings", "/search", "/reviews", "/studies", "/institution", "/admin", "/onboarding",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() validates the access token (refreshing it when needed) — do not remove: it keeps sessions alive.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;

  const path = request.nextUrl.pathname;
  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
