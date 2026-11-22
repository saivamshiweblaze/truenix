"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState, SearchInput } from "@/components/ui/primitives";
import { useAppState } from "@/lib/store/store";
import { adminSearch } from "@/lib/admin/search";
import { AdminHeader } from "../kit/layout";

export function AdminSearchPage() {
  const s = useAppState();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const hits = adminSearch(s, q, 200);
  const groups = Array.from(new Set(hits.map((h) => h.kind)));
  return (
    <>
      <AdminHeader title="Search" description="Find any member, idea, opportunity, organisation, report, application, study or content entry. Results never show private values." />
      <SearchInput
        value={q}
        onChange={(v) => {
          setQ(v);
          router.replace(v ? `/admin/search?q=${encodeURIComponent(v)}` : "/admin/search", { scroll: false });
        }}
        placeholder="Search all admin records"
        label="Search all admin records"
        fluid
      />
      <div className="mt-6">
        {q.trim().length < 2 ? (
          <p className="text-meta text-sub">Type at least two characters.</p>
        ) : hits.length === 0 ? (
          <EmptyState compact title={`No records match “${q}”`} body="Check the spelling, or search by email, organisation or title." />
        ) : (
          <div className="flex flex-col gap-8">
            <p className="text-meta text-sub" aria-live="polite">
              {hits.length} results
            </p>
            {groups.map((g) => (
              <section key={g} aria-label={g}>
                <h2 className="mb-2 border-b border-line pb-2 text-section font-bold">{g}</h2>
                <ul>
                  {hits
                    .filter((h) => h.kind === g)
                    .map((h) => (
                      <li key={h.id} className="border-b border-line py-2 last:border-b-0">
                        <Link href={h.href} className="text-ui font-medium hover:underline">
                          {h.title}
                        </Link>
                        <p className="truncate text-meta text-sub">{h.detail}</p>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
