"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { Bookmark, ExternalLink } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { DemoMark, EmptyState, PageSkeleton, SectionHeading, TagList } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { industryLabel, OPPORTUNITY_KIND_LABEL, stageLabel } from "@/config/taxonomy";
import { setApplication, toggleSaveOpportunity } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { opportunityById } from "@/lib/store/selectors";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { DeadlineLabel } from "@/features/shared/rows";

function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useAppState();
  const o = opportunityById(id);
  if (!o || s.admin.opportunityStatus[o.id] === "hidden") {
    return <EmptyState title="Opportunity not available" body="It may have been removed." action={<ButtonLink href="/opportunities">All opportunities</ButtonLink>} />;
  }
  const saved = s.saved.opportunities.includes(o.id);
  const app = s.applications.find((a) => a.opportunityId === o.id);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 text-meta text-sub">
        <Link href="/opportunities" className="hover:text-ink">
          Opportunities
        </Link>
        <span className="mx-2 text-mute">/</span>
        <span className="text-ink">{o.title}</span>
      </nav>
      <header className="border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-meta font-medium">{OPPORTUNITY_KIND_LABEL[o.kind]}</span>
          <DeadlineLabel date={o.deadline} />
          {o.demo && <DemoMark>Fictional organisation</DemoMark>}
        </div>
        <h1 className="mt-3 text-title font-semibold">{o.title}</h1>
        <p className="mt-1 text-body text-sub">{o.organisation}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            aria-pressed={saved}
            onClick={() => {
              toggleSaveOpportunity(o.id);
              toast(saved ? "Removed from saved" : "Opportunity saved");
            }}
          >
            <Bookmark size={15} className={saved ? "fill-ink" : ""} aria-hidden /> {saved ? "Saved" : "Save"}
          </Button>
          {o.officialUrl && /^https?:\/\//i.test(o.officialUrl) ? (
            <a href={o.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-sm px-4 text-ui text-charcoal hover:bg-surface">
              Official website <ExternalLink size={14} aria-hidden />
            </a>
          ) : (
            <span className="inline-flex h-10 items-center px-2 text-meta text-mute">No official link — demonstration entry</span>
          )}
        </div>
      </header>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex max-w-[68ch] flex-col gap-8">
          <section>
            <SectionHeading title="About the programme" />
            <p className="text-body text-charcoal">{o.description}</p>
          </section>
          <section>
            <SectionHeading title="Eligibility" />
            <p className="text-body text-charcoal">{o.eligibility}</p>
          </section>
          <dl className="grid grid-cols-1 gap-5 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-meta text-sub">Location</dt>
              <dd className="text-ui">{o.location}</dd>
            </div>
            <div>
              <dt className="text-meta text-sub">Deadline</dt>
              <dd className="text-ui">{formatDate(o.deadline)}</dd>
            </div>
            <div>
              <dt className="text-meta text-sub">Programme stage</dt>
              <dd className="text-ui">{o.stage.map(stageLabel).join(", ")}</dd>
            </div>
            <div>
              <dt className="text-meta text-sub">Industries</dt>
              <dd>
                <TagList items={o.industries.map(industryLabel)} className="text-ui" />
              </dd>
            </div>
          </dl>
        </div>

        <aside className="self-start border border-line p-5">
          <h2 className="text-section font-semibold">Track your application</h2>
          <p className="mt-1 text-meta text-sub">This tracker is for your own planning. Nothing is sent to the organisation; apply through their official channel.</p>
          <div className="mt-4">
            <Segmented<Application["status"] | "none">
              label="Application status"
              value={app?.status ?? "none"}
              onChange={(v) => {
                setApplication(o.id, v === "none" ? null : v);
                toast(v === "none" ? "Removed from applications" : `Marked as ${v === "submitted" ? "applied" : v}`);
              }}
              items={[
                { value: "none", label: "None" },
                { value: "interested", label: "Interested" },
                { value: "preparing", label: "Preparing" },
                { value: "submitted", label: "Applied" },
              ]}
            />
          </div>
          {app && <p className="mt-3 text-micro text-mute">Updated {formatDate(app.updatedAt)}. Visible in My workspace.</p>}
        </aside>
      </div>
    </>
  );
}

export default function OpportunityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OpportunityDetail />
    </Suspense>
  );
}
