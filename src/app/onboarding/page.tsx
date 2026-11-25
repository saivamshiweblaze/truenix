"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup, FieldGroup, RadioCard, SelectField, TextArea, TextField } from "@/components/ui/field";
import { FileUpload } from "@/components/ui/file-upload";
import { Progress } from "@/components/ui/primitives";
import { Logo } from "@/components/shell/logo";
import { SessionGate } from "@/components/shell/session-gate";
import { BlueprintArt, BulbArt, CollabArt, CompassArt, FlaskArt, FounderArt, NetworkArt, PathArt } from "@/components/illustrations/art";
import { JourneyLine } from "@/components/illustrations/journey-line";
import { completeOnboarding } from "@/lib/store/actions";
import { toast } from "@/components/ui/toast";
import { getTransientFile, removeTransientFile } from "@/lib/store/transient-files";
import { uploadFile } from "@/lib/data/files";
import { reloadAppData } from "@/lib/data/session";
import { useAppState } from "@/lib/store/store";
import { phoneVerification } from "@/lib/services/phone-verification";
import { fieldErrors, phoneSchema } from "@/lib/validation";
import type { FileMeta, OnboardingRole } from "@/lib/types";
import { displayValue, flowFor, initialValues, isOptional, isVisible, onboardingRoleFor, optionsOf, pruneValues, ROLE_FLOWS, stepSchema, toUserPatch, type FieldDef, type StepDef, type Values } from "@/features/onboarding/config";
import { cn } from "@/lib/utils";

const ROLE_ART: Record<OnboardingRole, ReactNode> = {
  student: <BulbArt size={44} />,
  founder: <FounderArt size={44} />,
  professional: <BlueprintArt size={44} />,
  expert_mentor: <PathArt size={44} />,
  participant: <FlaskArt size={44} />,
  institution: <NetworkArt size={44} />,
};

const EASE = [0.22, 1, 0.36, 1] as const;

