"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea, TextField } from "@/components/ui/field";
import { PageHeader, Progress, SectionHeading, StatusDot } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { FlaskArt } from "@/components/illustrations/art";
import { saveIdea } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { summarise } from "@/lib/services/validation";
import { stageLabel } from "@/config/taxonomy";

export default function ValidateIndexPage() {
  const s = useAppState();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});

  const startNew = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (title.trim().length < 5) errors.title = "Give the idea a working title of at least 5 characters.";
    if (problem.trim().length < 20) errors.problem = "Describe the problem in at least 20 characters.";
    setErr(errors);
    if (Object.keys(errors).length) return;
    const id = saveIdea(
      { title, problem, solution: "", targetUsers: "", industry: "ai", geography: "", stage: "concept", existingResearch: "", requiredSkills: [], collaborationNeeds: "", visibility: "private" },
      { submit: false },
    );
    toast("Private draft created", { body: "Only you can see it. Add details any time." });
    router.push(`/validate/${id}`);
  };

  return (
    <>
      <PageHeader
        title="Validate my idea"
        description="Work through twelve areas, from problem to experiments. Keep AI analysis, published research, expert opinion and real customer evidence clearly apart, so you know what is proven and what is guessed."
      />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="your-ideas">
          <SectionHeading title="Choose one of your ideas" id="your-ideas" />
          {s.ideas.length ? (
            <ul>
              {s.ideas.map((i) => {
                const ws = s.validations[i.id];
                const sum = ws ? summarise(ws) : null;
                return (
                  <li key={i.id} className="border-b border-line">
                    <Link href={`/validate/${i.id}`} className="flex items-center gap-5 py-4 hover:bg-surface/60 md:px-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ui font-medium text-ink">{i.title || "Untitled"}</p>
                        <div className="mt-1 flex flex-wrap gap-3">
                          <StatusDot tone={sum && sum.realEvidence > 0 ? "positive" : "mute"} label={sum ? `${sum.done} of ${sum.total} areas complete` : "Not started"} />
                          <span className="text-meta text-mute">{stageLabel(i.stage)}{i.status === "draft" ? " · Draft" : ""}</span>
                        </div>
                      </div>
                      <div className="hidden w-32 sm:block">
                        <Progress value={sum ? (sum.done / sum.total) * 100 : 0} label={`Validation progress for ${i.title}`} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-start gap-5 border border-dashed border-line-strong p-6">
              <FlaskArt size={56} />
              <p className="text-ui text-sub">You have no ideas yet. Start a private draft with the form here, or submit a full idea from the Ideas section.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="new-validation" className="lg:border-l lg:border-line lg:pl-10">
          <SectionHeading title="Or start with a new idea" id="new-validation" />
          <p className="mb-5 text-meta text-sub">This creates a private draft that only you can see.</p>
          <form onSubmit={startNew} noValidate className="flex flex-col gap-4">
            <TextField label="Working title" value={title} onChange={(e) => setTitle(e.target.value)} error={err.title} maxLength={140} />
            <TextArea label="The problem" rows={4} value={problem} onChange={(e) => setProblem(e.target.value)} error={err.problem} maxLength={2000} />
            <Button type="submit" variant="primary">
              Start validating
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
