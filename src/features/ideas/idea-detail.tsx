"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, Pencil, ScanSearch, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, EmptyState, SectionHeading, StatusDot, TagList } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { JourneyLine } from "@/components/illustrations/journey-line";
import { BulbArt } from "@/components/illustrations/art";
import { industryLabel, stageLabel, VISIBILITY } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { commentCount, ideaById, personById } from "@/lib/store/selectors";
import { addIdeaUpdate, deleteIdea, expressInterest, toggleFollowIdea } from "@/lib/store/actions";
import type { IdeaStage } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CommentThread } from "@/features/shared/comments";
import { SaveIdeaButton } from "@/features/shared/rows";

const STAGE_TO_JOURNEY: Record<IdeaStage, number> = { concept: 1, research: 2, validation: 4, prototype: 5, pilot: 5, launched: 6 };

const RESEARCH_LABEL = { none: "No research yet", in_progress: "Research in progress", report_available: "Research report available" };
const VALIDATION_LABEL = { not_started: "Not started", in_progress: "Validation in progress", evidence_collected: "Customer or experiment evidence recorded" };

export function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useAppState();
  const idea = ideaById(s, id);
  const [tab, setTab] = useState<"overview" | "updates" | "discussion" | "team">("overview");
  const [interestOpen, setInterestOpen] = useState(false);
  const [note, setNote] = useState("");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [upd, setUpd] = useState({ title: "", body: "" });
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!idea) {
    return <EmptyState art={<BulbArt size={52} />} title="This idea is not available" body="It may be private, removed, or the link may be wrong." action={<ButtonLink href="/ideas">Browse ideas</ButtonLink>} />;
  }

  const owner = personById(s, idea.ownerId);
  const mine = idea.ownerId === "me";
  const following = s.following.ideas.includes(idea.id);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 text-meta text-sub">
        <Link href="/ideas" className="hover:text-ink">
          Ideas
        </Link>
        <span className="mx-2 text-mute">/</span>
        <span className="text-ink">{idea.title.split(":")[0]}</span>
      </nav>

      <header className="border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <StatusDot tone="ink" label={stageLabel(idea.stage)} />
          <span className="text-meta text-sub">{industryLabel(idea.industry)}</span>
          <span className="text-meta text-sub">{idea.geography}</span>
          {mine && <span className="text-meta text-sub">{VISIBILITY.find((v) => v.id === idea.visibility)?.label}</span>}
          {idea.status === "draft" && <span className="text-meta font-medium text-ink">Draft — not submitted</span>}
        </div>
        <h1 className="mt-3 max-w-4xl text-title font-bold">{idea.title}</h1>
        <p className="mt-3 max-w-3xl text-body text-sub">{idea.summary}</p>
        {mine && idea.review && idea.review.status !== "approved" && (
          <p role="status" className="mt-4 max-w-3xl rounded-sm bg-surface px-3 py-2 text-meta text-charcoal">
            {idea.review.status === "pending"
              ? "Waiting for platform review. Until it is approved, other members can’t see this idea in Ideas or Discover."
              : idea.review.status === "changes_requested"
                ? `The platform team asked for changes before listing this idea${idea.review.note ? `: ${idea.review.note}` : "."}`
                : `This idea wasn’t approved for listing${idea.review.note ? `: ${idea.review.note}` : "."} It stays visible to you and your team.`}
          </p>
        )}
        {mine && (idea.publication === "unpublished" || idea.publication === "archived") && (
          <p role="status" className="mt-2 max-w-3xl rounded-sm bg-surface px-3 py-2 text-meta text-charcoal">
            The platform team has {idea.publication} this idea, so other members can’t see it. Contact support if you think this is a mistake.
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {mine ? (
            <>
              <ButtonLink href={`/ideas/${idea.id}/edit`} variant="primary">
                <Pencil size={15} aria-hidden /> Edit idea
              </ButtonLink>
              <Button variant="secondary" onClick={() => setUpdateOpen(true)}>
                Post an update
              </Button>
              {idea.status === "draft" && (
                <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={15} aria-hidden /> Delete draft
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="accent" onClick={() => setInterestOpen(true)}>
                I want to collaborate
              </Button>
              <Button
                variant="secondary"
                aria-pressed={following}
                onClick={() => {
                  toggleFollowIdea(idea.id);
                  toast(following ? "Stopped following project" : "Following project", { body: following ? undefined : "Updates will appear in your Following feed." });
                }}
              >
                {following ? "Following" : "Follow project"}
              </Button>
            </>
          )}
          <SaveIdeaButton id={idea.id} withLabel />
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <ButtonLink href={`/research?idea=${idea.id}`} variant="ghost" size="md">
            <ScanSearch size={15} aria-hidden /> Research
          </ButtonLink>
          {mine && (
            <ButtonLink href={`/validate/${idea.id}`} variant="ghost" size="md">
              <FlaskConical size={15} aria-hidden /> Validate
            </ButtonLink>
          )}
        </div>
        <JourneyLine current={STAGE_TO_JOURNEY[idea.stage]} className="mt-10 max-w-3xl" />
      </header>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <Tabs
            label="Idea sections"
            value={tab}
            onChange={setTab}
            items={[
              { value: "overview", label: "Overview" },
              { value: "updates", label: "Updates", count: idea.updates.length },
              { value: "discussion", label: "Discussion", count: commentCount(s, idea.id) },
              { value: "team", label: "Team", count: idea.team.length },
            ]}
          />
          <div className="pt-6">
            {tab === "overview" && (
              <div className="flex max-w-[70ch] flex-col gap-8">
                <Block title="Problem">{idea.problem}</Block>
                <Block title="Proposed solution">{idea.solution}</Block>
                <Block title="Target audience">{idea.targetUsers}</Block>
                {idea.existingResearch && <Block title="Existing research">{idea.existingResearch}</Block>}
                {idea.collaborationNeeds && <Block title="Collaboration requirements">{idea.collaborationNeeds}</Block>}
              </div>
            )}
            {tab === "updates" &&
              (idea.updates.length ? (
                <ol className="flex max-w-[70ch] flex-col">
                  {idea.updates.map((u) => (
                    <li key={u.id} className="relative border-l border-line pb-8 pl-6 last:pb-0">
                      <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-ink" aria-hidden />
                      <p className="text-micro text-mute">{formatDate(u.date)}</p>
                      <h3 className="mt-1 text-ui font-semibold">{u.title}</h3>
                      <p className="mt-1 text-ui text-charcoal">{u.body}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="No updates yet" body={mine ? "Post progress so followers know what changed." : "Follow the project to see updates when they are posted."} action={mine ? <Button onClick={() => setUpdateOpen(true)}>Post an update</Button> : undefined} />
              ))}
            {tab === "discussion" && (
              <div className="max-w-[70ch]">
                <CommentThread targetId={idea.id} placeholder="Ask a question or share a relevant experience" />
              </div>
            )}
            {tab === "team" && (
              <ul className="flex max-w-xl flex-col">
                {idea.team.map((m) => {
                  const p = personById(s, m.personId);
                  return (
                    <li key={m.personId} className="flex items-center gap-3 border-b border-line py-3">
                      <Avatar name={p?.name ?? "Member"} size={36} />
                      <div className="flex-1">
                        <Link href={m.personId === "me" ? "/profile" : `/people/${m.personId}`} className="text-ui font-medium hover:underline">
                          {p?.name}
                        </Link>
                        <p className="text-meta text-sub">{m.role}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-8">
          <section>
            <SectionHeading title={mine ? "Owner" : "Founder"} />
            <div className="flex items-start gap-3">
              <Avatar name={owner?.name ?? "Member"} size={40} />
              <div>
                <Link href={mine ? "/profile" : `/people/${idea.ownerId}`} className="text-ui font-medium hover:underline">
                  {owner?.name}
                </Link>
                <p className="text-meta text-sub">{owner?.headline}</p>
              </div>
            </div>
          </section>
          <section>
            <SectionHeading title="Status" />
            <dl className="flex flex-col gap-3 text-ui">
              <div>
                <dt className="text-meta text-sub">Research</dt>
                <dd>{RESEARCH_LABEL[idea.researchStatus]}</dd>
              </div>
              <div>
                <dt className="text-meta text-sub">Validation</dt>
                <dd>{VALIDATION_LABEL[idea.validationStatus]}</dd>
              </div>
              <div>
                <dt className="text-meta text-sub">Last updated</dt>
                <dd>{formatDate(idea.updatedAt)}</dd>
              </div>
            </dl>
          </section>
          {idea.requiredSkills.length > 0 && (
            <section>
              <SectionHeading title="Skills needed" />
              <TagList items={idea.requiredSkills} />
            </section>
          )}
        </aside>
      </div>

      <Dialog
        open={interestOpen}
        onClose={() => setInterestOpen(false)}
        title="Express collaboration interest"
        description={`Your note goes to ${owner?.name}'s inbox. Seeded profiles are fictional and will not reply.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInterestOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={note.trim().length < 10}
              onClick={() => {
                const t = expressInterest(idea.id, idea.ownerId, idea.title.split(":")[0], note);
                setInterestOpen(false);
                setNote("");
                toast("Interest sent", { body: "The conversation is in Messages.", tone: "accent" });
                router.push(`/messages?thread=${t}`);
              }}
            >
              Send
            </Button>
          </>
        }
      >
        <TextArea label="What can you contribute?" rows={5} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} hint="Mention relevant skills and how much time you can give. At least 10 characters." />
      </Dialog>

      <Dialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        title="Post a project update"
        footer={
          <>
            <Button variant="ghost" onClick={() => setUpdateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!upd.title.trim() || !upd.body.trim()}
              onClick={() => {
                addIdeaUpdate(idea.id, upd.title, upd.body);
                setUpd({ title: "", body: "" });
                setUpdateOpen(false);
                setTab("updates");
                toast("Update posted");
              }}
            >
              Post update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Headline" value={upd.title} onChange={(e) => setUpd({ ...upd, title: e.target.value })} maxLength={120} />
          <TextArea label="What changed?" rows={4} value={upd.body} onChange={(e) => setUpd({ ...upd, body: e.target.value })} maxLength={1200} />
        </div>
      </Dialog>

      <Dialog
        open={deleteOpen}
        size="sm"
        onClose={() => setDeleteOpen(false)}
        title="Delete this draft?"
        description="This removes the draft from this browser. It cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Keep draft
            </Button>
            <Button
              onClick={() => {
                deleteIdea(idea.id);
                toast("Draft deleted");
                router.push("/ideas");
              }}
            >
              Delete draft
            </Button>
          </>
        }
      />
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-ui font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 whitespace-pre-line text-body text-charcoal">{children}</p>
    </section>
  );
}
