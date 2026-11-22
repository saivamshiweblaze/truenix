import type { AdminModuleId, AdminPermission } from "@/lib/types";
import type { AppState } from "@/lib/store/state";

/**
 * Admin permission checks.
 *
 * IMPORTANT: in Phase 1 these run in the browser on browser-local data. They decide what the
 * interface offers; they are NOT a security boundary — anyone can edit localStorage. Phase 2
 * must enforce the same matrix on the server for every read and write (and filter private
 * fields server-side), with these checks kept only to shape the UI.
 */
export function can(s: AppState, module: AdminModuleId, perm: AdminPermission): boolean {
  if (s.user?.role !== "platform_admin") return false;
  const role = s.platform.myAdminRole;
  return !!s.platform.rolePermissions[role]?.[module]?.includes(perm);
}

/** Message shown on a control the current administrator role cannot use. */
export function deniedReason(module: AdminModuleId, perm: AdminPermission) {
  return `Your administrator role doesn’t include “${perm.replace("_", " ")}” for ${module}.`;
}
