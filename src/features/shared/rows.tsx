"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import type { Idea, Opportunity, Person } from "@/lib/types";
import { Avatar, DemoMark, StatusDot, TagList } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { industryLabel, OPPORTUNITY_KIND_LABEL, roleShort, stageLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { personById } from "@/lib/store/selectors";
import { toggleConnect, toggleFollowPerson, toggleSaveIdea, toggleSaveOpportunity } from "@/lib/store/actions";
import { cn, daysUntil, formatDate } from "@/lib/utils";

export function SaveIdeaButton({ id, withLabel }: { id: string; withLabel?: boolean }) {
  const saved = useAppState().saved.ideas.includes(id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved ideas" : "Save idea"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaveIdea(id);
        toast(saved ? "Removed from saved ideas" : "Idea saved", { body: saved ? undefined : "Find it in My workspace." });
      }}
      className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2 text-meta transition-colors active:scale-95", saved ? "text-ink" : "text-sub hover:bg-surface hover:text-ink")}
    >
      <Bookmark size={16} className={saved ? "fill-ink" : ""} aria-hidden />
      {withLabel && (saved ? "Saved" : "Save")}
    </button>
  );
}

export function IdeaRow({ idea }: { idea: Idea }) {
  const s = useAppState();
  const owner = personById(s, idea.ownerId);
  return (
    <li className="group relative border-b border-line py-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusDot tone={idea.stage === "pilot" || idea.stage === "launched" ? "accent" : "ink"} label={stageLabel(idea.stage)} />
            <span className="text-meta text-sub">{industryLabel(idea.industry)}</span>
            <span className="text-meta text-mute">{idea.geography}</span>
            {idea.status === "draft" && <span className="text-meta font-medium text-ink">Draft</span>}
            {idea.demo && <DemoMark />}
          </div>
          <h3 className="mt-1.5 text-[1.0625rem] font-semibold leading-snug tracking-tight">
            <Link href={`/ideas/${idea.id}`} className="after:absolute after:inset-0 hover:underline">
              {idea.title}
            </Link>
          </h3>
          <p className="mt-1.5 line-clamp-2 max-w-[70ch] text-ui text-sub">{idea.summary}</p>
          <div className="mt-3 flex items-center gap-2 text-meta text-sub">
            <Avatar name={owner?.name ?? "Member"} size={20} />
            {owner?.name}
            <span className="text-mute">· {idea.followers + (s.following.ideas.includes(idea.id) ? 1 : 0)} following</span>
          </div>
        </div>
        <div className="relative z-10">
          <SaveIdeaButton id={idea.id} />
        </div>
      </div>
    </li>
  );
}

export function PersonRow({ person, compact }: { person: Person; compact?: boolean }) {
  const s = useAppState();
  const following = s.following.people.includes(person.id);
  const requested = s.connections.includes(person.id);
  return (
    <li className={cn("flex items-start gap-3", compact ? "py-3" : "border-b border-line py-4")}>
      <Avatar name={person.name} size={compact ? 34 : 42} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/people/${person.id}`} className="text-ui font-medium text-ink hover:underline">
            {person.name}
          </Link>
          {!compact && <span className="text-micro text-mute">{roleShort(person.role)}</span>}
        </div>
        <p className={cn("text-meta text-sub", compact ? "line-clamp-1" : "line-clamp-2")}>{person.headline}</p>
        {!compact && <TagList items={person.skills.slice(0, 3)} className="mt-1.5" />}
      </div>
      <div className="flex shrink-0 gap-1.5">
        {!compact && (
          <Button
            size="sm"
            variant={requested ? "ghost" : "secondary"}
            onClick={() => {
              toggleConnect(person.id);
              toast(requested ? "Connection request withdrawn" : `Connection request sent to ${person.name}`, { body: requested ? undefined : "Demo — the other person is fictional and will not respond." });
            }}
          >
            {requested ? "Requested" : "Connect"}
          </Button>
        )}
        <Button
          size="sm"
          variant={following ? "ghost" : compact ? "secondary" : "ghost"}
          aria-pressed={following}
          onClick={() => {
            toggleFollowPerson(person.id);
            toast(following ? `Unfollowed ${person.name}` : `Following ${person.name}`);
          }}
        >
          {following ? "Following" : "Follow"}
        </Button>
      </div>
    </li>
  );
}

export function DeadlineLabel({ date }: { date: string }) {
  const d = daysUntil(date);
  if (d < 0) return <span className="text-meta text-mute">Closed {formatDate(date)}</span>;
  return d <= 21 ? <StatusDot tone="accent" label={`Closes in ${d} day${d === 1 ? "" : "s"}`} /> : <span className="text-meta text-sub">Closes {formatDate(date)}</span>;
}

export function OpportunityRow({ o }: { o: Opportunity }) {
  const s = useAppState();
  const saved = s.saved.opportunities.includes(o.id);
  const app = s.applications.find((a) => a.opportunityId === o.id);
  return (
    <li className="group relative border-b border-line py-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-meta font-medium text-ink">{OPPORTUNITY_KIND_LABEL[o.kind]}</span>
            <span className="text-meta text-sub">{o.location}</span>
            <DeadlineLabel date={o.deadline} />
            {app && <span className="text-meta text-ink">· {app.status === "submitted" ? "Applied" : app.status === "preparing" ? "Preparing" : "Interested"}</span>}
            {o.demo && <DemoMark />}
          </div>
          <h3 className="mt-1.5 text-[1.0625rem] font-semibold leading-snug tracking-tight">
            <Link href={`/opportunities/${o.id}`} className="after:absolute after:inset-0 hover:underline">
              {o.title}
            </Link>
          </h3>
          <p className="text-meta text-sub">{o.organisation}</p>
          <p className="mt-1.5 line-clamp-2 max-w-[70ch] text-ui text-charcoal">{o.description}</p>
          <TagList items={o.industries.map(industryLabel)} className="mt-2.5" />
        </div>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved opportunities" : "Save opportunity"}
          onClick={() => {
            toggleSaveOpportunity(o.id);
            toast(saved ? "Removed from saved" : "Opportunity saved");
          }}
          className={cn("relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors active:scale-95", saved ? "text-ink" : "text-sub hover:bg-surface hover:text-ink")}
        >
          <Bookmark size={16} className={saved ? "fill-ink" : ""} aria-hidden />
        </button>
      </div>
    </li>
  );
}
