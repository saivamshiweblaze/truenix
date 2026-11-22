"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, FlaskConical, ScanSearch, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, SectionHeading, SectionLink, StatusDot, TagList } from "@/components/ui/primitives";
import { BulbArt } from "@/components/illustrations/art";
import { brand } from "@/config/brand";
import { industryLabel, INDUSTRIES, roleLabel, stageLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { allPeople, allThreads, feedPosts, opportunities, publicIdeas } from "@/lib/store/selectors";
import type { AppState } from "@/lib/store/state";
import type { RoleId } from "@/lib/types";
import { NEXT_STEPS } from "@/features/dashboard/next-steps";
import { DeadlineLabel, IdeaRow, PersonRow } from "@/features/shared/rows";
import { ProjectCard, projectNextAction } from "@/features/ideas/project-card";
import { PostCard } from "@/features/shared/post-card";
import { cn, daysUntil } from "@/lib/utils";

function journeyPosition(s: AppState, role: RoleId) {
  if (role === "student_explorer" || role === "participant") return s.following.people.length + s.following.ideas.length > 0 ? 1 : 0;
  const ideas = s.ideas.length;
  const research = s.research.length;
  const evidence = Object.values(s.validations).some((v) => v.evidence.length);
  if (evidence) return 4;
  if (s.connections.length && ideas) return 3;
  if (research) return 2;
  if (ideas) return 1;
  return role === "founder" ? 2 : 0;
}

const BUILDER_ROLES: RoleId[] = ["student_idea", "founder"];

/** Shortcuts to the four working tools, so nobody has to hunt for them. */
const TOOLS = [
  { href: "/research", label: "Research a market", body: "Plan market, competitor and customer research", icon: ScanSearch },
  { href: "/validate", label: "Validate an idea", body: "Test assumptions with real evidence", icon: FlaskConical },
  { href: "/community?tab=people", label: "Find collaborators", body: "Search people by skill and industry", icon: UsersRound },
  { href: "/discover", label: "Discover problems", body: "Industry problems and founder updates", icon: Compass },
];

export default function HomePage() {
  const s = useAppState();
  const user = s.user!;
  const role = user.role;
  const pos = journeyPosition(s, role);
  const first = user.name.split(" ")[0];
  const interests = user.interests.length ? user.interests : (["ai", "healthcare", "sustainability"] as const);
  const usingDefaults = !user.interests.length;
  const builder = BUILDER_ROLES.includes(role);

  // Next step: a builder's own project comes first; otherwise the role's first priority.
  const focusIdea = builder ? [...s.ideas].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] : undefined;
  const steps = NEXT_STEPS[role];
  const projectStep = focusIdea ? projectNextAction(s, focusIdea) : null;
  const primary = projectStep
    ? { title: projectStep.label, body: `Next for “${focusIdea!.title || "your idea"}”. ${focusIdea!.status === "draft" ? "It’s still a private draft." : `Stage: ${stageLabel(focusIdea!.stage)}.`}`, href: projectStep.href }
    : steps[0];
  const later = (projectStep ? steps : steps.slice(1)).filter((st) => st.href !== primary.href).slice(0, 3);

  const problems = feedPosts(s).filter((p) => p.kind === "problem" || p.kind === "technology").slice(0, 3);
  // Two recent posts from the person's industries, so Home shows the network moving, not only tasks.
  const shownProblems = new Set(problems.map((p) => p.id));
  const network = feedPosts(s)
    .filter((p) => !shownProblems.has(p.id) && p.authorId !== "me")
    .sort((a, b) => Number(b.industries.some((i) => (interests as readonly string[]).includes(i))) - Number(a.industries.some((i) => (interests as readonly string[]).includes(i))))
    .slice(0, 2);
  const others = publicIdeas(s).filter((i) => i.ownerId !== "me");
  const skillMatch = others.filter((i) => i.requiredSkills.some((k) => user.skills.includes(k)));
  const interestMatch = others.filter((i) => (interests as readonly string[]).includes(i.industry));
  const projects = (skillMatch.length ? skillMatch : interestMatch.length ? interestMatch : others).slice(0, 3);
  const people = allPeople(s).filter((p) => p.interests.some((i) => (interests as readonly string[]).includes(i)) && !s.following.people.includes(p.id));
  const reviewThreads = allThreads(s).filter((t) => t.kind === "review_request");
  const opps = [...opportunities(s)]
    .filter((o) => daysUntil(o.deadline) >= 0)
    .filter((o) => (role === "student_explorer" ? ["hackathon", "challenge", "university", "event"].includes(o.kind) : role === "founder" ? ["accelerator", "incubator", "industry", "grant"].includes(o.kind) : role === "mentor" ? ["mentorship", "university"].includes(o.kind) : true))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);

  return (
    <>
      {/* Level 1 — who, and the one thing to do next */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <h1 className="text-title font-bold">Good to see you, {first}.</h1>
        <p className="text-meta text-sub">{roleLabel(role)}</p>
      </header>

      {/* Next step: a compact working strip, not a banner. The journey sits beside it. */}
      <section aria-labelledby="next-title" className="mt-4 rounded-lg border border-line bg-paper">
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
          <div className="min-w-0 p-5 md:p-6">
            <p className="text-meta text-sub">Your next step</p>
            <h2 id="next-title" className="mt-1 font-display text-[1.375rem] font-bold leading-tight tracking-tight text-ink md:text-[1.625rem]">
              {primary.title}
            </h2>
            <p className="mt-1.5 max-w-[56ch] text-ui text-sub">{primary.body}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <ButtonLink href={primary.href} variant="accent">
                {primary.title} <ArrowRight size={16} aria-hidden />
              </ButtonLink>
              {builder && !s.ideas.length && (
                <Link href="/discover" className="text-ui text-sub underline-offset-4 hover:text-ink hover:underline">
                  Not sure yet? Browse problems first
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-line p-5 md:border-l md:border-t-0 md:p-6">
            <JourneyBar current={pos} />
            {later.length > 0 && (
              <div className="max-sm:hidden">
                <p className="text-micro text-mute">After that</p>
                <ul className="mt-1 flex flex-col">
                  {later.map((st) => (
                    <li key={st.title}>
                      <Link href={st.href} className="group flex items-center justify-between gap-3 py-1.5 text-ui text-charcoal hover:text-ink">
                        {st.title}
                        <ArrowUpRight size={15} className="shrink-0 text-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Level 2 — the tools, one tap away. One scrolling row on phones. */}
      <nav aria-label="Tools" className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="group flex shrink-0 items-center gap-2.5 rounded-md border border-line py-2 pl-2 pr-3.5 transition-colors hover:border-line-strong hover:bg-surface/60 md:py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface text-ink">
              <t.icon size={17} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="whitespace-nowrap text-ui font-medium text-ink">{t.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-10">
          {builder && (
            <section aria-labelledby="your-ideas">
              <SectionHeading title={role === "founder" ? "Your projects" : "Your ideas"} id="your-ideas" count={s.ideas.length} action={<SectionLink href="/workspace">Open workspace</SectionLink>} />
              {s.ideas.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {[...s.ideas]
                    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                    .slice(0, 4)
                    .map((i) => (
                      <ProjectCard key={i.id} idea={i} />
                    ))}
                </div>
              ) : (
                <div className="flex flex-col gap-5 rounded-md border border-dashed border-line-strong p-6 sm:flex-row sm:items-center">
                  <BulbArt size={64} className="hidden shrink-0 sm:block" />
                  <div className="flex-1">
                    <p className="text-section font-bold">Write down the problem you want to solve</p>
                    <p className="mt-1 text-ui text-sub">It stays private until you choose otherwise. Once it’s in, research and validation attach to it.</p>
                  </div>
                  <ButtonLink href="/ideas/new" variant="primary">
                    Submit an idea
                  </ButtonLink>
                </div>
              )}
            </section>
          )}

          {(role === "expert" || role === "mentor") && (
            <section aria-labelledby="reviews">
              <SectionHeading title="Waiting for your review" id="reviews" action={<SectionLink href="/reviews">All requests</SectionLink>} />
              <ul>
                {reviewThreads.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-4 border-b border-line py-3.5">
                    <Link href={`/messages?thread=${t.id}`} className="text-ui font-semibold hover:underline">
                      {t.subject}
                    </Link>
                    <StatusDot tone="attention" label="Request" />
                  </li>
                ))}
                {publicIdeas(s)
                  .filter((i) => user.industries.includes(i.industry) && i.ownerId !== "me")
                  .slice(0, 3)
                  .map((i) => (
                    <li key={i.id} className="border-b border-line py-3.5">
                      <Link href={`/ideas/${i.id}`} className="text-ui font-semibold hover:underline">
                        {i.title.split(":")[0]}
                      </Link>
                      <p className="text-meta text-sub">
                        Open for feedback · {industryLabel(i.industry)} · {stageLabel(i.stage)}
                      </p>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {(role === "student_explorer" || role === "student_idea" || role === "founder" || role === "professional") && projects.length > 0 && (
            <section aria-labelledby="projects">
              <SectionHeading
                title={skillMatch.length ? "Projects that need your skills" : role === "founder" ? "Projects near yours" : "Projects you could contribute to"}
                id="projects"
                action={<SectionLink href="/ideas">All ideas</SectionLink>}
              />
              <ul>
                {projects.map((i) => (
                  <IdeaRow key={i.id} idea={i} />
                ))}
              </ul>
            </section>
          )}

          {(role === "student_explorer" || role === "participant" || role === "expert" || role === "professional") && (
            <section aria-labelledby="problems">
              <SectionHeading title="Problems worth knowing" id="problems" action={<SectionLink href="/discover">Open Discover</SectionLink>} />
              <ul>
                {problems.map((p) => (
                  <li key={p.id} className="border-b border-line py-4">
                    <Link href={`/discover#${p.id}`} className="text-[1.0625rem] font-bold leading-snug tracking-tight hover:underline">
                      {p.title}
                    </Link>
                    <TagList items={p.industries.map(industryLabel)} className="mt-1" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {network.length > 0 && (
            <section aria-labelledby="network">
              <SectionHeading title="New in your areas" id="network" action={<SectionLink href="/discover">Open Discover</SectionLink>} className="mb-0" />
              <div>
                {network.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}

          {role === "student_explorer" && (
            <section aria-labelledby="industries">
              <SectionHeading title="Industries to explore" id="industries" />
              <ul className="grid grid-cols-2 gap-x-8 sm:grid-cols-3">
                {INDUSTRIES.map((i) => {
                  const n = publicIdeas(s).filter((x) => x.industry === i.id).length + feedPosts(s).filter((p) => p.industries.includes(i.id)).length;
                  return (
                    <li key={i.id} className="flex items-baseline justify-between border-b border-line py-2.5">
                      <Link href={`/search?q=${encodeURIComponent(i.label)}`} className="text-ui text-charcoal hover:text-ink hover:underline">
                        {i.label}
                      </Link>
                      <span className="text-micro text-mute tabular-nums">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* Level 2/3 — supporting suggestions */}
        <aside className="flex flex-col gap-10">
          <section aria-labelledby="opps">
            <SectionHeading title={role === "student_explorer" ? "Hackathons and challenges" : "Opportunities for you"} id="opps" action={<SectionLink href="/opportunities">See all</SectionLink>} />
            <ul className="flex flex-col">
              {opps.map((o) => (
                <li key={o.id} className="border-b border-line py-3 last:border-0">
                  <Link href={`/opportunities/${o.id}`} className="text-ui font-semibold leading-snug hover:underline">
                    {o.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <DeadlineLabel date={o.deadline} />
                    <span className="text-meta text-mute">{o.location}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="people">
            <SectionHeading
              title={role === "founder" ? "Talent and co-founders" : role === "student_idea" ? "Possible collaborators" : role === "expert" || role === "mentor" ? "Founders in your areas" : "People to follow"}
              id="people"
              action={<SectionLink href="/community?tab=people">Find people</SectionLink>}
            />
            <ul>
              {people.slice(0, 4).map((p) => (
                <PersonRow key={p.id} person={p} compact />
              ))}
            </ul>
          </section>
          <section aria-labelledby="interests" className="rounded-md bg-surface p-4">
            <SectionHeading title="Personalised for" id="interests" action={<SectionLink href="/settings?tab=preferences">Edit</SectionLink>} />
            <ul className="flex flex-wrap gap-1.5">
              {interests.map((i) => (
                <li key={i}>
                  <Badge className="bg-paper">{industryLabel(i)}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-micro text-mute">{usingDefaults ? "These are general suggestions. Choose your own industries to tailor this page." : "Change your interests any time; this page follows them."}</p>
            {!user.emailVerified && (
              <p className="mt-4 border-t border-line pt-3">
                <StatusDot tone="mute" label="Email not yet confirmed" />{" "}
                <Link href="/verify-email" className="text-meta text-ink underline underline-offset-4">
                  Details
                </Link>
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

/** Where the person is on the Discover → Build journey. The current step is the only accent. */
function JourneyBar({ current }: { current: number }) {
  const steps = brand.journey;
  return (
    <div>
      <p className="text-micro text-mute">
        Where you are: <span className="font-semibold text-ink">{steps[current]}</span>, step {current + 1} of {steps.length}
      </p>
      <ol aria-hidden className="mt-2.5 flex items-center gap-1">
        {steps.map((st, i) => (
          <li key={st} className={cn("h-1.5 flex-1 rounded-full", i < current ? "bg-ink" : i === current ? "bg-accent" : "bg-sunken")} />
        ))}
      </ol>
      <div aria-hidden className="mt-1.5 flex justify-between text-[0.6875rem] text-mute">
        <span>{steps[0]}</span>
        <span>{steps[steps.length - 1]}</span>
      </div>
    </div>
  );
}
