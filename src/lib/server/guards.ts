import "server-only";

import type { AdminModuleId, AdminPermission } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { parseSession } from "@/lib/data/load-session";

export class AccessError extends Error {
  constructor(message = "You don’t have permission to do that.") {
    super(message);
  }
}

/**
 * Verifies, on the server, that the caller is a signed-in platform administrator whose operator role grants
 * `permission` on `module`. The answer comes from the database (public.my_session_context(), evaluated with the
 * caller's own session), never from anything the browser sends.
 */
export async function requireAdmin(module: AdminModuleId, permission: AdminPermission) {
  const supabase = await supabaseServer();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) throw new AccessError("Your session has ended. Sign in again.");
  const { data: raw } = await supabase.rpc("my_session_context");
  const ctx = parseSession(raw);
  if (!ctx || ctx.accountStatus !== "active" || !ctx.adminRole) throw new AccessError();
  if (!ctx.adminPermissions.some((p) => p.module === module && p.permission === permission)) {
    throw new AccessError(`Your administrator role doesn’t include “${permission.replace("_", " ")}” for ${module}.`);
  }
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", auth.user.id).maybeSingle();
  return {
    user: auth.user,
    ctx,
    supabase,
    admin: supabaseAdmin(),
    actorLabel: profile?.display_name || auth.user.email || "Administrator",
  };
}

export type AdminContext = Awaited<ReturnType<typeof requireAdmin>>;

/** Appends to the audit log (service role; the table rejects UPDATE/DELETE). */
export async function audit(
  c: AdminContext,
  e: { action: string; entity: string; targetId?: string | null; target?: string; before?: string | null; after?: string | null; reason?: string | null; sensitive?: boolean },
) {
  const clip = (v: string | null | undefined, n: number) => (v ? v.slice(0, n) : null);
  const { error } = await c.admin.from("audit_logs").insert({
    actor_id: c.user.id,
    actor_label: c.actorLabel.slice(0, 200),
    actor_role: c.ctx.adminRole,
    action: e.action.slice(0, 120),
    entity: e.entity.slice(0, 60),
    target_id: clip(e.targetId ?? null, 120),
    target_label: (e.target ?? "").slice(0, 300),
    before_value: clip(e.before, 2000),
    after_value: clip(e.after, 2000),
    reason: clip(e.reason, 1000),
    sensitive: !!e.sensitive,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}
