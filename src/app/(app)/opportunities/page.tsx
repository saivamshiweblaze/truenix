"use client";

import { useState } from "react";
import { InlineSelect } from "@/components/ui/field";
import { EmptyState, PageHeader, SearchInput, Toolbar, ToolbarFilters } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { BlueprintArt } from "@/components/illustrations/art";
import { INDUSTRIES, OPPORTUNITY_KIND_LABEL, STAGES } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { opportunities } from "@/lib/store/selectors";
import { daysUntil, matches } from "@/lib/utils";
import { OpportunityRow } from "@/features/shared/rows";

export default function OpportunitiesPage() {
  const s = useAppState();
  const [view, setView] = useState<"all" | "saved" | "applications">("all");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [stage, setStage] = useState("all");
  const [location, setLocation] = useState("all");
  const [hideClosed, setHideClosed] = useState(true);

  const all = opportunities(s);
  const locations = Array.from(new Set(all.map((o) => o.location))).sort();

  const list = (() => {
    let l = all;
    if (view === "saved") l = l.filter((o) => s.saved.opportunities.includes(o.id));
    if (view === "applications") l = l.filter((o) => s.applications.some((a) => a.opportunityId === o.id));
    if (kind !== "all") l = l.filter((o) => o.kind === kind);
    if (industry !== "all") l = l.filter((o) => o.industries.includes(industry as never));
    if (stage !== "all") l = l.filter((o) => o.stage.includes(stage as never));
    if (location !== "all") l = l.filter((o) => o.location === location);
    if (hideClosed) l = l.filter((o) => daysUntil(o.deadline) >= 0);
    if (q) l = l.filter((o) => matches(q, o.title, o.organisation, o.description, o.eligibility));
    return [...l].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.deadline.localeCompare(b.deadline));
  })();

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Incubators, accelerators, grants, hackathons and programmes, soonest deadline first."
        meta={
          <>
            <span>{all.filter((o) => daysUntil(o.deadline) >= 0).length} open</span>
            <span>{all.filter((o) => daysUntil(o.deadline) >= 0 && daysUntil(o.deadline) <= 21).length} closing within three weeks</span>
            <span>{s.applications.length} you’re tracking</span>
          </>
        }
      />
      <Tabs
        label="Opportunity lists"
        value={view}
        onChange={setView}
        items={[
          { value: "all", label: "All" },
          { value: "saved", label: "Saved", count: s.saved.opportunities.length },
          { value: "applications", label: "My applications", count: s.applications.length },
        ]}
      />
      <Toolbar className="mt-5">
        <SearchInput value={q} onChange={setQ} placeholder="Search programmes and organisations" label="Search opportunities" />
        <ToolbarFilters>
          <InlineSelect aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)} options={[{ value: "all", label: "All types" }, ...Object.entries(OPPORTUNITY_KIND_LABEL).map(([value, label]) => ({ value, label }))]} />
          <InlineSelect aria-label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} options={[{ value: "all", label: "All industries" }, ...INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))]} />
          <InlineSelect aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} options={[{ value: "all", label: "Any stage" }, ...STAGES.map((st) => ({ value: st.id, label: st.label }))]} />
          <InlineSelect aria-label="Location" value={location} onChange={(e) => setLocation(e.target.value)} options={[{ value: "all", label: "Anywhere" }, ...locations.map((l) => ({ value: l, label: l }))]} />
        </ToolbarFilters>
      </Toolbar>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-meta text-sub" aria-live="polite">
          {list.length} {list.length === 1 ? "opportunity" : "opportunities"}
        </p>
        <label className="inline-flex items-center gap-2 text-meta text-sub">
          <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} className="h-4 w-4 accent-[var(--color-ink)]" />
          Hide closed opportunities
        </label>
      </div>
      <p className="mt-1 text-micro text-mute">Listings marked as samples are illustrative and imply no partnership.</p>
      {list.length ? (
        <ul>
          {list.map((o) => (
            <OpportunityRow key={o.id} o={o} />
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState art={<BlueprintArt size={52} />} title="No opportunities match" body={view === "applications" ? "Track an application from any opportunity page." : "Try a broader filter."} />
        </div>
      )}
    </>
  );
}
