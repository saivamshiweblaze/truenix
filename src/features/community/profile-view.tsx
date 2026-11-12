"use client";

import type { ReactNode } from "react";
import type { Idea, Person, Post } from "@/lib/types";
import { Avatar, DemoMark, SectionHeading, TagList } from "@/components/ui/primitives";
import { industryLabel, roleLabel } from "@/config/taxonomy";
import { IdeaRow } from "@/features/shared/rows";
import { PostCard } from "@/features/shared/post-card";

export function ProfileView({ person, ideas, posts, actions, me }: { person: Person; ideas: Idea[]; posts: Post[]; actions?: ReactNode; me?: boolean }) {
  return (
    <>
      <header className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-start">
        <Avatar name={person.name} size={88} me={me} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-title font-semibold">{person.name}</h1>
            {person.demo && <DemoMark>Demo profile</DemoMark>}
          </div>
          <p className="mt-1.5 max-w-2xl text-body text-charcoal">{person.headline}</p>
          <p className="mt-1 text-meta text-sub">{[person.organisation, person.location, roleLabel(person.role)].filter(Boolean).join(" · ")}</p>
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </header>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {person.bio && (
            <section className="mb-10">
              <SectionHeading title="About" />
              <p className="max-w-[68ch] text-body text-charcoal">{person.bio}</p>
            </section>
          )}
          <section className="mb-10">
            <SectionHeading title="Ideas and projects" />
            {ideas.length ? (
              <ul>
                {ideas.map((i) => (
                  <IdeaRow key={i.id} idea={i} />
                ))}
              </ul>
            ) : (
              <p className="text-ui text-sub">No public ideas yet.</p>
            )}
          </section>
          <section>
            <SectionHeading title="Posts" />
            {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <p className="text-ui text-sub">No posts yet.</p>}
          </section>
        </div>
        <aside className="flex flex-col gap-8">
          {person.skills.length > 0 && (
            <section>
              <SectionHeading title="Skills" />
              <TagList items={person.skills} />
            </section>
          )}
          {person.interests.length > 0 && (
            <section>
              <SectionHeading title="Interests" />
              <TagList items={person.interests.map(industryLabel)} />
            </section>
          )}
          {person.experience.length > 0 && (
            <section>
              <SectionHeading title="Experience" />
              <ul className="flex flex-col gap-3">
                {person.experience.map((x) => (
                  <li key={x.title + x.org}>
                    <p className="text-ui font-medium">{x.title}</p>
                    <p className="text-meta text-sub">
                      {x.org} · {x.period}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {person.collaboration.length > 0 && (
            <section>
              <SectionHeading title="Open to" />
              <ul className="flex flex-col gap-1.5 text-ui text-charcoal">
                {person.collaboration.map((c) => (
                  <li key={c} className="flex gap-2.5">
                    <span aria-hidden className="mt-[0.65em] h-px w-3 shrink-0 bg-ink" />
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
