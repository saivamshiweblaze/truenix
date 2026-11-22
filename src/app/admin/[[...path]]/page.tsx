"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { useAppSnapshot } from "@/lib/store/store";
import { can } from "@/lib/admin/permissions";
import { matchAdminRoute } from "@/features/admin/registry";
import { NoAccess } from "@/features/admin/kit/can";

/**
 * Every admin route resolves here through the route table in features/admin/registry.tsx,
 * which also provides breadcrumbs and the module used for permission checks.
 */
function AdminRouter() {
  const params = useParams<{ path?: string[] }>();
  const { state, hydrated } = useAppSnapshot();
  const segments = params.path ?? [];
  if (!hydrated) return <PageSkeleton />;
  const match = matchAdminRoute(segments);
  if (!match) {
    return <EmptyState title="This admin page doesn’t exist" body="The link may be out of date. Choose a section from the menu, or go back to the overview." action={<ButtonLink href="/admin">Admin overview</ButtonLink>} />;
  }
  const crumbs = [{ label: "Admin", href: "/admin" }, ...match.route.crumbs(match.params, state)];
  return (
    // data-admin-page marks the visible admin view: Next keeps recently visited URLs mounted but hidden.
    <div data-admin-page>
      {crumbs.length > 1 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-meta text-sub">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight size={13} className="shrink-0 text-mute" aria-hidden />}
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href} className="truncate hover:text-ink hover:underline underline-offset-4">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? "page" : undefined} className="max-w-[40ch] truncate text-ink">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      {can(state, match.route.module, "view") ? match.route.render(match.params) : <NoAccess module={match.route.module} />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminRouter />
    </Suspense>
  );
}
