"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { emailSchema, fieldErrors, loginSchema, passwordSchema, registerSchema, safeNext } from "@/lib/validation";

/**
 * Account operations. Supabase Auth owns credentials, hashing, sessions, verification and recovery; these
 * actions only validate input, call it from the server (so session cookies are set server-side) and translate
 * errors into messages that never reveal whether an account exists.
 */

export type AuthResult = { ok: true; message?: string; next?: string } | { ok: false; error: string; fields?: Record<string, string> };

const TERMS_VERSION = "2026-11";

/** Absolute origin for email links. Supabase only honours URLs on its redirect allow-list. */
async function origin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

function friendly(message: string | undefined, fallback: string) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a few minutes and try again.";
  if (m.includes("weak") || m.includes("password should")) return "Choose a stronger password: at least 10 characters with upper and lower case letters and a number.";
  if (m.includes("email not confirmed")) return "Confirm your email address first — open the link we sent when you registered, or resend it below.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) return "New registrations are paused at the moment.";
  return fallback;
}

export async function registerAction(input: { name: string; email: string; password: string; confirm: string; terms: boolean }): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const supabase = await supabaseServer();
  const { data: settings } = await supabase.rpc("public_settings");
  if (settings && (settings as { open_registration?: boolean }).open_registration === false) {
    return { ok: false, error: "New registrations are paused at the moment." };
  }
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding`,
      // Display name and the accepted terms version only. Roles are never taken from metadata.
      data: { full_name: parsed.data.name, accepted_terms_version: TERMS_VERSION },
    },
  });
  if (error) return { ok: false, error: friendly(error.message, "We couldn’t create your account. Try again in a moment.") };
  // With email confirmation enabled Supabase returns no session, and an existing address gets no new account:
  // the response is identical either way, so the message must not claim more than that.
  return { ok: true, next: `/verify-email?email=${encodeURIComponent(parsed.data.email.toLowerCase())}` };
}

export async function signInAction(input: { email: string; password: string; next?: string | null }): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email.toLowerCase(), password: parsed.data.password });
  if (error || !data.user) {
    const unconfirmed = (error?.message ?? "").toLowerCase().includes("email not confirmed");
    return { ok: false, error: unconfirmed ? friendly(error?.message, "") : friendly(error?.message, "That email and password don’t match an account.") };
  }
  const { data: ctx } = await supabase.rpc("my_session_context");
  const status = (ctx as { account_status?: string } | null)?.account_status;
  if (status === "suspended" || status === "deactivated") {
    await supabase.auth.signOut();
    return { ok: false, error: status === "suspended" ? "This account is suspended. Contact support if you think this is a mistake." : "This account has been deactivated." };
  }
  await supabase.rpc("touch_last_active");
  const c = ctx as { onboarding_completed?: boolean; admin_role?: string | null } | null;
  const fallback = c?.admin_role ? "/admin" : c?.onboarding_completed ? "/home" : "/onboarding";
  return { ok: true, next: c?.onboarding_completed || c?.admin_role ? safeNext(input.next, fallback) : "/onboarding" };
}

export async function signOutAction(scope: "local" | "global" = "local"): Promise<AuthResult> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope });
  return { ok: true };
}

export async function requestPasswordResetAction(email: string): Promise<AuthResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, fields: { email: parsed.error.issues[0].message } };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.toLowerCase(), {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  // Same response whether or not the address has an account (no account enumeration). Rate limits are surfaced.
  if (error && /rate limit|too many/i.test(error.message)) return { ok: false, error: friendly(error.message, "") };
  return { ok: true };
}

export async function resendVerificationAction(email: string): Promise<AuthResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.toLowerCase(),
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error && /rate limit|too many|seconds/i.test(error.message)) return { ok: false, error: "Wait a minute before requesting another link." };
  return { ok: true };
}

/** Sets a new password for the current recovery session (after following a reset link). */
export async function completePasswordResetAction(input: { password: string; confirm: string }): Promise<AuthResult> {
  const parsed = z.object({ password: passwordSchema, confirm: z.string() }).refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "This reset link has expired or was opened in a different browser. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: friendly(error.message, "We couldn’t update your password. Request a new reset link and try again.") };
  // End every other session that may have been using the old password.
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true };
}

/** Password change from Settings: re-verifies the current password first. */
export async function changePasswordAction(input: { current: string; password: string; confirm: string }): Promise<AuthResult> {
  const schema = z
    .object({ current: z.string().min(1, "Enter your current password."), password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] })
    .refine((v) => v.password !== v.current, { message: "Choose a different password from your current one.", path: ["password"] });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return { ok: false, error: "Your session has ended. Sign in again." };
  const check = await supabase.auth.signInWithPassword({ email: auth.user.email, password: parsed.data.current });
  if (check.error) return { ok: false, error: "Your current password is incorrect.", fields: { current: "Your current password is incorrect." } };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: friendly(error.message, "We couldn’t change your password. Try again.") };
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

/** Email change: Supabase sends confirmation to the new address (and the old one, when double-confirm is on). */
export async function changeEmailAction(email: string): Promise<AuthResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, fields: { email: parsed.error.issues[0].message } };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ email: parsed.data.toLowerCase() }, { emailRedirectTo: `${await origin()}/auth/callback?next=/settings` });
  if (error) return { ok: false, error: friendly(error.message, "We couldn’t start the email change. Try again later.") };
  return { ok: true, message: "Confirm the change from the link sent to your new address. Your current email stays active until then." };
}

/**
 * Permanently deletes the caller's own account after re-checking their password. Uses the service role only
 * after the identity check; database rows owned by the account are removed by ON DELETE CASCADE.
 */
export async function deleteAccountAction(password: string): Promise<AuthResult> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return { ok: false, error: "Your session has ended. Sign in again." };
  const check = await supabase.auth.signInWithPassword({ email: auth.user.email, password });
  if (check.error) return { ok: false, error: "Your password is incorrect.", fields: { password: "Your password is incorrect." } };
  const { data: ctx } = await supabase.rpc("my_session_context");
  if ((ctx as { admin_role?: string | null } | null)?.admin_role) {
    return { ok: false, error: "Administrator accounts can’t be deleted from Settings. Ask another super administrator to remove your access first." };
  }
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const { error } = await supabaseAdmin().auth.admin.deleteUser(auth.user.id);
  if (error) return { ok: false, error: "We couldn’t delete the account. Try again later or contact support." };
  await supabase.auth.signOut();
  return { ok: true };
}
