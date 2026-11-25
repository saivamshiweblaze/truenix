import type { AdminModuleId, AdminPermission } from "@/lib/types";
import type { AppState } from "@/lib/store/state";

/**
 * Admin permission checks for the interface.
 *
 * Phase 2: the permission set comes from the database (public.my_session_context()), and every administrative
 * read and write is enforced again on the server (RLS policies and the guarded admin operations). These checks
 * only decide what the interface offers. A "role preview" can narrow the interface to another operator role's
 * permissions; it can never widen it beyond what the server granted.
 */
export function can(s: AppState, module: AdminModuleId, perm: AdminPermission): boolean {
  if (s.user?.role !== "platform_admin" || !s.session?.adminRole) return false;
  const granted = s.session.adminPermissions.some((p) => p.module === module && p.permission === perm);
  if (!granted) return false;
  const preview = s.platform.myAdminRole;
  if (preview && preview !== s.session.adminRole) return !!s.platform.rolePermissions[preview]?.[module]?.includes(perm);
  return true;
}

/** Message shown on a control the current administrator role cannot use. */
export function deniedReason(module: AdminModuleId, perm: AdminPermission) {
  return `Your administrator role doesn’t include “${perm.replace("_", " ")}” for ${module}.`;
}
