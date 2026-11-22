"use client";

import Link from "next/link";
import { Bookmark, Download, FlaskConical, Info } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { RESEARCH_CATEGORIES } from "@/config/taxonomy";
import { reportToMarkdown } from "@/lib/services/research";
import { toggleSaveResearch } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { ideaById } from "@/lib/store/selectors";
import type { ResearchReport } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { brand } from "@/config/brand";

/** Shown on reports built without a live model or web search — the moment the limitation matters. */
export function ReportProvenanceNote() {
  return (
    <div className="flex gap-3 rounded-sm border border-line bg-surface px-4 py-3 text-meta text-charcoal">
      <Info size={15} className="mt-0.5 shrink-0 text-sub" aria-hidden />
      <p>
        <span className="font-medium text-ink">Research plan, not findings.</span> Built from {brand.productName} research templates. Live AI and web sources aren’t connected yet, so this report contains no real market data — use it to plan what to verify.
      </p>
    </div>
  );
}

export function exportReport(r: ResearchReport) {
  const blob = new Blob([reportToMarkdown(r)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `research-${r.id}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Report exported", { body: "Downloaded as a Markdown file." });
}

export function ReportView({ report }: { report: ResearchReport }) {
  const s = useAppState();
  const idea = report.ideaId ? ideaById(s, report.ideaId) : undefined;
  return (
    <article aria-labelledby={`${report.id}-q`} className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-sub">
          <span>{formatDate(report.createdAt)}</span>
          <span>{report.depth === "scan" ? "Quick scan" : report.depth === "standard" ? "Standard depth" : "Deep dive"}</span>
          <span>{report.categories.map((c) => RESEARCH_CATEGORIES.find((x) => x.id === c)?.label).join(", ")}</span>
        </div>
        <h2 id={`${report.id}-q`} className="text-[1.5rem] font-semibold leading-tight tracking-tight">
          {report.question}
        </h2>
        {idea && (
          <p className="text-ui text-sub">
            Linked to{" "}
            <Link href={`/ideas/${idea.id}`} className="text-ink underline underline-offset-4">
              {idea.title.split(":")[0]}
            </Link>
          </p>
        )}
        {report.provenance === "demo" && <ReportProvenanceNote />}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            aria-pressed={report.saved}
            onClick={() => {
              toggleSaveResearch(report.id);
              toast(report.saved ? "Removed from saved research" : "Research saved");
            }}
          >
            <Bookmark size={15} className={report.saved ? "fill-ink" : ""} aria-hidden />
            {report.saved ? "Saved" : "Save research"}
          </Button>
          <Button variant="secondary" onClick={() => exportReport(report)}>
            <Download size={15} aria-hidden /> Export report
          </Button>
          {idea && idea.ownerId === "me" && (
            <ButtonLink href={`/validate/${idea.id}`} variant="ghost">
              <FlaskConical size={15} aria-hidden /> Use in validation
            </ButtonLink>
          )}
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="Report sections" className="hidden lg:block">
          <ol className="sticky top-24 flex flex-col gap-1.5 text-meta">
            {report.sections.map((sec) => (
              <li key={sec.id}>
                <a href={`#${report.id}-${sec.id}`} className="text-sub hover:text-ink">
                  {sec.heading}
                </a>
              </li>
            ))}
            <li>
              <a href={`#${report.id}-sources`} className="text-sub hover:text-ink">
                Sources
              </a>
            </li>
          </ol>
        </nav>
        <div className="flex max-w-[70ch] flex-col gap-8">
          {report.sections.map((sec) => (
            <section key={sec.id} id={`${report.id}-${sec.id}`} className="scroll-mt-24">
              <h3 className="text-section font-semibold">{sec.heading}</h3>
              <p className="mt-2 text-body text-charcoal">{sec.body}</p>
              {sec.bullets && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {sec.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-body text-charcoal">
                      <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-ink" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <section id={`${report.id}-sources`} className="scroll-mt-24 border-t border-line pt-6">
            <h3 className="text-section font-semibold">Sources</h3>
            <p className="mt-1 text-meta text-sub">No sources were retrieved. These are suggested places to look; a live provider would cite specific documents.</p>
            <ol className="mt-4 flex flex-col">
              {report.sources.map((src, i) => (
                <li key={src.id} className="flex gap-4 border-b border-line py-3 last:border-0">
                  <span className="w-5 shrink-0 text-meta text-mute tabular-nums">{i + 1}</span>
                  <div>
                    <p className="text-ui font-medium">{src.title}</p>
                    <p className="text-meta text-sub">
                      {src.kind} — {src.note}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </article>
  );
}
