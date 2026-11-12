"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading, StatusDot, TagList } from "@/components/ui/primitives";
import { JourneyLine } from "@/components/illustrations/journey-line";
import { BulbArt, CompassArt, FlaskArt, LensArt, NetworkArt, PathArt } from "@/components/illustrations/art";
import { industryLabel, INDUSTRIES, roleLabel, stageLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { allPeople, allThreads, feedPosts, opportunities, publicIdeas } from "@/lib/store/selectors";
import type { AppState } from "@/lib/store/state";
import type { RoleId } from "@/lib/types";
import { NEXT_STEPS } from "@/features/dashboard/next-steps";
import { DeadlineLabel, IdeaRow, PersonRow } from "@/features/shared/rows";

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

const ROLE_ART: Partial<Record<RoleId, React.ReactNode>> = {
  student_idea: <BulbArt size={64} />,
  student_explorer: <CompassArt size={64} />,
  founder: <PathArt size={64} />,
  expert: <LensArt size={64} />,
  mentor: <NetworkArt size={64} />,
  participant: <FlaskArt size={64} />,
};

export default function HomePage() {
  const s = useAppState();
  const user = s.user!;
  const role = user.role;
  const steps = NEXT_STEPS[role];
  const pos = journeyPosition(s, role);
  const first = user.name.split(" ")[0];
  const interests = user.interests.length ? user.interests : (["ai", "healthcare", "sustainability"] as const);

  const problems = feedPosts(s).filter((p) => p.kind === "problem" || p.kind === "technology").slice(0, 3);
  const openProjects = publicIdeas(s).filter((i) => i.ownerId !== "me" && i.collaborationNeeds && i.industry && (interests as readonly string[]).includes(i.industry)).slice(0, 3);
  const projectsFallback = openProjects.length ? openProjects : publicIdeas(s).filter((i) => i.ownerId !== "me").slice(0, 3);
  const people = allPeople(s).filter((p) => p.interests.some((i) => (interests as readonly string[]).includes(i)) && !s.following.people.includes(p.id));
  const reviewThreads = allThreads(s).filter((t) => t.kind === "review_request");
  const opps = [...opportunities(s)]
    .filter((o) => (role === "student_explorer" ? ["hackathon", "challenge", "university", "event"].includes(o.kind) : role === "founder" ? ["accelerator", "incubator", "industry", "grant"].includes(o.kind) : role === "mentor" ? ["mentorship", "university"].includes(o.kind) : true))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);

  return (
    <>
      <header className="flex flex-col gap-8 border-b border-line pb-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-meta text-sub">{roleLabel(role)}</p>
          <h1 className="mt-1 text-display font-semibold">Good to see you, {first}.</h1>
          <p className="mt-3 text-body text-sub">
            {role === "student_explorer"
              ? "No idea yet is a fine place to start. Here are problems, people and projects in the areas you chose."
              : role === "expert" || role === "mentor"
                ? "Founders and students are looking for people who have done it before. Here is where you can help."
                : role === "participant"
                  ? "Founders learn the most from people who live with the problem. Here is where your experience is wanted."
                  : "Here is where your work stands, and what to do next."}
          </p>
        </div>
        <div className="hidden md:block">{ROLE_ART[role]}</div>
      </header>

      <section aria-labelledby="journey" className="border-b border-line py-8">
        <h2 id="journey" className="sr-only">
          Your journey
        </h2>
        <JourneyLine current={pos} />
      </section>

      <div className="mt-10 grid gap-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-14">
          <section aria-labelledby="next">
            <SectionHeading title="What to do next" id="next" />
            <ol className="flex flex-col">
              {steps.map((st, i) => (
                <li key={st.title}>
                  <Link href={st.href} className="group flex items-start gap-5 border-b border-line py-4 transition-colors hover:bg-surface/60 md:px-2">
                    <span className="w-5 pt-0.5 text-meta text-mute tabular-nums">{i + 1}</span>
                    <span className="flex-1">
                      <span className="block text-ui font-medium text-ink">{st.title}</span>
                      <span className="block text-meta text-sub">{st.body}</span>
                    </span>
                    <ArrowUpRight size={16} className="mt-0.5 text-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          {(role === "student_idea" || role === "founder") && (
            <section aria-labelledby="your-ideas">
              <SectionHeading title={role === "founder" ? "Your projects" : "Your ideas"} id="your-ideas" action={<Link href="/workspace" className="text-meta text-sub hover:text-ink">Workspace</Link>} />
              {s.ideas.length ? (
                <ul>
                  {s.ideas.slice(0, 3).map((i) => (
                    <IdeaRow key={i.id} idea={i} />
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-5 border border-dashed border-line-strong p-5">
                  <BulbArt size={48} />
                  <div className="flex-1">
                    <p className="text-ui font-medium">Nothing here yet</p>
                    <p className="text-meta text-sub">Write the problem you want to solve. It stays private unless you choose otherwise.</p>
                  </div>
                  <ButtonLink href="/ideas/new" variant="accent" size="sm">
                    Submit idea
                  </ButtonLink>
                </div>
              )}
            </section>
          )}

          {(role === "expert" || role === "mentor") && (
            <section aria-labelledby="reviews">
              <SectionHeading title="Review requests" id="reviews" action={<Link href="/reviews" className="text-meta text-sub hover:text-ink">All requests</Link>} />
              <ul>
                {reviewThreads.map((t) => (
                  <li key={t.id} className="border-b border-line py-3">
                    <Link href={`/messages?thread=${t.id}`} className="text-ui font-medium hover:underline">
                      {t.subject}
                    </Link>
                  </li>
                ))}
                {publicIdeas(s)
                  .filter((i) => user.industries.includes(i.industry) && i.ownerId !== "me")
                  .slice(0, 3)
                  .map((i) => (
                    <li key={i.id} className="border-b border-line py-3">
                      <Link href={`/ideas/${i.id}`} className="text-ui font-medium hover:underline">
                        {i.title.split(":")[0]}
                      </Link>
                      <p className="text-meta text-sub">Open for feedback · {industryLabel(i.industry)} · {stageLabel(i.stage)}</p>
                    </li>
                  ))}
              </ul>
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

          {(role === "student_explorer" || role === "participant" || role === "expert") && (
            <section aria-labelledby="problems">
              <SectionHeading title="Problems and technologies worth knowing" id="problems" action={<Link href="/discover" className="text-meta text-sub hover:text-ink">Discover</Link>} />
              <ul>
                {problems.map((p) => (
                  <li key={p.id} className="border-b border-line py-4">
                    <Link href={`/discover#${p.id}`} className="text-ui font-medium hover:underline">
                      {p.title}
                    </Link>
                    <TagList items={p.industries.map(industryLabel)} className="mt-1" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(role === "student_explorer" || role === "student_idea" || role === "founder") && (
            <section aria-labelledby="projects">
              <SectionHeading title={role === "founder" ? "Projects near yours" : "Projects you could contribute to"} id="projects" />
              <ul>
                {projectsFallback.map((i) => (
                  <IdeaRow key={i.id} idea={i} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-12">
          <section aria-labelledby="people">
            <SectionHeading
              title={role === "founder" ? "Talent and co-founders" : role === "student_idea" ? "Possible collaborators" : role === "expert" || role === "mentor" ? "Founders in your areas" : "People to follow"}
              id="people"
            />
            <ul>
              {people.slice(0, 4).map((p) => (
                <PersonRow key={p.id} person={p} compact />
              ))}
            </ul>
          </section>
          <section aria-labelledby="opps">
            <SectionHeading title={role === "student_explorer" ? "Hackathons and challenges" : "Opportunities"} id="opps" />
            <ul>
              {opps.map((o) => (
                <li key={o.id} className="border-b border-line py-3">
                  <Link href={`/opportunities/${o.id}`} className="text-ui font-medium hover:underline">
                    {o.title}
                  </Link>
                  <div className="mt-0.5">
                    <DeadlineLabel date={o.deadline} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="interests">
            <SectionHeading title="Your interests" id="interests" action={<Link href="/settings" className="text-meta text-sub hover:text-ink">Edit</Link>} />
            <TagList items={interests.map((i) => industryLabel(i))} />
            {!user.emailVerified && (
              <p className="mt-6">
                <StatusDot tone="accent" label="Email not verified (demo)" />{" "}
                <Link href="/verify-email" className="text-meta text-ink underline underline-offset-4">
                  Verify
                </Link>
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
