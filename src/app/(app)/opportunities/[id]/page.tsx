"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { Bookmark, ExternalLink } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { SampleMark, EmptyState, PageSkeleton, SectionHeading, TagList } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { industryLabel, OPPORTUNITY_KIND_LABEL, stageLabel } from "@/config/taxonomy";
import { setApplication, toggleSaveOpportunity } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { isOpportunityPublic, opportunityById } from "@/lib/store/selectors";
import type { Application } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { DeadlineLabel } from "@/features/shared/rows";
import { RegisterPanel } from "@/features/opportunities/register-panel";

function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useAppState();
  const o = opportunityById(s, id);
  if (!o || !isOpportunityPublic(o)) {
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
          {o.demo && <SampleMark title="Illustrative listing. The organisation is fictional and no partnership is implied.">Sample listing</SampleMark>}
        </div>
        <h1 className="mt-3 text-title font-bold">{o.title}</h1>
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
            <span className="inline-flex h-10 items-center px-2 text-meta text-mute">No official link — this is a sample listing</span>
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
            {o.education && <p className="mt-2 text-ui text-sub">Education: {o.education}</p>}
          </section>
          {o.prizes && (
            <section>
              <SectionHeading title="Prizes and benefits" />
              <p className="text-body text-charcoal">{o.prizes}</p>
            </section>
          )}
          {o.instructions && (
            <section>
              <SectionHeading title="How to apply" />
              <p className="whitespace-pre-line text-body text-charcoal">{o.instructions}</p>
            </section>
          )}
          {o.hackathon && o.hackathon.rounds.length > 0 && (
            <section>
              <SectionHeading title="Rounds" />
              <ol className="flex flex-col gap-3">
                {o.hackathon.rounds.map((r) => (
                  <li key={r.id}>
                    <p className="text-ui font-medium">
                      {r.name} <span className="font-normal text-sub">· due {formatDate(r.deadline)}</span>
                    </p>
                    {r.description && <p className="text-meta text-sub">{r.description}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
          {o.resultsPublished && o.hackathon && o.hackathon.winners.length > 0 && (
            <section>
              <SectionHeading title="Results" />
              <ul className="flex flex-col gap-1.5">
                {o.hackathon.winners.map((w) => {
                  const r = s.platform.registrations.find((x) => x.id === w.registrationId);
                  return (
                    <li key={w.registrationId} className="text-ui">
                      <span className="font-medium">{w.place}:</span> {r?.teamName || r?.members[0]?.name}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <dl className="grid grid-cols-1 gap-5 border-t border-line pt-6 sm:grid-cols-2">
            {o.format && (
              <div>
                <dt className="text-meta text-sub">Format</dt>
                <dd className="text-ui">{o.format === "offline" ? "In person" : o.format[0].toUpperCase() + o.format.slice(1)}</dd>
              </div>
            )}
            {o.eventStart && (
              <div>
                <dt className="text-meta text-sub">Event dates</dt>
                <dd className="text-ui">
                  {formatDate(o.eventStart)}
                  {o.eventEnd ? ` – ${formatDate(o.eventEnd)}` : ""}
                </dd>
              </div>
            )}
            {(o.teamMin || o.teamMax) && (
              <div>
                <dt className="text-meta text-sub">Team size</dt>
                <dd className="text-ui">
                  {o.teamMin ?? 1}–{o.teamMax ?? "any"} people
                </dd>
              </div>
            )}
            {o.contact && (
              <div>
                <dt className="text-meta text-sub">Contact</dt>
                <dd className="break-words text-ui">{o.contact}</dd>
              </div>
            )}
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
          <p className="text-micro text-mute">
            {o.source === "weblaze" ? "Run on TRUEVIX by Weblaze Technologies." : `Listed from ${o.organisation}’s own channel${o.lastCheckedAt ? `, last checked ${formatDate(o.lastCheckedAt)}` : ""}. Listing an opportunity does not imply a partnership.`}
          </p>
        </div>

        <div className="flex flex-col gap-6 self-start">
        {o.registrationMode === "on_platform" && (
          <aside aria-labelledby="register-title" className="border border-line p-5">
            <h2 id="register-title" className="mb-3 text-section font-semibold">
              Register on TRUEVIX
            </h2>
            <RegisterPanel o={o} />
          </aside>
        )}
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