function Onboarding() {
  const router = useRouter();
  const user = useAppState().user!;
  const reduce = useReducedMotion();
  const [role, setRole] = useState<OnboardingRole>(user.profileKind ?? onboardingRoleFor(user.role));
  const [values, setValues] = useState<Values>(() => initialValues(user));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [done, setDone] = useState(false);

  const flow = flowFor(role);
  // Step 0 = role, 1..n = flow steps, n+1 = review.
  const total = flow.steps.length + 2;
  const reviewIdx = total - 1;
  const current: StepDef | undefined = step > 0 && step < reviewIdx ? flow.steps[step - 1] : undefined;
  const labels = ["Role", ...flow.steps.map((s) => s.title), "Review"];

  const set = (id: string, v: Values[string]) => {
    // Clear answers that no longer apply (e.g. year of study after choosing "Graduated").
    setValues((prev) => pruneValues(role, { ...prev, [id]: v }));
    setErrors((e) => (e[id] ? { ...e, [id]: "" } : e));
  };

  const focusFirstError = () =>
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>("main [aria-invalid='true']");
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }, 30);

  const validate = (st: StepDef) => {
    const parsed = stepSchema(st, values).safeParse(values);
    if (parsed.success) return true;
    setErrors(fieldErrors(parsed.error));
    focusFirstError();
    return false;
  };

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const next = () => {
    if (current && !validate(current)) return;
    setErrors({});
    if (step === reviewIdx) {
      // Re-validate everything in case a field was edited out of order.
      for (let i = 0; i < flow.steps.length; i++) {
        if (!stepSchema(flow.steps[i], values).safeParse(values).success) {
          go(i + 1);
          setTimeout(() => validate(flow.steps[i]), 0);
          return;
        }
      }
      const patch = toUserPatch(role, values, user);
      setDone(true);
      void finishOnboarding(patch);
      return;
    }
    go(step + 1);
  };

  if (done) return <Done role={role} values={values} firstName={String(values.fullName ?? user.name).split(" ")[0]} onGo={(href) => router.push(href)} />;

  return (
    <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
      {/* Step rail */}
      <aside className="hidden lg:block">
        <div className="sticky top-8">
          <div className="mb-6">{ROLE_ART[role]}</div>
          <p className="eyebrow">Profile setup</p>
          <ol className="mt-4 flex flex-col gap-0.5">
            {labels.map((l, i) => (
              <li key={l + i}>
                <button
                  type="button"
                  disabled={i >= step}
                  onClick={() => go(i)}
                  className={cn("flex w-full items-center gap-3 rounded-sm py-1.5 text-left text-ui transition-colors", i === step ? "font-medium text-ink" : i < step ? "text-charcoal hover:text-ink" : "text-mute")}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[0.625rem]",
                      i < step ? "border-ink bg-ink text-white" : i === step ? "border-accent bg-paper text-accent-text ring-2 ring-accent-wash" : "border-line-strong",
                    )}
                  >
                    {i < step ? <Check size={11} strokeWidth={3} aria-hidden /> : i + 1}
                  </span>
                  {l}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <div className="min-w-0 max-w-2xl">
        <div className="mb-8 flex flex-col gap-3">
          <div className="flex items-center justify-between text-meta text-sub">
            <span className="font-mono text-micro uppercase tracking-[0.06em]">
              Step {step + 1} of {total} · {labels[step]}
            </span>
            {step > 0 && (
              <button type="button" onClick={() => go(step - 1)} className="inline-flex items-center gap-1 hover:text-ink">
                <ArrowLeft size={14} aria-hidden /> Back
              </button>
            )}
          </div>
          <Progress value={((step + 1) / total) * 100} label="Profile setup progress" />
        </div>

        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={`${role}-${step}`}
            initial={reduce ? false : { opacity: 0, x: dir * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: dir * -20 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex flex-col gap-6"
            aria-labelledby="step-title"
          >
            {step === 0 && (
              <>
                <StepTitle title="Which best describes you?" body="Your profile asks for what matters to your role. You can update it later in your profile." />
                <div className="grid gap-2 sm:grid-cols-2">
                  {ROLE_FLOWS.map((f) => (
                    <RadioCard key={f.id} name="role" value={f.id} checked={role === f.id} onChange={(v) => setRole(v as OnboardingRole)} title={f.label} description={f.description} />
                  ))}
                </div>
              </>
            )}

            {current && (
              <>
                <StepTitle title={current.title} body={current.body} />
                <div className={cn("grid gap-x-5 gap-y-6", current.grid && "sm:grid-cols-2")}>
                  {current.fields
                    .filter((f) => isVisible(f, values))
                    .map((f) => (
                      <motion.div
                        key={f.id}
                        initial={reduce || !f.showIf ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className={cn(current.grid && (f.wide || f.kind === "chips" || f.kind === "textarea" || f.kind === "choice") && "sm:col-span-2")}
                      >
                        <Field field={f} values={values} value={values[f.id]} error={errors[f.id]} onChange={(v) => set(f.id, v)} />
                      </motion.div>
                    ))}
                </div>
              </>
            )}

            {step === reviewIdx && (
              <>
                <StepTitle title="Review your profile" body="Check your details before you finish. Select Edit to change a section." />
                <div className="flex flex-col gap-4">
                  {flow.steps.map((st, i) => (
                    <section key={st.id} className="rounded-md border border-line p-4 sm:p-5" aria-labelledby={`review-${st.id}`}>
                      <div className="flex items-center justify-between gap-3">
                        <h2 id={`review-${st.id}`} className="text-ui font-bold">
                          {st.title}
                        </h2>
                        <button type="button" onClick={() => go(i + 1)} className="inline-flex items-center gap-1.5 text-meta text-sub hover:text-ink" aria-label={`Edit ${st.title}`}>
                          <Pencil size={13} aria-hidden /> Edit
                        </button>
                      </div>
                      <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-[180px_minmax(0,1fr)]">
                        {st.fields
                          .filter((f) => isVisible(f, values))
                          .map((f) => (
                          <div key={f.id} className="contents">
                            <dt className="text-meta text-sub">{f.label}</dt>
                            <dd className="break-words text-ui text-ink">
                              {displayValue(f, values[f.id], values)}
                              {f.kind === "phone" && values.phone ? <span className="ml-2 text-meta text-mute">· unverified</span> : null}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>

        <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
          <span className="text-meta text-mute">Profile details are saved to your account when you finish.</span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {current && current.fields.every((f) => !isVisible(f, values) || isOptional(f, values)) && current.fields.some((f) => f.kind === "chips") && (
              <Button variant="ghost" size="lg" onClick={next}>
                Skip for now
              </Button>
            )}
            <Button variant={step === reviewIdx ? "accent" : "primary"} size="lg" onClick={next}>
              {step === reviewIdx ? "Complete profile" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ field: f, values, value, error, onChange }: { field: FieldDef; values: Values; value: Values[string]; error?: string; onChange: (v: Values[string]) => void }) {
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];
  const optional = isOptional(f, values);
  const options = optionsOf(f, values);
  switch (f.kind) {
    case "name":
      return <TextField label={f.label} hint={f.hint} autoComplete="name" value={text} onChange={(e) => onChange(e.target.value)} error={error} maxLength={80} />;
    case "email":
      return <TextField label={f.label} hint={f.hint ?? "Used to sign in. Confirmation will be requested once email delivery is connected."} type="email" autoComplete="email" value={text} onChange={(e) => onChange(e.target.value)} error={error} maxLength={160} />;
    case "phone":
      return <PhoneField label={f.label} hint={f.hint} value={text} error={error} onChange={onChange} />;
    case "linkedin":
    case "url":
      return <TextField label={f.label} hint={f.hint} optional={optional} type="url" inputMode="url" placeholder={f.placeholder} value={text} onChange={(e) => onChange(e.target.value)} error={error} maxLength={300} />;
    case "text":
      return <TextField label={f.label} hint={f.hint} optional={optional} placeholder={f.placeholder} autoComplete={f.autoComplete} value={text} onChange={(e) => onChange(e.target.value)} error={error} maxLength={f.max ?? 120} />;
    case "textarea":
      return <TextArea label={f.label} hint={f.hint} optional={optional} rows={4} value={text} onChange={(e) => onChange(e.target.value)} error={error} maxLength={f.max ?? 600} />;
    case "select":
      return <SelectField label={f.label} hint={f.hint} value={text} onChange={(e) => onChange(e.target.value)} error={error} options={[{ value: "", label: optional ? "Not specified" : "Select…" }, ...options]} />;
    case "choice":
      return (
        <FieldGroup legend={f.label} hint={f.hint} error={error}>
          <div className={cn("grid gap-2", options.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
            {options.map((o) => (
              <RadioCard key={o.value} name={f.id} value={o.value} checked={text === o.value} onChange={onChange} title={o.label} description={o.description ?? ""} />
            ))}
          </div>
        </FieldGroup>
      );
    case "chips":
      return <ChipGroup legend={f.label} hint={f.hint} error={error} optional={optional} options={options} value={list} onChange={onChange} allowCustom={f.allowCustom} customPlaceholder={f.customPlaceholder} />;
    case "file":
      return <FileUpload kind={f.file} label={f.label} optional={optional} value={value as FileMeta | undefined} onChange={onChange} error={error} />;
  }
}

/** Phone input with the verification integration point. Never claims a code was sent. */
function PhoneField({ label, hint, value, error, onChange }: { label: string; hint?: string; value: string; error?: string; onChange: (v: string) => void }) {
  const [note, setNote] = useState<string>();
  const [localError, setLocalError] = useState<string>();
  const verify = async () => {
    const parsed = phoneSchema.safeParse(value);
    if (!parsed.success) return setLocalError(parsed.error.issues[0].message);
    setLocalError(undefined);
    const res = await phoneVerification.requestCode(parsed.data);
    setNote(res.status === "unavailable" ? `${res.reason} Your number will be saved as unverified, and you’ll be asked to confirm it once verification is available.` : undefined);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            label={label}
            hint={hint}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={value}
            onChange={(e) => {
              setLocalError(undefined);
              setNote(undefined);
              onChange(e.target.value);
            }}
            error={localError ?? error}
            maxLength={24}
          />
        </div>
        <Button variant="secondary" onClick={verify} className={cn("shrink-0", (localError ?? error ?? hint) && "mb-[1.6rem]")}>
          Verify
        </Button>
      </div>
      {note && (
        <p role="status" className="rounded-sm border border-line bg-surface px-3 py-2 text-meta text-sub">
          {note}
        </p>
      )}
    </div>
  );
}

function StepTitle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 id="step-title" className="text-title font-bold">
        {title}
      </h1>
      <p className="mt-2 text-body text-sub">{body}</p>
    </div>
  );
}

function Done({ role, values, firstName, onGo }: { role: OnboardingRole; values: Values; firstName: string; onGo: (href: string) => void }) {
  const explorer = (role === "student" && values.hasIdea !== "yes") || role === "participant";
  const home = role === "institution" ? "/institution" : "/home";
  const second =
    role === "institution"
      ? { href: "/opportunities", label: "Browse opportunities" }
      : explorer
        ? { href: "/discover", label: "Start discovering" }
        : role === "student" || role === "founder"
          ? { href: "/ideas/new", label: "Submit your idea" }
          : { href: "/community", label: "Meet the community" };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-end gap-3">
        {explorer ? <CompassArt size={64} /> : <CollabArt size={64} />}
      </div>
      <div>
        <h1 className="text-title font-bold">You’re all set, {firstName}</h1>
        <p className="mt-2 text-body text-sub">
          {explorer
            ? "Start with the problems people in your chosen industries are working on. You don’t need an idea to begin."
            : "Your home page is arranged around what you told us. Pick up where it makes sense for you."}
        </p>
      </div>
      <JourneyLine current={explorer ? 0 : 1} />
      <div className="flex flex-wrap gap-2">
        <Button variant="accent" size="lg" onClick={() => onGo(home)}>
          Go to your home page
        </Button>
        <Button variant="secondary" size="lg" onClick={() => onGo(second.href)}>
          {second.label}
        </Button>
      </div>
    </motion.div>
  );
}

/** Saves the profile, then uploads any attached photo/resume to secure storage (verified on the server). */
async function finishOnboarding(patch: ReturnType<typeof toUserPatch>) {
  await completeOnboarding(patch);
  const uploads: [string, "avatar" | "resume"][] = [["photo", "avatar"], ["resume", "resume"]];
  for (const [slot, purpose] of uploads) {
    const file = getTransientFile(slot);
    if (!file) continue;
    const res = await uploadFile(file, purpose);
    if (!res.ok) toast(slot === "photo" ? "Photo not saved" : "Resume not saved", { body: res.error });
    else removeTransientFile(slot);
  }
  void reloadAppData();
}

export default function OnboardingPage() {
  return (
    <SessionGate requireOnboarded={false}>
      <div className="min-h-dvh px-4 py-6 sm:px-10">
        <Logo href="/" />
        <main id="main" className="mx-auto max-w-[980px] py-10 md:py-14">
          <Onboarding />
        </main>
      </div>
    </SessionGate>
  );
}
