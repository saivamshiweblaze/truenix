"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { EmptyState, PageHeader, SectionHeading } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { INDUSTRIES } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { allPeople, opportunities, publicIdeas } from "@/lib/store/selectors";
import { matches } from "@/lib/utils";
import { IdeaRow, OpportunityRow, PersonRow } from "@/features/shared/rows";

export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [tab, setTab] = useState<"all" | "ideas" | "people" | "opportunities">("all");
  const s = useAppState();

  const [prevQ, setPrevQ] = useState(q);
  if (prevQ !== q) {
    setPrevQ(q);
    setInput(q);
  }

  // An industry name matches its items too, so "Healthcare" finds healthcare ideas.
  const industry = INDUSTRIES.find((i) => i.label.toLowerCase() === q.trim().toLowerCase());
  const ideas = publicIdeas(s).filter((i) => (industry && i.industry === industry.id) || matches(q, i.title, i.summary, i.problem, i.targetUsers, i.geography));
  const people = allPeople(s).filter((p) => (industry && p.interests.includes(industry.id)) || matches(q, p.name, p.headline, p.organisation, p.skills.join(" ")));
  const opps = opportunities(s).filter((o) => (industry && o.industries.includes(industry.id)) || matches(q, o.title, o.organisation, o.description));
  const total = ideas.length + people.length + opps.length;

  return (
    <>
      <PageHeader title="Search" description={q ? `${total} results for “${q}”` : "Search ideas, people and opportunities."}>
        <form
          role="search"
          className="mt-5 flex h-11 max-w-xl items-center gap-2 rounded-sm border border-line-strong px-3 focus-within:border-ink"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(input.trim())}`);
          }}
        >
          <Search size={16} className="text-sub" aria-hidden />
          <input value={input} onChange={(e) => setInput(e.target.value)} aria-label="Search" placeholder="Try ‘water’, ‘robotics’ or a name" className="h-full flex-1 bg-transparent text-body focus:outline-none" />
        </form>
      </PageHeader>
      {q.trim() ? (
        <>
          <Tabs
            label="Result types"
            value={tab}
            onChange={setTab}
            items={[
              { value: "all", label: "All", count: total },
              { value: "ideas", label: "Ideas", count: ideas.length },
              { value: "people", label: "People", count: people.length },
              { value: "opportunities", label: "Opportunities", count: opps.length },
            ]}
          />
          <div className="mt-6 flex max-w-4xl flex-col gap-10">
            {total === 0 && <EmptyState title="No results" body="Try a shorter or more general term." />}
            {(tab === "all" || tab === "ideas") && ideas.length > 0 && (
              <section>
                {tab === "all" && <SectionHeading title="Ideas" />}
                <ul>{ideas.map((i) => <IdeaRow key={i.id} idea={i} />)}</ul>
              </section>
            )}
            {(tab === "all" || tab === "people") && people.length > 0 && (
              <section>
                {tab === "all" && <SectionHeading title="People" />}
                <ul>{people.map((p) => <PersonRow key={p.id} person={p} />)}</ul>
              </section>
            )}
            {(tab === "all" || tab === "opportunities") && opps.length > 0 && (
              <section>
                {tab === "all" && <SectionHeading title="Opportunities" />}
                <ul>{opps.map((o) => <OpportunityRow key={o.id} o={o} />)}</ul>
              </section>
            )}
          </div>
        </>
      ) : (
        <p className="text-ui text-sub">Type at least one word to search.</p>
      )}
    </>
  );
}
