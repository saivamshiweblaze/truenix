"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ChoiceChip, InlineSelect } from "@/components/ui/field";
import { EmptyState, PageHeader, SectionHeading } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { CompassArt } from "@/components/illustrations/art";
import { INDUSTRIES, POST_KIND_LABEL } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { allPeople, feedPosts, opportunities } from "@/lib/store/selectors";
import { matches } from "@/lib/utils";
import type { IndustryId, PostKind } from "@/lib/types";
import { PostCard } from "@/features/shared/post-card";
import { DeadlineLabel, PersonRow } from "@/features/shared/rows";

type View = "relevant" | "latest" | "following" | "saved";

export default function DiscoverPage() {
  const s = useAppState();
  const interests = useMemo(() => s.user?.interests ?? [], [s.user?.interests]);
  const [view, setView] = useState<View>("relevant");
  const [kind, setKind] = useState<PostKind | "all">("all");
  const [industries, setIndustries] = useState<IndustryId[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, []);

  const posts = useMemo(() => {
    let list = feedPosts(s);
    if (view === "following") list = list.filter((p) => s.following.people.includes(p.authorId) || (p.ideaId && s.following.ideas.includes(p.ideaId)));
    if (view === "saved") list = list.filter((p) => s.saved.posts.includes(p.id));
    if (kind !== "all") list = list.filter((p) => p.kind === kind);
    if (industries.length) list = list.filter((p) => p.industries.some((i) => industries.includes(i)));
    if (q) list = list.filter((p) => matches(q, p.title, p.body));
    if (view === "relevant") {
      const score = (p: (typeof list)[number]) => p.industries.filter((i) => interests.includes(i)).length * 100 + p.likes / 10;
      list = [...list].sort((a, b) => score(b) - score(a));
    }
    return list;
  }, [s, view, kind, industries, q, interests]);

  const suggestions = allPeople(s)
    .filter((p) => !s.following.people.includes(p.id) && p.interests.some((i) => interests.includes(i)))
    .slice(0, 4);
  const deadlines = [...opportunities(s)].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
  const isExplorer = s.user?.role === "student_explorer";

  return (
    <>
      <PageHeader
        title="Discover"
        description="Problems, projects, research findings and founder updates from across the network. Seeded posts are fictional and marked as demo content."
      />

      {isExplorer && (
        <div className="mb-8 flex items-center gap-5 border-l-2 border-ink bg-surface px-5 py-4">
          <CompassArt size={44} className="hidden shrink-0 sm:block" />
          <p className="text-ui text-charcoal">
            You do not need an idea to start. Read the <strong className="font-semibold">industry problems</strong> below, follow people whose work interests you, and offer your skills to a project.
          </p>
        </div>
      )}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <Tabs
            label="Feed view"
            value={view}
            onChange={setView}
            items={[
              { value: "relevant", label: "For you" },
              { value: "latest", label: "Latest" },
              { value: "following", label: "Following" },
              { value: "saved", label: "Saved", count: s.saved.posts.length },
            ]}
          />
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex h-9 flex-1 items-center gap-2 rounded-sm border border-line-strong px-3 focus-within:border-ink">
                <Search size={15} className="text-sub" aria-hidden />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the feed" aria-label="Search the feed" className="h-full flex-1 bg-transparent text-ui focus:outline-none" />
              </div>
              <InlineSelect
                aria-label="Filter by post type"
                value={kind}
                onChange={(e) => setKind(e.target.value as PostKind | "all")}
                options={[{ value: "all", label: "All post types" }, ...Object.entries(POST_KIND_LABEL).map(([value, label]) => ({ value, label }))]}
              />
            </div>
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by industry">
              {(interests.length ? INDUSTRIES.filter((i) => interests.includes(i.id)).concat(INDUSTRIES.filter((i) => !interests.includes(i.id)).slice(0, 4)) : INDUSTRIES.slice(0, 8)).map((i) => (
                <ChoiceChip key={i.id} selected={industries.includes(i.id)} onToggle={() => setIndustries((l) => (l.includes(i.id) ? l.filter((x) => x !== i.id) : [...l, i.id]))}>
                  {i.label}
                </ChoiceChip>
              ))}
            </div>
          </div>

          <div className="mt-2">
            {posts.length ? (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <div className="mt-6">
                <EmptyState
                  art={<CompassArt size={48} />}
                  title={view === "saved" ? "Nothing saved yet" : view === "following" ? "Follow people to fill this view" : "No posts match these filters"}
                  body={view === "saved" ? "Save posts from the feed to read them later." : view === "following" ? "Use Follow on any post or profile. Their updates will appear here." : "Clear a filter or try a different search."}
                  action={
                    <button
                      type="button"
                      className="text-ui text-ink underline underline-offset-4"
                      onClick={() => {
                        setIndustries([]);
                        setKind("all");
                        setQ("");
                        setView("latest");
                      }}
                    >
                      Show all latest posts
                    </button>
                  }
                />
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-10" aria-label="Suggestions">
          {suggestions.length > 0 && (
            <section>
              <SectionHeading title="People in your areas" action={<Link href="/community?tab=people" className="text-meta text-sub hover:text-ink">See all</Link>} />
              <ul>
                {suggestions.map((p) => (
                  <PersonRow key={p.id} person={p} compact />
                ))}
              </ul>
            </section>
          )}
          <section>
            <SectionHeading title="Closing soon" action={<Link href="/opportunities" className="text-meta text-sub hover:text-ink">All opportunities</Link>} />
            <ul className="flex flex-col">
              {deadlines.map((o) => (
                <li key={o.id} className="border-b border-line py-3 last:border-0">
                  <Link href={`/opportunities/${o.id}`} className="text-ui font-medium text-ink hover:underline">
                    {o.title}
                  </Link>
                  <div className="mt-0.5">
                    <DeadlineLabel date={o.deadline} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
