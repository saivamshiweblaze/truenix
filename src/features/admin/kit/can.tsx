"use client";

import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { can, deniedReason } from "@/lib/admin/permissions";
import { useAppState } from "@/lib/store/store";
import type { AdminModuleId, AdminPermission } from "@/lib/types";

/** Returns a checker bound to the current administrator role. Interface rule only — see lib/admin/permissions.ts. */
export function useCan() {
  const s = useAppState();
  return (module: AdminModuleId, perm: AdminPermission) => can(s, module, perm);
}

/** A button that is disabled, with an explanation, when the administrator role lacks the permission. */
export const PermButton = forwardRef<HTMLButtonElement, ButtonProps & { module: AdminModuleId; perm: AdminPermission }>(function PermButton({ module, perm, disabled, title, ...props }, ref) {
  const allowed = useCan()(module, perm);
  return <Button ref={ref} disabled={disabled || !allowed} title={allowed ? title : deniedReason(module, perm)} {...props} />;
});

/** Shown in place of a module the current administrator role may not view. */
export function NoAccess({ module }: { module: AdminModuleId }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong px-6 py-10">
      <h1 className="text-title font-bold">You don’t have access to this area</h1>
      <p className="mt-2 max-w-xl text-ui text-sub">
        Your administrator role doesn’t include viewing {module}. A super administrator can change role permissions in Admin roles. In this phase the check runs in your browser only; server-side enforcement
        arrives with Phase 2.
      </p>
    </div>
  );
}
