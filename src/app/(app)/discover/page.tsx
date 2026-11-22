"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { HelpCircle, Handshake, SlidersHorizontal } from "lucide-react";
import { ChoiceChip, InlineSelect } from "@/components/ui/field";
import { Avatar, EmptyState, PageHeader, SearchInput, SectionHeading, SectionLink } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";
import { CompassArt } from "@/components/illustrations/art";
import { INDUSTRIES, POST_KIND_LABEL } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { allPeople, feedPosts, opportunities } from "@/lib/store/selectors";
import { toggleFollowPerson } from "@/lib/store/actions";
import { toast } from "@/components/ui/toast";
import { matches } from "@/lib/utils";
import type { IndustryId, Opportunity, Person, PostKind } from "@/lib/types";
import { PostCard, POST_KIND_ICON } from "@/features/shared/post-card";
import { DeadlineLabel, PersonRow } from "@/features/shared/rows";
import { MeAvatar } from "@/components/shell/app-shell";

/** The kinds people filter by most, as one-tap filters. The full list stays in the type menu. */
const QUICK_KINDS: { value: PostKind | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "problem", label: "Problems" },
  { value: "research", label: "Research" },
  { value: "founder_update", label: "Founder updates" },
  { value: "project", label: "Projects" },
  { value: "collaboration", label: "Collaborators wanted" },
  { value: "question", label: "Questions" },
  { value: "challenge", label: "Challenges" },
];

/** Posts revealed per step. Enough to fill two screens on a phone; more on request. */
const PAGE = 8;

type View = "relevant" | "latest" | "following" | "saved";

