"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Idea } from "@/lib/types";
import { Badge, Progress } from "@/components/ui/primitives";
import { industryLabel, stageLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import type { AppState } from "@/lib/store/state";
import { summarise } from "@/lib/services/validation";
import { VisibilityLabel } from "@/features/shared/rows";
import { cn } from "@/lib/utils";

/** The single most useful next action for one of the person’s own projects. */
export function projectNextAction(s: AppState, idea: Idea): { label: string; href: string } {
  if (idea.status === "draft") return { label: "Finish and submit", href: `/ideas/${idea.id}/edit` };
  const research = s.research.filter((r) => r.ideaId === idea.id).length;
  const ws = s.validations[idea.id];
  const sum = ws ? summarise(ws) : null;
  if (!research) return { label: "Research the market", href: `/research?idea=${idea.id}` };
  if (!sum || sum.started === 0) return { label: "Start validating", href: `/validate/${idea.id}` };
  if (sum.realEvidence === 0) return { label: "Add evidence from people", href: `/validate/${idea.id}` };
  if (sum.done < sum.total) return { label: "Continue validation", href: `/validate/${idea.id}` };
  return { label: "Find collaborators", href: "/community?tab=people" };
}

/**
 * One of the person’s own ideas as a project: where it stands (stage, research, validation)
 * and the next action. Validation progress is shown in emerald only once people have given evidence.
 */
export function ProjectCard({ idea, className }: { idea: Idea; className?: string }) {
  const s = useAppState();
  const research = s.research.filter((r) => r.ideaId === idea.id).length;
  const ws = s.validations[idea.id];
  const sum = ws ? summarise(ws) : null;
  const next = projectNextAction(s, idea);
  return (
    <article className={cn("group relative flex flex-col rounded-md border border-line bg-paper p-5 transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-card", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="strong">{stageLabel(idea.stage)}</Badge>
        {idea.status === "draft" && <Badge tone="outline">Draft</Badge>}
        <span className="text-meta text-sub">{industryLabel(idea.industry)}</span>
        <VisibilityLabel visibility={idea.visibility} className="ml-auto" />
      </div>
      <h3 className="mt-3 text-[1.125rem] font-bold leading-snug tracking-tight">
        <Link href={`/ideas/${idea.id}`} className="hover:underline">
          {idea.title || "Untitled idea"}
        </Link>
      </h3>
      {idea.problem && <p className="mt-1 line-clamp-2 text-meta text-sub">{idea.problem}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 text-meta">
        <div>
          <dt className="text-mute">Research</dt>
          <dd className="mt-0.5 font-medium text-ink">{research ? `${research} report${research === 1 ? "" : "s"}` : "Not started"}</dd>
        </div>
        <div>
          <dt className="text-mute">Validation</dt>
          <dd className="mt-0.5 font-medium text-ink tabular-nums">{sum ? `${sum.done} of ${sum.total} areas` : "Not started"}</dd>
          <Progress
            value={sum ? (sum.done / sum.total) * 100 : 0}
            tone={sum && sum.realEvidence > 0 ? "positive" : "ink"}
            label={`Validation progress for ${idea.title || "untitled idea"}`}
            className="mt-1.5"
          />
        </div>
      </dl>
      {sum && sum.realEvidence > 0 && (
        <p className="mt-2 text-micro text-positive-ink">
          {sum.realEvidence} piece{sum.realEvidence === 1 ? "" : "s"} of evidence from people or experiments
        </p>
      )}

      <Link href={next.href} className="mt-4 inline-flex items-center gap-1.5 self-start text-ui font-semibold text-ink underline-offset-4 hover:underline">
        {next.label} <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}
