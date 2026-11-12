"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Progress, SectionHeading, StatusDot } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { addTask, removeTask, toggleTask } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { allPeople, allThreads, opportunityById, personById, visibleIdeas } from "@/lib/store/selectors";
import { summarise } from "@/lib/services/validation";
import { IdeaRow } from "@/features/shared/rows";
import { stageLabel } from "@/config/taxonomy";
import { formatDate, timeAgo } from "@/lib/utils";

type Tab = "overview" | "ideas" | "saved" | "research" | "validation" | "collaborations" | "applications";

export default function WorkspacePage() {
  const s = useAppState();
  const [tab, setTab] = useState<Tab>("overview");
  const [task, setTask] = useState("");
  const drafts = s.ideas.filter((i) => i.status === "draft");
  const submitted = s.ideas.filter((i) => i.status === "submitted");
  const savedIdeas = visibleIdeas(s).filter((i) => s.saved.ideas.includes(i.id));
  const followed = visibleIdeas(s).filter((i) => s.following.ideas.includes(i.id));
  const collabThreads = allThreads(s).filter((t) => t.kind === "collaboration_request");
  const connections = allPeople(s).filter((p) => s.connections.includes(p.id));
  const validations = Object.values(s.validations).filter((v) => s.ideas.some((i) => i.id === v.ideaId));

  return (
    <>
      <PageHeader
        title="My workspace"
        description="Everything you are working on, saved or tracking — in one place."
        actions={
          <ButtonLink href="/ideas/new" variant="primary">
            <Plus size={15} aria-hidden /> New idea
          </ButtonLink>
        }
      />
      <Tabs
        label="Workspace sections"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "ideas", label: "My ideas", count: s.ideas.length },
          { value: "saved", label: "Saved", count: savedIdeas.length + s.saved.posts.length },
          { value: "research", label: "Research", count: s.research.length },
          { value: "validation", label: "Validation", count: validations.length },
          { value: "collaborations", label: "Collaborations", count: collabThreads.length + connections.length },
          { value: "applications", label: "Applications", count: s.applications.length },
        ]}
      />

      <div className="pt-8">
        {tab === "overview" && (
          <div className="grid gap-12 lg:grid-cols-2">
            <section aria-labelledby="tasks">
              <SectionHeading title="Personal tasks" id="tasks" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTask(task);
                  setTask("");
                }}
                className="flex gap-2"
              >
                <label htmlFor="task" className="sr-only">
                  New task
                </label>
                <input id="task" value={task} onChange={(e) => setTask(e.target.value)} maxLength={200} placeholder="Add a task, e.g. ‘Interview two ward nurses’" className="h-10 flex-1 rounded-sm border border-line-strong px-3 text-ui focus:border-ink focus:outline-none" />
                <Button type="submit" disabled={!task.trim()}>
                  Add
                </Button>
              </form>
              <ul className="mt-3">
                {s.tasks.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 border-b border-line py-2.5">
                    <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} aria-label={t.text} className="h-4 w-4 accent-[var(--color-ink)]" />
                    <span className={t.done ? "flex-1 text-ui text-mute line-through" : "flex-1 text-ui"}>{t.text}</span>
                    <button type="button" onClick={() => removeTask(t.id)} aria-label={`Remove task: ${t.text}`} className="rounded-sm p-1 text-mute opacity-60 hover:bg-surface hover:text-ink group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              {!s.tasks.length && <p className="mt-3 text-meta text-sub">No tasks. Add the next small step you can take.</p>}
            </section>
            <section aria-labelledby="activity">
              <SectionHeading title="Recent activity" id="activity" />
              {s.activity.length ? (
                <ol className="flex flex-col">
                  {s.activity.slice(0, 12).map((a) => (
                    <li key={a.id} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
                      {a.href ? (
                        <Link href={a.href} className="text-ui text-charcoal hover:text-ink hover:underline">
                          {a.text}
                        </Link>
                      ) : (
                        <span className="text-ui text-charcoal">{a.text}</span>
                      )}
                      <span className="shrink-0 text-micro text-mute">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-meta text-sub">Your actions — ideas, research, follows — will be listed here.</p>
              )}
            </section>
          </div>
        )}

        {tab === "ideas" && (
          <div className="flex flex-col gap-10">
            <section>
              <SectionHeading title="Drafts" />
              {drafts.length ? <ul>{drafts.map((i) => <IdeaRow key={i.id} idea={i} />)}</ul> : <p className="text-meta text-sub">No drafts.</p>}
            </section>
            <section>
              <SectionHeading title="Submitted ideas" />
              {submitted.length ? (
                <ul>{submitted.map((i) => <IdeaRow key={i.id} idea={i} />)}</ul>
              ) : (
                <EmptyState title="Nothing submitted yet" body="Submit an idea to research and validate it." action={<ButtonLink href="/ideas/new">Submit an idea</ButtonLink>} />
              )}
            </section>
            {followed.length > 0 && (
              <section>
                <SectionHeading title="Projects you follow" />
                <ul>{followed.map((i) => <IdeaRow key={i.id} idea={i} />)}</ul>
              </section>
            )}
          </div>
        )}

        {tab === "saved" && (
          <div className="flex flex-col gap-10">
            <section>
              <SectionHeading title="Saved ideas" />
              {savedIdeas.length ? <ul>{savedIdeas.map((i) => <IdeaRow key={i.id} idea={i} />)}</ul> : <p className="text-meta text-sub">Use the bookmark on any idea to save it here.</p>}
            </section>
            <section>
              <SectionHeading title="Saved posts" action={<Link href="/discover" className="text-meta text-sub hover:text-ink">Open in Discover</Link>} />
              <p className="text-meta text-sub">{s.saved.posts.length} saved — view them under Discover › Saved.</p>
            </section>
          </div>
        )}

        {tab === "research" &&
          (s.research.length ? (
            <ul className="max-w-3xl">
              {s.research.map((r) => (
                <li key={r.id} className="border-b border-line py-4">
                  <Link href={`/research/${r.id}`} className="text-ui font-medium hover:underline">
                    {r.question}
                  </Link>
                  <p className="mt-0.5 text-meta text-sub">
                    {formatDate(r.createdAt)} · Demonstration report{r.saved ? " · Saved" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No research yet" body="Run a research plan from the AI Researcher." action={<ButtonLink href="/research">Open AI Researcher</ButtonLink>} />
          ))}

        {tab === "validation" &&
          (validations.length ? (
            <ul className="max-w-3xl">
              {validations.map((v) => {
                const idea = s.ideas.find((i) => i.id === v.ideaId)!;
                const sum = summarise(v);
                return (
                  <li key={v.ideaId} className="border-b border-line py-4">
                    <div className="flex items-center justify-between gap-4">
                      <Link href={`/validate/${v.ideaId}`} className="text-ui font-medium hover:underline">
                        {idea.title || "Untitled"}
                      </Link>
                      <span className="text-meta text-sub tabular-nums">
                        {sum.done}/{sum.total} areas
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress value={(sum.done / sum.total) * 100} label={`Validation progress for ${idea.title}`} />
                    </div>
                    <p className="mt-2 text-micro text-mute">
                      {sum.realEvidence} evidence items from people or experiments · {stageLabel(idea.stage)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No validation work yet" body="Start validating one of your ideas." action={<ButtonLink href="/validate">Validate my idea</ButtonLink>} />
          ))}

        {tab === "collaborations" && (
          <div className="grid gap-12 lg:grid-cols-2">
            <section>
              <SectionHeading title="Collaboration conversations" />
              {collabThreads.length ? (
                <ul>
                  {collabThreads.map((t) => (
                    <li key={t.id} className="border-b border-line py-3">
                      <Link href={`/messages?thread=${t.id}`} className="text-ui font-medium hover:underline">
                        {t.subject}
                      </Link>
                      <p className="text-meta text-sub">with {personById(s, t.participantId)?.name}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-meta text-sub">None yet.</p>
              )}
            </section>
            <section>
              <SectionHeading title="Connection requests sent" />
              {connections.length ? (
                <ul>
                  {connections.map((p) => (
                    <li key={p.id} className="flex items-center justify-between border-b border-line py-3">
                      <Link href={`/people/${p.id}`} className="text-ui hover:underline">
                        {p.name}
                      </Link>
                      <StatusDot tone="mute" label="Pending (demo)" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-meta text-sub">Connect with people from Community.</p>
              )}
            </section>
          </div>
        )}

        {tab === "applications" &&
          (s.applications.length ? (
            <ul className="max-w-3xl">
              {s.applications.map((a) => {
                const o = opportunityById(a.opportunityId);
                if (!o) return null;
                return (
                  <li key={a.opportunityId} className="flex items-center justify-between gap-4 border-b border-line py-4">
                    <div>
                      <Link href={`/opportunities/${o.id}`} className="text-ui font-medium hover:underline">
                        {o.title}
                      </Link>
                      <p className="text-meta text-sub">Deadline {formatDate(o.deadline)}</p>
                    </div>
                    <StatusDot tone={a.status === "submitted" ? "ink" : "accent"} label={a.status === "submitted" ? "Applied" : a.status === "preparing" ? "Preparing" : "Interested"} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No applications tracked" body="Track an application from any opportunity page." action={<ButtonLink href="/opportunities">Browse opportunities</ButtonLink>} />
          ))}
      </div>
    </>
  );
}
