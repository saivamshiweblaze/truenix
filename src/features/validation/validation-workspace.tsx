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

/**
 * Evidence types, from guesses to proof. Only evidence that came from real people or experiments
 * (customer responses, experiment results) uses the positive emerald — never AI or assumptions.
 */
const TYPE_STYLE: Record<EvidenceType, string> = {
  assumption: "border-dashed border-line-strong text-sub",
  ai_analysis: "border-dashed border-ink text-ink",
  public_research: "border-line-strong bg-surface text-charcoal",
  expert_opinion: "border-ink bg-ink text-white",
  customer_response: "border-positive bg-positive-wash text-positive-ink",
  experiment_result: "border-positive bg-positive-wash text-positive-ink",
};
const LADDER: EvidenceType[] = ["assumption", "ai_analysis", "public_research", "expert_opinion", "customer_response", "experiment_result"];

function EvidenceBadge({ type, demo }: { type: EvidenceType; demo?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-xs border px-1.5 py-px text-micro", TYPE_STYLE[type])}>
      {evidenceLabel(type)}
      {demo && " · template"}
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
    addEvidence(ideaId, { sectionId, type: "ai_analysis", text: out, source: "TRUEVIX analysis template (no AI model connected)", demoGenerated: true });
    setDrafting(false);
    toast("Template analysis added", { body: "Labelled as AI analysis. It is not evidence." });
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
              Draft analysis from template
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
  const nextArea = VALIDATION_SECTIONS.find((v) => ws.sections[v.id].status === "in_progress") ?? VALIDATION_SECTIONS.find((v) => ws.sections[v.id].status === "not_started");

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

      <section aria-label="Validation summary" className="mb-8 grid gap-4 rounded-lg border border-line p-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 md:p-6">
        <div>
          <Stat label="Areas complete" value={`${sum.done}/${sum.total}`} note={`${sum.started - sum.done} in progress`} />
          <Progress value={(sum.done / sum.total) * 100} size="md" tone={sum.realEvidence > 0 ? "positive" : "ink"} label="Validation areas complete" className="mt-3" />
        </div>
        <div>
          <p className="text-meta text-sub">Evidence recorded, from guesses to proof</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {LADDER.map((t) => (
              <li key={t} className="flex flex-col gap-1.5 rounded-sm bg-surface p-2.5">
                <span className={cn("font-display text-[1.375rem] font-bold leading-none tabular-nums", (t === "customer_response" || t === "experiment_result") && (sum.byType[t] ?? 0) > 0 ? "text-positive-ink" : "text-ink")}>{sum.byType[t] ?? 0}</span>
                <EvidenceBadge type={t} />
              </li>
            ))}
          </ul>
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

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="mt-2 min-w-0">
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
                    <span className={cn("h-2 w-2 rounded-full", st === "done" ? "bg-positive" : st === "in_progress" ? "bg-accent" : "border border-line-strong")} aria-label={st.replace("_", " ")} />
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
      <aside aria-labelledby="outstanding" className="flex flex-col gap-6 lg:pt-4">
        <section className="rounded-md bg-surface p-4">
          <h2 id="outstanding" className="text-section font-bold">
            Outstanding work
          </h2>
          {nextArea ? (
            <button type="button" onClick={() => (setTab("workspace"), setOpen(nextArea.id))} className="mt-3 flex w-full items-center justify-between gap-3 rounded-sm bg-paper px-3 py-2.5 text-left text-ui font-medium text-ink shadow-card hover:shadow-lift">
              <span>
                <span className="block text-micro font-normal text-sub">Next area</span>
                {nextArea.label}
              </span>
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
            </button>
          ) : (
            <p className="mt-2 text-meta text-positive-ink">Every area is marked done.</p>
          )}
          <dl className="mt-4 flex flex-col gap-2 text-meta">
            <div className="flex justify-between gap-3">
              <dt className="text-sub">Areas not started</dt>
              <dd className="font-medium tabular-nums">{sum.total - sum.started}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-sub">Open questions</dt>
              <dd className="font-medium tabular-nums">{ws.openQuestions.filter((q) => !q.resolved).length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-sub">Evidence from people or experiments</dt>
              <dd className={cn("font-medium tabular-nums", sum.realEvidence > 0 && "text-positive-ink")}>{sum.realEvidence}</dd>
            </div>
          </dl>
          {sum.realEvidence === 0 && <p className="mt-3 text-micro text-mute">AI analysis and assumptions help you plan, but only responses from people and experiment results count as evidence.</p>}
        </section>
        <section>
          <h2 className="text-ui font-semibold">Status key</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-meta text-sub">
            <li className="flex items-center gap-2"><span aria-hidden className="h-2 w-2 rounded-full border border-line-strong" /> Not started</li>
            <li className="flex items-center gap-2"><span aria-hidden className="h-2 w-2 rounded-full bg-accent" /> In progress</li>
            <li className="flex items-center gap-2"><span aria-hidden className="h-2 w-2 rounded-full bg-positive" /> Done</li>
          </ul>
        </section>
      </aside>
      </div>
    </>
  );
}