export default function DiscoverPage() {
  const s = useAppState();
  const interests = useMemo(() => s.user?.interests ?? [], [s.user?.interests]);
  const [view, setView] = useState<View>("relevant");
  const [kind, setKind] = useState<PostKind | "all">("all");
  const [industries, setIndustries] = useState<IndustryId[]>([]);
  const [q, setQ] = useState("");
  const [showIndustries, setShowIndustries] = useState(false);
  // A shared link (#post-id) may point past the first page, so it reveals the whole list.
  const [shown, setShown] = useState(() => (typeof window !== "undefined" && window.location.hash ? Number.MAX_SAFE_INTEGER : PAGE));

  // Any change of view or filter starts the list from the top.
  const filterKey = `${view}|${kind}|${industries.join(",")}|${q}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (prevKey !== filterKey) {
    setPrevKey(filterKey);
    setShown(PAGE);
  }

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
    .slice(0, 6);
  const deadlines = [...opportunities(s)].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
  const isExplorer = s.user?.role === "student_explorer";
  const industryOrder = interests.length ? INDUSTRIES.filter((i) => interests.includes(i.id)).concat(INDUSTRIES.filter((i) => !interests.includes(i.id))) : INDUSTRIES;
  const visible = posts.slice(0, shown);
  const filtered = kind !== "all" || industries.length > 0 || q !== "";

  const resetFilters = () => {
    setIndustries([]);
    setKind("all");
    setQ("");
  };

  return (
    <>
      <PageHeader title="Discover" description="Problems, findings, founder updates and projects from across the network." />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 max-w-[720px]">
          {/* Start a post: the feed is something you take part in, not only read */}
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-line p-2.5 pl-3">
            <MeAvatar size={34} />
            <Link href="/community?compose=1&kind=discussion" className="flex h-10 min-w-0 flex-1 items-center rounded-full bg-surface px-4 text-ui text-sub transition-colors hover:bg-sunken hover:text-ink">
              <span className="truncate">Share a problem, finding or update</span>
            </Link>
            <div className="hidden items-center gap-0.5 sm:flex">
              <Link href="/community?compose=1&kind=question" className="inline-flex h-10 items-center gap-1.5 rounded-sm px-2.5 text-meta text-sub hover:bg-surface hover:text-ink">
                <HelpCircle size={16} aria-hidden /> Ask
              </Link>
              <Link href="/community?compose=1&kind=collaboration" className="inline-flex h-10 items-center gap-1.5 rounded-sm px-2.5 text-meta text-sub hover:bg-surface hover:text-ink">
                <Handshake size={16} aria-hidden /> Find help
              </Link>
            </div>
          </div>

          {isExplorer && (
            <p className="mb-4 flex items-start gap-3 text-meta text-sub">
              <CompassArt size={32} className="hidden shrink-0 sm:block" />
              <span>
                No idea yet? Start with <strong className="font-semibold text-ink">problems</strong>, follow people whose work interests you, and offer your skills to a project.
              </span>
            </p>
          )}

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

          {/* One compact filter bar. Industries open on request so the feed stays first. */}
          <div className="mt-3 flex items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search the feed" label="Search the feed" fluid />
            <InlineSelect
              aria-label="Filter by post type"
              value={kind}
              onChange={(e) => setKind(e.target.value as PostKind | "all")}
              options={[{ value: "all", label: "All post types" }, ...Object.entries(POST_KIND_LABEL).map(([value, label]) => ({ value, label }))]}
              className="hidden sm:block"
            />
            <Button
              variant="secondary"
              onClick={() => setShowIndustries((v) => !v)}
              aria-expanded={showIndustries}
              aria-controls="industry-filters"
              className={cn("shrink-0 px-3", industries.length > 0 && "border-ink")}
            >
              <SlidersHorizontal size={16} aria-hidden />
              <span className="max-sm:sr-only">Industries</span>
              {industries.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.6875rem] font-semibold text-white tabular-nums">{industries.length}</span>}
            </Button>
          </div>

          {showIndustries && (
            <div id="industry-filters" role="group" aria-label="Filter by industry" className="mt-2 flex flex-wrap gap-1.5 rounded-md bg-surface p-2.5">
              {industryOrder.map((i) => (
                <ChoiceChip key={i.id} selected={industries.includes(i.id)} onToggle={() => setIndustries((l) => (l.includes(i.id) ? l.filter((x) => x !== i.id) : [...l, i.id]))}>
                  {i.label}
                </ChoiceChip>
              ))}
              {industries.length > 0 && (
                <button type="button" onClick={() => setIndustries([])} className="h-9 px-2 text-meta text-sub underline-offset-4 hover:text-ink hover:underline">
                  Clear industries
                </button>
              )}
            </div>
          )}

          <div className="scrollbar-none -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5 md:mx-0 md:px-0" role="group" aria-label="Show post type">
            {QUICK_KINDS.map((k) => {
              const active = kind === k.value;
              const Icon = k.value === "all" ? null : POST_KIND_ICON[k.value];
              return (
                <button
                  key={k.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setKind(k.value)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-meta transition-colors",
                    active ? "bg-ink font-medium text-white" : "bg-surface text-charcoal hover:bg-sunken hover:text-ink",
                  )}
                >
                  {Icon && <Icon size={14} aria-hidden />}
                  {k.label}
                </button>
              );
            })}
          </div>

          {filtered && (
            <p className="mt-3 flex items-center gap-3 text-meta text-sub" aria-live="polite">
              <span className="tabular-nums">
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>
              <button type="button" onClick={resetFilters} className="font-medium text-ink underline-offset-4 hover:underline">
                Clear filters
              </button>
            </p>
          )}

          <div className="mt-1">
            {visible.length ? (
              visible.map((p, i) => (
                <Fragment key={p.id}>
                  <PostCard post={p} />
                  {/* On screens without the side column, suggestions join the feed instead of disappearing. */}
                  {i === 2 && suggestions.length > 0 && <PeopleStrip people={suggestions} />}
                  {i === 6 && deadlines.length > 0 && <DeadlineStrip items={deadlines} />}
                </Fragment>
              ))
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
                        resetFilters();
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

          {posts.length > shown && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                Load next posts
              </Button>
              <p className="text-micro text-mute tabular-nums">
                Showing {visible.length} of {posts.length}
              </p>
            </div>
          )}
          {visible.length > 0 && posts.length <= shown && posts.length > 3 && <p className="mt-6 text-center text-meta text-mute">You’re up to date. Follow more people or change your interests for more.</p>}
        </div>

        <aside className="hidden flex-col gap-8 xl:flex" aria-label="Suggestions">
          <div className="sticky top-20 flex flex-col gap-8">
            {suggestions.length > 0 && (
              <section>
                <SectionHeading title="People in your areas" action={<SectionLink href="/community?tab=people">See all</SectionLink>} />
                <ul>
                  {suggestions.slice(0, 4).map((p) => (
                    <PersonRow key={p.id} person={p} compact />
                  ))}
                </ul>
              </section>
            )}
            <section>
              <SectionHeading title="Closing soon" action={<SectionLink href="/opportunities">All</SectionLink>} />
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
          </div>
        </aside>
      </div>
    </>
  );
}

/** A horizontal row of people to follow, shown inside the feed below the xl breakpoint. */
function PeopleStrip({ people }: { people: Person[] }) {
  const s = useAppState();
  return (
    <section aria-label="People in your areas" className="border-b border-line py-5 max-sm:-mx-4 max-sm:border-b-8 max-sm:border-surface xl:hidden">
      <div className="mb-3 flex items-baseline justify-between gap-4 max-sm:px-4">
        <h2 className="text-ui font-semibold text-ink">People in your areas</h2>
        <SectionLink href="/community?tab=people">See all</SectionLink>
      </div>
      <ul className="scrollbar-none flex snap-x gap-2.5 overflow-x-auto max-sm:px-4">
        {people.map((p) => {
          const following = s.following.people.includes(p.id);
          return (
            <li key={p.id} className="flex w-[11.5rem] shrink-0 snap-start flex-col items-start rounded-md border border-line p-3.5">
              <Avatar name={p.name} size={40} />
              <Link href={`/people/${p.id}`} className="mt-2.5 w-full truncate text-ui font-semibold text-ink hover:underline">
                {p.name}
              </Link>
              <p className="line-clamp-2 min-h-[2.4em] text-micro text-sub">{p.headline}</p>
              <Button
                size="sm"
                variant={following ? "ghost" : "secondary"}
                aria-pressed={following}
                className="mt-3 w-full"
                onClick={() => {
                  toggleFollowPerson(p.id);
                  toast(following ? `Unfollowed ${p.name}` : `Following ${p.name}`);
                }}
              >
                {following ? "Following" : "Follow"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Opportunities closing soon, shown inside the feed below the xl breakpoint. */
function DeadlineStrip({ items }: { items: Opportunity[] }) {
  return (
    <section aria-label="Closing soon" className="border-b border-line py-5 max-sm:-mx-4 max-sm:border-b-8 max-sm:border-surface max-sm:px-4 xl:hidden">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <h2 className="text-ui font-semibold text-ink">Closing soon</h2>
        <SectionLink href="/opportunities">All opportunities</SectionLink>
      </div>
      <ul>
        {items.map((o) => (
          <li key={o.id} className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Link href={`/opportunities/${o.id}`} className="text-ui font-medium text-ink hover:underline">
              {o.title}
            </Link>
            <span className="shrink-0">
              <DeadlineLabel date={o.deadline} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
