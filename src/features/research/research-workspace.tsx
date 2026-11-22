"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, SelectField } from "@/components/ui/field";
import { EmptyState, PageHeader, SectionHeading } from "@/components/ui/primitives";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { LensArt } from "@/components/illustrations/art";
import { RESEARCH_CATEGORIES } from "@/config/taxonomy";
import { RESEARCH_STEPS, researchProvider } from "@/lib/services/research";
import { storeResearch } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { ideaById, visibleIdeas } from "@/lib/store/selectors";
import type { ResearchCategory, ResearchDepth, ResearchReport } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { ReportView } from "./report-view";

const EXAMPLES = [
  "Who buys leak-detection software at a mid-sized water utility?",
  "What do small clinics currently do about phishing?",
  "How are smallholder farmers assessed for credit today?",
];

export function ResearchWorkspace() {
  const s = useAppState();
  const params = useSearchParams();
  // Prefill from ?idea= on first render.
  const [initial] = useState(() => {
    const pre = params.get("idea");
    const idea = pre ? ideaById(s, pre) : undefined;
    return idea ? { id: idea.id, q: `What does the market look like for ${idea.title.split(":")[0]}?` } : { id: "", q: "" };
  });
  const [question, setQuestion] = useState(initial.q);
  const [ideaId, setIdeaId] = useState<string>(initial.id);
  const [categories, setCategories] = useState<ResearchCategory[]>(["market", "competitor", "customer"]);
  const [depth, setDepth] = useState<ResearchDepth>("standard");
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [current, setCurrent] = useState<ResearchReport | null>(null);
  const [historyView, setHistoryView] = useState<"all" | "saved">("all");
  const [error, setError] = useState<string>();
  const abort = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const ideaOptions = useMemo(() => {
    const mine = s.ideas;
    const followed = visibleIdeas(s).filter((i) => i.ownerId !== "me" && (s.saved.ideas.includes(i.id) || s.following.ideas.includes(i.id)));
    return [...mine, ...followed];
  }, [s]);

  useEffect(() => () => abort.current?.abort(), []);

  // Keep the displayed report in sync with saved state.
  const shown = current ? (s.research.find((r) => r.id === current.id) ?? current) : null;

  const run = async () => {
    if (question.trim().length < 10) {
      setError("Write a research question of at least 10 characters.");
      return;
    }
    if (!categories.length) {
      setError("Choose at least one research category.");
      return;
    }
    setError(undefined);
    setRunning(true);
    setCurrent(null);
    abort.current = new AbortController();
    try {
      const idea = ideaId ? (ideaById(s, ideaId) ?? null) : null;
      const report = await researchProvider.run({ question, idea, categories, depth }, setStepIdx, abort.current.signal);
      storeResearch(report);
      setCurrent(report);
      toast("Research plan ready", { body: "Added to your research history." });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("The research run failed. Try again.");
    } finally {
      setRunning(false);
      setStepIdx(-1);
    }
  };

  const cancel = () => {
    abort.current?.abort();
    toast("Research cancelled");
  };

  const history = s.research.filter((r) => historyView === "all" || r.saved);

  return (
    <>
      <PageHeader title="AI Researcher" description="Plan structured research on a market, competitors or customers, and keep every report linked to the idea it supports.">
        <p className="mt-3 inline-flex items-center gap-2 text-meta text-sub">
          <span className="h-1.5 w-1.5 rounded-full bg-line-strong" aria-hidden /> Live AI and web sources aren’t connected yet — reports are structured research plans built from templates.
        </p>
      </PageHeader>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section aria-labelledby="new-research" className="flex flex-col gap-6 rounded-lg border border-line-strong p-5 md:p-7">
            <h2 id="new-research" className="sr-only">
              New research
            </h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rq" className="text-section font-bold text-ink">
                Research question
              </label>
              <p className="-mt-1 text-meta text-sub">One clear question gives a better plan than several broad ones.</p>
              <textarea
                id="rq"
                rows={3}
                value={question}
                maxLength={400}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What do you need to know?"
                aria-invalid={!!error && question.trim().length < 10}
                className="mt-1 resize-none rounded-md border border-line-strong bg-paper px-4 py-3.5 font-display text-[1.25rem] font-semibold leading-snug tracking-tight placeholder:font-normal placeholder:text-mute focus:border-ink focus:outline-none md:text-[1.375rem]"
              />
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-micro text-mute">Try</span>
                {EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => setQuestion(ex)} className="rounded-full border border-line px-3 py-1 text-left text-meta text-sub transition-colors hover:border-ink hover:text-ink">
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <SelectField
                label="Link to an idea"
                value={ideaId}
                onChange={(e) => setIdeaId(e.target.value)}
                options={[{ value: "", label: "No idea — general research" }, ...ideaOptions.map((i) => ({ value: i.id, label: `${i.title.split(":")[0]}${i.ownerId === "me" ? " (yours)" : ""}` }))]}
                hint={ideaOptions.length ? undefined : "Submit, save or follow an idea to link research to it."}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-ui font-medium text-charcoal">Depth</span>
                <Segmented
                  label="Research depth"
                  value={depth}
                  onChange={setDepth}
                  items={[
                    { value: "scan", label: "Quick scan" },
                    { value: "standard", label: "Standard" },
                    { value: "deep", label: "Deep dive" },
                  ]}
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-ui font-medium text-charcoal">Focus areas</legend>
              <div className="flex flex-wrap gap-2">
                {RESEARCH_CATEGORIES.map((c) => (
                  <ChoiceChip key={c.id} selected={categories.includes(c.id)} onToggle={() => setCategories((l) => (l.includes(c.id) ? l.filter((x) => x !== c.id) : [...l, c.id]))}>
                    {c.label}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="text-meta text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Button variant="accent" size="lg" onClick={run} disabled={running}>
                {running ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden /> Running
                  </>
                ) : (
                  "Run research"
                )}
              </Button>
              {running && (
                <Button variant="ghost" size="lg" onClick={cancel}>
                  Cancel
                </Button>
              )}
              {!running && (
                <span className="text-meta text-sub">
                  {depth === "scan" ? "Quick scan" : depth === "deep" ? "Deep dive" : "Standard depth"} · {categories.length || "No"} focus area{categories.length === 1 ? "" : "s"}
                  {ideaId ? " · linked to an idea" : ""}
                </span>
              )}
            </div>
          </section>

          <AnimatePresence>
            {running && (
              <motion.section
                aria-live="polite"
                aria-label="Research progress"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <ol className="mt-8 flex flex-col gap-2.5 border-l border-line pl-5">
                  {RESEARCH_STEPS.map((step, i) => (
                    <li key={step} className={cn("flex items-center gap-3 text-ui transition-colors", i < stepIdx ? "text-sub" : i === stepIdx ? "font-medium text-ink" : "text-mute")}>
                      <span className="flex h-4 w-4 items-center justify-center">
                        {i < stepIdx ? <Check size={14} aria-hidden /> : i === stepIdx ? <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-line-strong" aria-hidden />}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </motion.section>
            )}
          </AnimatePresence>

          <div ref={resultRef} className="scroll-mt-20">
            {shown && !running && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-12 border-t border-line pt-10">
                <ReportView report={shown} />
              </motion.div>
            )}
          </div>
        </div>

        <aside aria-labelledby="history" className="xl:pt-1">
          <SectionHeading title="Research history" id="history" />
          <Tabs
            label="History filter"
            value={historyView}
            onChange={setHistoryView}
            items={[
              { value: "all", label: "All", count: s.research.length },
              { value: "saved", label: "Saved", count: s.research.filter((r) => r.saved).length },
            ]}
          />
          {history.length ? (
            <ul className="mt-2">
              {history.map((r) => (
                <li key={r.id} className="border-b border-line py-3">
                  <Link href={`/research/${r.id}`} className="line-clamp-2 text-ui font-medium text-ink hover:underline">
                    {r.question}
                  </Link>
                  <p className="mt-0.5 text-micro text-mute">
                    {timeAgo(r.createdAt)} · {r.provenance === "demo" ? "Research plan" : "Report"}{r.saved ? " · Saved" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-start gap-3">
              <LensArt size={48} />
              <p className="text-meta text-sub">{historyView === "saved" ? "Saved reports appear here." : "Your research runs appear here."}</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export function EmptyReport() {
  return <EmptyState art={<LensArt size={52} />} title="Report not found" body="It may have been deleted from this browser." />;
}
