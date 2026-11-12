"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { features } from "@/config/brand";
import { roleLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import type { RoleId } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";

/**
 * Hides role-specific screens from other roles. This is an interface rule only:
 * Phase 1 has no server, so it is not an authorisation boundary.
 */
export function RoleGate({ roles, children }: { roles: RoleId[]; children: ReactNode }) {
  const role = useAppState().user?.role;
  if (role && roles.includes(role)) return <>{children}</>;
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 py-16">
      <ShieldAlert size={28} strokeWidth={1.5} aria-hidden />
      <h1 className="text-title font-semibold">This area is for {roles.map(roleLabel).join(" or ").toLowerCase()}s</h1>
      <p className="text-body text-sub">
        Your current role is {role ? roleLabel(role).toLowerCase() : "unknown"}.
        {features.demoTools ? " In this demonstration you can preview it by switching the demo role in the sidebar or the More menu." : ""}
      </p>
      <ButtonLink href="/home" variant="secondary">
        Back to home
      </ButtonLink>
    </div>
  );
}
