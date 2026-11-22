"use client";

import Link from "next/link";
import { Bookmark, Globe, Lock, UsersRound } from "lucide-react";
import type { Idea, Opportunity, Person } from "@/lib/types";
import { Avatar, Badge, SampleMark, StatusDot, TagList } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { industryLabel, OPPORTUNITY_KIND_LABEL, roleShort, stageLabel, STAGES, VISIBILITY } from "@/config/taxonomy";
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

/** Public visibility, in words people understand. */
export function VisibilityLabel({ visibility, className }: { visibility: Idea["visibility"]; className?: string }) {
  const Icon = visibility === "private" ? Lock : visibility === "reviewers" ? UsersRound : Globe;
  const v = VISIBILITY.find((x) => x.id === visibility);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-meta text-sub", className)} title={v?.explanation}>
      <Icon size={13} aria-hidden />
      {v?.label}
    </span>
  );
}

/**
 * An idea as a project entity: stage and industry first, then the title, the problem and the
 * proposed solution as two scannable lines, then the team and what it needs.
 */
export function IdeaRow({ idea }: { idea: Idea }) {
  const s = useAppState();
  const owner = personById(s, idea.ownerId);
  const mine = idea.ownerId === "me";
  const teamSize = idea.team.length + 1;
  return (
    <li className="group relative border-b border-line py-5 transition-colors hover:bg-surface/50 md:-mx-3 md:px-3">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="strong">{stageLabel(idea.stage)}</Badge>
            <Badge>{industryLabel(idea.industry)}</Badge>
            {idea.status === "draft" && <Badge tone="outline">Draft</Badge>}
            {mine && <VisibilityLabel visibility={idea.visibility} className="ml-1" />}
          </div>
          <h3 className="mt-2.5 text-[1.125rem] font-bold leading-snug tracking-tight text-ink">
            <Link href={`/ideas/${idea.id}`} className="after:absolute after:inset-0 group-hover:underline">
              {idea.title || "Untitled idea"}
            </Link>
          </h3>
          <dl className="mt-2 grid max-w-[74ch] gap-1 text-ui">
            {(idea.problem || idea.summary) && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-meta leading-[1.45rem] text-mute">Problem</dt>
                <dd className="line-clamp-2 text-charcoal">{idea.problem || idea.summary}</dd>
              </div>
            )}
            {idea.solution && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-meta leading-[1.45rem] text-mute">Solution</dt>
                <dd className="line-clamp-1 text-sub">{idea.solution}</dd>
              </div>
            )}
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-meta text-sub">
            <span className="flex items-center gap-2">
              <Avatar name={owner?.name ?? "Member"} size={20} />
              {mine ? "You" : owner?.name}
              {teamSize > 1 && <span className="text-mute">+ {teamSize - 1} in team</span>}
            </span>
            {idea.geography && <span className="text-mute">{idea.geography}</span>}
            <span className="text-mute">{idea.followers + (s.following.ideas.includes(idea.id) ? 1 : 0)} following</span>
          </div>
          {idea.requiredSkills.length > 0 && !mine && (
            <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-meta">
              <span className="mr-1 font-medium text-ink">Needs</span>
              {idea.requiredSkills.slice(0, 4).map((k) => (
                <Badge key={k} tone={s.user?.skills.includes(k) ? "accent" : "outline"}>
                  {k}
                </Badge>
              ))}
            </p>
          )}
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
              toast(requested ? "Connection request withdrawn" : `Connection request sent to ${person.name}`, { body: requested || !person.demo ? undefined : "This is a sample profile, so requests aren’t delivered." });
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
  if (d < 0) return <StatusDot tone="mute" label={`Closed ${formatDate(date)}`} />;
  return d <= 21 ? <StatusDot tone="attention" label={d === 0 ? "Closes today" : `Closes in ${d} day${d === 1 ? "" : "s"}`} /> : <span className="text-meta text-sub">Closes {formatDate(date)}</span>;
}

/**
 * An opportunity, scannable in columns on wide screens: what and who on the left,
 * then eligibility, stage, location and deadline. Closed listings are visibly quieter.
 */
export function OpportunityRow({ o }: { o: Opportunity }) {
  const s = useAppState();
  const saved = s.saved.opportunities.includes(o.id);
  const app = s.applications.find((a) => a.opportunityId === o.id);
  const closed = daysUntil(o.deadline) < 0;
  const stages = o.stage.map((id) => STAGES.find((x) => x.id === id)?.label ?? id);
  return (
    <li className={cn("group relative border-b border-line py-5 transition-colors hover:bg-surface/50 md:-mx-3 md:px-3", closed && "opacity-70")}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)_auto] md:items-start md:gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={closed ? "outline" : "strong"}>{OPPORTUNITY_KIND_LABEL[o.kind]}</Badge>
            {closed && <Badge tone="outline">Closed</Badge>}
            {o.featured && !closed && <Badge tone="outline">Featured</Badge>}
            {o.demo && <SampleMark title="Illustrative listing. No partnership or endorsement is implied.">Sample</SampleMark>}
            {app && <Badge tone={app.status === "submitted" ? "positive" : "neutral"}>{app.status === "submitted" ? "Applied" : app.status === "preparing" ? "Preparing" : "Interested"}</Badge>}
          </div>
          <h3 className="mt-2.5 text-[1.125rem] font-bold leading-snug tracking-tight text-ink">
            <Link href={`/opportunities/${o.id}`} className="after:absolute after:inset-0 group-hover:underline">
              {o.title}
            </Link>
          </h3>
          <p className="text-meta text-sub">{o.organisation}</p>
          <p className="mt-1.5 line-clamp-2 max-w-[70ch] text-ui text-charcoal">{o.description}</p>
          <TagList items={o.industries.map(industryLabel)} className="mt-2.5" />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-meta">
          <div>
            <dt className="text-mute">Deadline</dt>
            <dd className="mt-0.5">
              <DeadlineLabel date={o.deadline} />
            </dd>
          </div>
          <div>
            <dt className="text-mute">Location</dt>
            <dd className="mt-0.5 text-charcoal">{o.location}</dd>
          </div>
          <div>
            <dt className="text-mute">Stage</dt>
            <dd className="mt-0.5 text-charcoal">{stages.length >= STAGES.length ? "Any stage" : stages.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-mute">Eligibility</dt>
            <dd className="mt-0.5 line-clamp-2 text-charcoal">{o.eligibility}</dd>
          </div>
        </dl>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved opportunities" : "Save opportunity"}
          onClick={() => {
            toggleSaveOpportunity(o.id);
            toast(saved ? "Removed from saved" : "Opportunity saved");
          }}
          className={cn("absolute right-0 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors active:scale-95 md:relative md:right-auto md:top-auto", saved ? "text-ink" : "text-sub hover:bg-surface hover:text-ink")}
        >
          <Bookmark size={17} className={saved ? "fill-ink" : ""} aria-hidden />
        </button>
      </div>
    </li>
  );
}
