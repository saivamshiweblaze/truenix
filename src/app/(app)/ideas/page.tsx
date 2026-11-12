"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { InlineSelect } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { BulbArt } from "@/components/illustrations/art";
import { INDUSTRIES, STAGES } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { publicIdeas, visibleIdeas } from "@/lib/store/selectors";
import { matches } from "@/lib/utils";
import { IdeaRow } from "@/features/shared/rows";

type View = "explore" | "mine" | "saved" | "following";

export default function IdeasPage() {
  const s = useAppState();
  const [view, setView] = useState<View>("explore");
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("all");
  const [stage, setStage] = useState("all");
  const [geo, setGeo] = useState("all");
  const [sort, setSort] = useState<"recent" | "followed">("recent");

  const all = visibleIdeas(s);
  const geographies = Array.from(new Set(publicIdeas(s).map((i) => i.geography.split(",")[0].trim()))).sort();

  const list = useMemo(() => {
    let l = view === "explore" ? publicIdeas(s) : view === "mine" ? s.ideas : view === "saved" ? all.filter((i) => s.saved.ideas.includes(i.id)) : all.filter((i) => s.following.ideas.includes(i.id));
    if (industry !== "all") l = l.filter((i) => i.industry === industry);
    if (stage !== "all") l = l.filter((i) => i.stage === stage);
    if (geo !== "all") l = l.filter((i) => i.geography.includes(geo));
    if (q) l = l.filter((i) => matches(q, i.title, i.summary, i.problem, i.targetUsers));
    return [...l].sort((a, b) => (sort === "recent" ? b.updatedAt.localeCompare(a.updatedAt) : b.followers - a.followers));
  }, [s, all, view, industry, stage, geo, q, sort]);

  return (
    <>
      <PageHeader
        title="Ideas"
        description="Startup ideas people have chosen to share. Open one to see the problem, the team, and what they need."
        actions={
          <ButtonLink href="/ideas/new" variant="accent">
            <Plus size={16} aria-hidden /> Submit an idea
          </ButtonLink>
        }
      />
      <Tabs
        label="Idea lists"
        value={view}
        onChange={setView}
        items={[
          { value: "explore", label: "Explore" },
          { value: "mine", label: "My ideas", count: s.ideas.length },
          { value: "saved", label: "Saved", count: s.saved.ideas.length },
          { value: "following", label: "Following", count: s.following.ideas.length },
        ]}
      />
      <div className="mt-5 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-sm border border-line-strong px-3 focus-within:border-ink">
          <Search size={15} className="text-sub" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by problem, users or title" aria-label="Search ideas" className="h-full flex-1 bg-transparent text-ui focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          <InlineSelect aria-label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} options={[{ value: "all", label: "All industries" }, ...INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))]} />
          <InlineSelect aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} options={[{ value: "all", label: "All stages" }, ...STAGES.map((st) => ({ value: st.id, label: st.label }))]} />
          <InlineSelect aria-label="Geography" value={geo} onChange={(e) => setGeo(e.target.value)} options={[{ value: "all", label: "All regions" }, ...geographies.map((g) => ({ value: g, label: g }))]} />
          <InlineSelect aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as "recent" | "followed")} options={[{ value: "recent", label: "Recently updated" }, { value: "followed", label: "Most followed" }]} />
        </div>
      </div>

      <p className="mt-5 text-meta text-sub" aria-live="polite">
        {list.length} {list.length === 1 ? "idea" : "ideas"}
      </p>
      {list.length ? (
        <ul className="mt-1">
          {list.map((i) => (
            <IdeaRow key={i.id} idea={i} />
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState
            art={<BulbArt size={52} />}
            title={view === "mine" ? "You have not submitted an idea yet" : "No ideas match"}
            body={view === "mine" ? "Write down the problem you noticed. You can keep it private while you work on it." : "Try removing a filter or searching for a broader term."}
            action={view === "mine" ? <ButtonLink href="/ideas/new">Submit an idea</ButtonLink> : undefined}
          />
        </div>
      )}
    </>
  );
}
