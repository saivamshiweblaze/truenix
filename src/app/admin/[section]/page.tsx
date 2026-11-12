"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageSkeleton } from "@/components/ui/primitives";
import {
  AdminAudit,
  AdminContent,
  AdminIdeas,
  AdminInstitutions,
  AdminOpportunities,
  AdminReports,
  AdminRoles,
  AdminSettings,
  AdminUsers,
} from "@/features/admin/sections";

const MAP: Record<string, () => React.ReactNode> = {
  users: AdminUsers,
  roles: AdminRoles,
  ideas: AdminIdeas,
  moderation: AdminContent,
  reports: AdminReports,
  institutions: AdminInstitutions,
  opportunities: AdminOpportunities,
  settings: AdminSettings,
  audit: AdminAudit,
};

function Section() {
  const { section } = useParams<{ section: string }>();
  const Comp = MAP[section];
  if (!Comp) return <EmptyState title="Unknown admin section" body="Choose a section from the menu." action={<ButtonLink href="/admin">Overview</ButtonLink>} />;
  return <Comp />;
}

export default function AdminSectionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Section />
    </Suspense>
  );
}
