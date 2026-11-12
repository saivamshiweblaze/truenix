"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { InlineSelect } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
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
    return [...l].sort((a, b) => a.deadline.localeCompare(b.deadline));
  })();

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Incubators, accelerators, grants, hackathons, competitions and programmes. All entries in this demonstration are fictional organisations; no partnership is implied."
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
      <div className="mt-5 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-sm border border-line-strong px-3 focus-within:border-ink">
          <Search size={15} className="text-sub" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programmes and organisations" aria-label="Search opportunities" className="h-full flex-1 bg-transparent text-ui focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          <InlineSelect aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)} options={[{ value: "all", label: "All types" }, ...Object.entries(OPPORTUNITY_KIND_LABEL).map(([value, label]) => ({ value, label }))]} />
          <InlineSelect aria-label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} options={[{ value: "all", label: "All industries" }, ...INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))]} />
          <InlineSelect aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} options={[{ value: "all", label: "Any stage" }, ...STAGES.map((st) => ({ value: st.id, label: st.label }))]} />
          <InlineSelect aria-label="Location" value={location} onChange={(e) => setLocation(e.target.value)} options={[{ value: "all", label: "Anywhere" }, ...locations.map((l) => ({ value: l, label: l }))]} />
        </div>
      </div>
      <label className="mt-3 inline-flex items-center gap-2 text-meta text-sub">
        <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--color-ink)]" />
        Hide closed opportunities
      </label>
      <p className="mt-4 text-meta text-sub" aria-live="polite">
        {list.length} {list.length === 1 ? "opportunity" : "opportunities"}, soonest deadline first
      </p>
      {list.length ? (
        <ul className="max-w-4xl">
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
