"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChoiceChip, RadioCard, SelectField, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { BulbArt } from "@/components/illustrations/art";
import { INDUSTRIES, SKILLS, STAGES, VISIBILITY } from "@/config/taxonomy";
import { saveIdea, type IdeaDraft } from "@/lib/store/actions";
import type { Idea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fieldErrors, ideaStepSchemas } from "@/lib/validation";

const STEPS = [
  { id: "basics", label: "The idea" },
  { id: "market", label: "Users and market" },
  { id: "team", label: "Research and team" },
  { id: "confirm", label: "Visibility" },
] as const;

const empty: IdeaDraft = {
  title: "",
  problem: "",
  solution: "",
  targetUsers: "",
  industry: "ai",
  geography: "",
  stage: "concept",
  existingResearch: "",
  requiredSkills: [],
  collaborationNeeds: "",
  visibility: "private",
};

export function IdeaForm({ existing }: { existing?: Idea }) {
  const [draft, setDraft] = useState<IdeaDraft>(existing ? { ...empty, ...existing } : empty);
  const [id, setId] = useState<string | undefined>(existing?.id);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ownership, setOwnership] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isEdit = existing?.status === "submitted";

  const set = <K extends keyof IdeaDraft>(k: K, v: IdeaDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const validateStep = (i: number) => {
    const sid = STEPS[i].id;
    if (sid === "basics") {
      const r = ideaStepSchemas.basics.safeParse(draft);
      return r.success ? {} : fieldErrors(r.error);
    }
    if (sid === "market") {
      const r = ideaStepSchemas.market.safeParse(draft);
      return r.success ? {} : fieldErrors(r.error);
    }
    if (sid === "confirm") {
      const r = ideaStepSchemas.confirm.safeParse({ ownership });
      return r.success ? {} : fieldErrors(r.error);
    }
    return {};
  };

  const go = (to: number) => {
    if (to > step) {
      for (let i = step; i < to; i++) {
        const e = validateStep(i);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(i);
          return;
        }
      }
    }
    setErrors({});
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveDraft = () => {
    if (draft.title.trim().length < 3) {
      setErrors({ title: "Add a working title before saving a draft." });
      setStep(0);
      return;
    }
    const newId = saveIdea(draft, { id, submit: false });
    setId(newId);
    toast(isEdit ? "Changes saved" : "Draft saved", { body: "Stored in this browser. Find it in My workspace." });
  };

  const requestSubmit = () => {
    for (let i = 0; i < STEPS.length; i++) {
      const e = validateStep(i);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(i);
        return;
      }
    }
    setConfirmOpen(true);
  };

  const submit = () => {
    const newId = saveIdea(draft, { id, submit: true });
    setId(newId);
    setConfirmOpen(false);
    setSubmitted(true);
    toast(isEdit ? "Idea updated" : "Idea submitted", { tone: "accent" });
  };

  if (submitted && id) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-xl flex-col items-start gap-5 py-10">
        <BulbArt size={64} />
        <h1 className="text-title font-semibold">{isEdit ? "Idea updated" : "Your idea is submitted"}</h1>
        <p className="text-body text-sub">
          {VISIBILITY.find((v) => v.id === draft.visibility)?.explanation} Submissions are stored in this browser during the demonstration.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/ideas/${id}`} variant="primary">
            View idea
          </ButtonLink>
          <ButtonLink href={`/research?idea=${id}`} variant="secondary">
            Research the market
          </ButtonLink>
          <ButtonLink href={`/validate/${id}`} variant="secondary">
            Start validation
          </ButtonLink>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Form steps" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-4 overflow-x-auto lg:flex-col lg:gap-1">
          {STEPS.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn("flex items-center gap-2.5 py-1.5 text-ui transition-colors", i === step ? "font-medium text-ink" : "text-sub hover:text-ink")}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-micro tabular-nums", i < step ? "border-ink bg-ink text-white" : i === step ? "border-accent text-accent-ink" : "border-line-strong text-mute")}>
                  {i < step ? <Check size={11} strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 max-w-2xl">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-5">
            {step === 0 && (
              <>
                <TextField label="Idea title" value={draft.title} onChange={(e) => set("title", e.target.value)} error={errors.title} maxLength={140} placeholder="e.g. Shared cold storage for small fruit exporters" />
                <TextArea label="Problem being solved" rows={5} value={draft.problem} onChange={(e) => set("problem", e.target.value)} error={errors.problem} maxLength={2000} hint="Who has this problem, how often, and what does it cost them today?" />
                <TextArea label="Proposed solution" rows={4} value={draft.solution} onChange={(e) => set("solution", e.target.value)} error={errors.solution} maxLength={2000} />
              </>
            )}
            {step === 1 && (
              <>
                <TextField label="Target users" value={draft.targetUsers} onChange={(e) => set("targetUsers", e.target.value)} error={errors.targetUsers} maxLength={200} placeholder="e.g. Primary-school teachers in large government classes" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField label="Industry" value={draft.industry} onChange={(e) => set("industry", e.target.value as IdeaDraft["industry"])} options={INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))} />
                  <SelectField label="Current stage" value={draft.stage} onChange={(e) => set("stage", e.target.value as IdeaDraft["stage"])} options={STAGES.map((s) => ({ value: s.id, label: `${s.label} — ${s.hint}` }))} />
                </div>
                <TextField label="Geography" value={draft.geography} onChange={(e) => set("geography", e.target.value)} error={errors.geography} maxLength={100} placeholder="Country, region, or Global" />
              </>
            )}
            {step === 2 && (
              <>
                <TextArea label="Existing research" optional rows={4} value={draft.existingResearch} onChange={(e) => set("existingResearch", e.target.value)} maxLength={2000} hint="Interviews, observations, data, prototypes. Only include what you actually did." />
                <fieldset>
                  <legend className="mb-2 text-ui font-medium text-charcoal">Skills you need</legend>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map((sk) => (
                      <ChoiceChip key={sk} selected={draft.requiredSkills.includes(sk)} onToggle={() => set("requiredSkills", draft.requiredSkills.includes(sk) ? draft.requiredSkills.filter((x) => x !== sk) : [...draft.requiredSkills, sk])}>
                        {sk}
                      </ChoiceChip>
                    ))}
                  </div>
                </fieldset>
                <TextArea label="Collaboration requirements" optional rows={3} value={draft.collaborationNeeds} onChange={(e) => set("collaborationNeeds", e.target.value)} maxLength={1000} hint="What kind of person would you like to hear from, and what can you offer them?" />
              </>
            )}
            {step === 3 && (
              <>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-ui font-medium text-charcoal">Who can see this idea?</legend>
                  {VISIBILITY.map((v) => (
                    <RadioCard key={v.id} name="visibility" value={v.id} checked={draft.visibility === v.id} onChange={(val) => set("visibility", val as IdeaDraft["visibility"])} title={v.label} description={v.explanation} />
                  ))}
                </fieldset>
                <div className="flex gap-3 border-l-2 border-accent bg-accent-wash/60 px-4 py-3.5">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
                  <div className="text-meta text-charcoal">
                    <p className="font-medium text-ink">Before you share, think about intellectual property</p>
                    <p className="mt-1">
                      Submitting an idea here does not create a patent, copyright, or any legal proof of ownership or priority. Publicly disclosing an invention can affect your ability to patent it in some countries. If that matters to you, keep the idea private and speak to a qualified advisor first.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-start gap-2.5 text-ui text-charcoal">
                    <input type="checkbox" checked={ownership} onChange={(e) => setOwnership(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" aria-invalid={!!errors.ownership} />
                    I confirm this idea is my own or my team&apos;s work, or that I have permission to share it, and I understand the note above.
                  </label>
                  {errors.ownership && (
                    <p role="alert" className="text-meta text-accent-ink">
                      {errors.ownership}
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => go(step - 1)}>
                Back
              </Button>
            )}
            <Button variant="secondary" onClick={saveDraft}>
              {isEdit ? "Save changes" : "Save draft"}
            </Button>
          </div>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => go(step + 1)}>Continue</Button>
          ) : (
            <Button variant="accent" onClick={requestSubmit}>
              {isEdit ? "Update idea" : "Submit idea"}
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={isEdit ? "Update this idea?" : "Submit this idea?"}
        description={VISIBILITY.find((v) => v.id === draft.visibility)?.explanation}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button variant="accent" onClick={submit}>
              {isEdit ? "Update idea" : "Submit idea"}
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-ui">
          <dt className="text-sub">Title</dt>
          <dd className="text-ink">{draft.title}</dd>
          <dt className="text-sub">Stage</dt>
          <dd>{STAGES.find((s) => s.id === draft.stage)?.label}</dd>
          <dt className="text-sub">Visibility</dt>
          <dd>{VISIBILITY.find((v) => v.id === draft.visibility)?.label}</dd>
        </dl>
      </Dialog>
    </div>
  );
}
