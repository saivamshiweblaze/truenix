"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineSelect, TextArea } from "@/components/ui/field";
import { EmptyState, PageHeader, Progress, SectionHeading, Stat } from "@/components/ui/primitives";
import { Accordion, Segmented, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { FlaskArt } from "@/components/illustrations/art";
import { EVIDENCE_TYPES, evidenceLabel, VALIDATION_SECTIONS } from "@/config/taxonomy";
import { addEvidence, addOpenQuestion, ensureValidation, removeEvidence, setSectionNotes, setSectionStatus, toggleOpenQuestion } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { AI_ALLOWED, allowedEvidence, analysisProvider, summarise } from "@/lib/services/validation";
import type { EvidenceItem, EvidenceType, SectionStatus, ValidationSectionId } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const TYPE_STYLE: Record<EvidenceType, string> = {
  assumption: "border-dashed border-line-strong text-sub",
  ai_analysis: "border-line-strong text-sub",
  public_research: "border-charcoal text-charcoal",
  expert_opinion: "border-ink text-ink",
  customer_response: "border-ink bg-ink text-white",
  experiment_result: "border-ink bg-ink text-white",
};

function EvidenceBadge({ type, demo }: { type: EvidenceType; demo?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-xs border px-1.5 py-px text-micro", TYPE_STYLE[type])}>
      {evidenceLabel(type)}
      {demo && " · demo"}
    </span>
  );
}

function EvidenceList({ items, ideaId }: { items: EvidenceItem[]; ideaId: string }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-col">
      {items.map((e) => (
        <li key={e.id} className="flex gap-3 border-t border-line py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <EvidenceBadge type={e.type} demo={e.demoGenerated} />
              {e.source && <span className="text-micro text-mute">{e.source}</span>}
              <span className="text-micro text-mute">{formatDate(e.createdAt)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-ui text-charcoal">{e.text}</p>
          </div>
          <button type="button" aria-label="Remove evidence" onClick={() => removeEvidence(ideaId, e.id)} className="h-8 w-8 shrink-0 rounded-sm text-mute hover:bg-surface hover:text-ink">
            <Trash2 size={14} className="mx-auto" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function SectionPanel({ ideaId, sectionId }: { ideaId: string; sectionId: ValidationSectionId }) {
  const s = useAppState();
  const idea = s.ideas.find((i) => i.id === ideaId)!;
  const ws = s.validations[ideaId];
  const sec = ws.sections[sectionId];
  const meta = VALIDATION_SECTIONS.find((v) => v.id === sectionId)!;
  const types = allowedEvidence(sectionId);
  const [notes, setNotes] = useState(sec.notes);
  const [type, setType] = useState<EvidenceType>(types[0]);
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [drafting, setDrafting] = useState(false);
  const items = ws.evidence.filter((e) => e.sectionId === sectionId);
  const needsSource = type === "customer_response" || type === "expert_opinion" || type === "public_research" || type === "experiment_result";

  const add = () => {
    if (text.trim().length < 5) return toast("Write at least a few words of evidence");
    if (needsSource && !source.trim()) return toast("Add who or where this came from", { body: "Real evidence needs a source, e.g. ‘Interview, ward nurse, 3 Nov’." });
    addEvidence(ideaId, { sectionId, type, text, source, demoGenerated: false });
    setText("");
    setSource("");
    toast(`${evidenceLabel(type)} recorded`);
  };

  const draftAi = async () => {
    setDrafting(true);
    const out = await analysisProvider.draft(idea, sectionId);
    addEvidence(ideaId, { sectionId, type: "ai_analysis", text: out, source: "Demo analysis provider (no AI model connected)", demoGenerated: true });
    setDrafting(false);
    toast("Demo analysis added", { body: "Labelled as AI analysis. It is not evidence." });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-ui text-sub">{meta.prompt}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-meta text-sub">Status</span>
        <Segmented<SectionStatus>
          label={`${meta.label} status`}
          value={sec.status}
          onChange={(v) => setSectionStatus(ideaId, sectionId, v)}
          items={[
            { value: "not_started", label: "Not started" },
            { value: "in_progress", label: "In progress" },
            { value: "done", label: "Done" },
          ]}
        />
      </div>
      <TextArea
        label="Working notes"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== sec.notes && (setSectionNotes(ideaId, sectionId, notes), toast("Notes saved"))}
        hint="Saved when you leave the field."
      />
      <EvidenceList items={items} ideaId={ideaId} />
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <p className="text-ui font-medium">Record evidence</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <InlineSelect aria-label="Evidence type" value={type} onChange={(e) => setType(e.target.value as EvidenceType)} options={types.map((t) => ({ value: t, label: evidenceLabel(t) }))} />
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            maxLength={200}
            aria-label="Source"
            placeholder={needsSource ? "Source — who or where (required)" : "Source (optional)"}
            className="h-9 flex-1 rounded-sm border border-line-strong px-3 text-meta focus:border-ink focus:outline-none"
          />
        </div>
        <p className="text-micro text-mute">{EVIDENCE_TYPES.find((t) => t.id === type)?.explanation}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          aria-label="Evidence"
          placeholder={type === "customer_response" ? "What did they say or do? Quote them where you can." : "Describe the evidence"}
          className="rounded-sm border border-line-strong px-3 py-2 text-ui focus:border-ink focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={add}>
            Add evidence
          </Button>
          {AI_ALLOWED.includes(sectionId) && (
            <Button size="sm" variant="ghost" onClick={draftAi} disabled={drafting}>
              {drafting ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />}
              Draft AI analysis (demo)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ValidationWorkspaceView() {
  const { id } = useParams<{ id: string }>();
  const s = useAppState();
  const idea = s.ideas.find((i) => i.id === id);
  const ws = s.validations[id];
  const [open, setOpen] = useState<ValidationSectionId | null>("problem");
  const [tab, setTab] = useState<"workspace" | "evidence" | "questions" | "report">("workspace");
  const [question, setQuestion] = useState("");

  useEffect(() => {
    if (idea) ensureValidation(idea.id);
  }, [idea]);

  if (!idea) {
    return (
      <EmptyState
        art={<FlaskArt size={52} />}
        title="You can validate only your own ideas"
        body="Choose one of your ideas, or create a new private draft to validate."
        action={<ButtonLink href="/validate">Open Validate my idea</ButtonLink>}
      />
    );
  }
  if (!ws) return null;
  const sum = summarise(ws);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 text-meta text-sub">
        <Link href="/validate" className="hover:text-ink">
          Validate my idea
        </Link>
        <span className="mx-2 text-mute">/</span>
        <span className="text-ink">{idea.title.split(":")[0] || "Untitled"}</span>
      </nav>
      <PageHeader
        title={idea.title.split(":")[0] || "Untitled"}
        description="Progress reflects areas you marked done. It is a record of your work, not a measure of product–market fit."
        actions={
          <>
            <ButtonLink href={`/research?idea=${idea.id}`} variant="secondary">
              Research this idea
            </ButtonLink>
            <ButtonLink href={`/ideas/${idea.id}`} variant="ghost">
              View idea
            </ButtonLink>
          </>
        }
      />

      <section aria-label="Validation summary" className="mb-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Areas complete" value={`${sum.done}/${sum.total}`} />
        <Stat label="Customer responses" value={sum.byType.customer_response ?? 0} note="Recorded by you" />
        <Stat label="Expert opinions" value={sum.byType.expert_opinion ?? 0} />
        <Stat label="Experiment results" value={sum.byType.experiment_result ?? 0} />
        <div className="col-span-2 md:col-span-4">
          <Progress value={(sum.done / sum.total) * 100} label="Validation areas complete" />
        </div>
      </section>

      <Tabs
        label="Validation views"
        value={tab}
        onChange={setTab}
        items={[
          { value: "workspace", label: "Areas" },
          { value: "evidence", label: "All evidence", count: ws.evidence.length },
          { value: "questions", label: "Open questions", count: ws.openQuestions.filter((q) => !q.resolved).length },
          { value: "report", label: "Final report" },
        ]}
      />

      <div className="mt-2 max-w-3xl">
        {tab === "workspace" &&
          VALIDATION_SECTIONS.map((v, i) => {
            const st = ws.sections[v.id].status;
            const n = ws.evidence.filter((e) => e.sectionId === v.id).length;
            return (
              <Accordion
                key={v.id}
                open={open === v.id}
                onToggle={() => setOpen(open === v.id ? null : v.id)}
                title={
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-meta text-mute tabular-nums">{i + 1}</span>
                    {v.label}
                  </span>
                }
                meta={
                  <span className="flex items-center gap-3 text-meta text-sub">
                    {n > 0 && <span className="tabular-nums">{n} item{n === 1 ? "" : "s"}</span>}
                    <span className={cn("h-2 w-2 rounded-full", st === "done" ? "bg-ink" : st === "in_progress" ? "bg-accent" : "border border-line-strong")} aria-label={st.replace("_", " ")} />
                  </span>
                }
              >
                <SectionPanel ideaId={idea.id} sectionId={v.id} />
              </Accordion>
            );
          })}

        {tab === "evidence" &&
          (ws.evidence.length ? (
            <div className="pt-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {EVIDENCE_TYPES.map((t) => (
                  <span key={t.id} className="flex items-center gap-1.5 text-micro text-sub">
                    <EvidenceBadge type={t.id} /> {sum.byType[t.id] ?? 0}
                  </span>
                ))}
              </div>
              <EvidenceList items={ws.evidence} ideaId={idea.id} />
            </div>
          ) : (
            <div className="pt-6">
              <EmptyState title="No evidence recorded yet" body="Open an area, then record what you learned and where it came from." />
            </div>
          ))}

        {tab === "questions" && (
          <div className="flex flex-col gap-4 pt-6">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addOpenQuestion(idea.id, question);
                setQuestion("");
              }}
            >
              <label htmlFor="oq" className="sr-only">
                New open question
              </label>
              <input id="oq" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} placeholder="What do you still need to find out?" className="h-10 flex-1 rounded-sm border border-line-strong px-3 text-ui focus:border-ink focus:outline-none" />
              <Button type="submit" disabled={!question.trim()}>
                Add
              </Button>
            </form>
            <ul>
              {ws.openQuestions.map((q) => (
                <li key={q.id} className="border-b border-line py-3">
                  <label className="flex items-start gap-3 text-ui">
                    <input type="checkbox" checked={q.resolved} onChange={() => toggleOpenQuestion(idea.id, q.id)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                    <span className={q.resolved ? "text-mute line-through" : "text-ink"}>{q.text}</span>
                  </label>
                </li>
              ))}
            </ul>
            {!ws.openQuestions.length && <p className="text-meta text-sub">List the questions you cannot answer yet. Tick them off as you learn.</p>}
          </div>
        )}

        {tab === "report" && (
          <article className="flex flex-col gap-8 pt-6">
            <div className="border-l-2 border-ink bg-surface px-4 py-3 text-meta text-charcoal">
              This report only restates what you recorded. It does not score the idea or predict success. Items marked as AI analysis or assumption are not evidence.
            </div>
            <section>
              <SectionHeading title="Summary" />
              <p className="text-body text-charcoal">
                {sum.done} of {sum.total} areas marked done. {sum.realEvidence} pieces of evidence came from people or experiments (customer responses, expert opinions, experiment results).{" "}
                {(sum.byType.ai_analysis ?? 0) + (sum.byType.assumption ?? 0)} items are AI analysis or untested assumptions.
              </p>
            </section>
            {VALIDATION_SECTIONS.map((v) => {
              const items = ws.evidence.filter((e) => e.sectionId === v.id);
              const notes = ws.sections[v.id].notes;
              if (!items.length && !notes) return null;
              return (
                <section key={v.id}>
                  <h3 className="text-ui font-semibold">{v.label}</h3>
                  {notes && <p className="mt-1 text-ui text-sub">{notes}</p>}
                  <ul className="mt-2 flex flex-col gap-2">
                    {items.map((e) => (
                      <li key={e.id} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                        <span className="shrink-0">
                          <EvidenceBadge type={e.type} demo={e.demoGenerated} />
                        </span>
                        <span className="text-ui text-charcoal">{e.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {ws.openQuestions.some((q) => !q.resolved) && (
              <section>
                <h3 className="text-ui font-semibold">Unresolved questions</h3>
                <ul className="mt-2 list-inside list-disc text-ui text-charcoal">
                  {ws.openQuestions.filter((q) => !q.resolved).map((q) => (
                    <li key={q.id}>{q.text}</li>
                  ))}
                </ul>
              </section>
            )}
            <div>
              <Button variant="secondary" onClick={() => window.print()}>
                Print or save as PDF
              </Button>
            </div>
          </article>
        )}
      </div>
    </>
  );
}
