import type { Json } from "@/lib/supabase/database.types";
import type { AdminModuleId, AdminPermission, AdminRoleId } from "@/lib/types";
import type { SessionInfo } from "@/lib/store/state";

/** Parses public.my_session_context(). Shared by the browser loader and server-side guards. */
export function parseSession(raw: Json | null): SessionInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, Json>;
  const arr = (v: Json | undefined) => (Array.isArray(v) ? (v as Record<string, Json>[]) : []);
  return {
    userId: String(r.user_id),
    accountStatus: (r.account_status as SessionInfo["accountStatus"]) ?? "active",
    accountStatusReason: (r.account_status_reason as string | null) ?? null,
    onboardingCompleted: !!r.onboarding_completed,
    roles: arr(r.roles).map((x) => ({ role: x.role as "platform_admin" | "institution_admin", institutionId: (x.institution_id as string | null) ?? null })),
    adminRole: (r.admin_role as AdminRoleId | null) ?? null,
    adminPermissions: arr(r.admin_permissions).map((x) => ({ module: x.module as AdminModuleId, permission: x.permission as AdminPermission })),
    institutions: arr(r.institutions).map((x) => ({ institutionId: String(x.institution_id), memberRole: String(x.member_role), status: String(x.status) })),
  };
}

