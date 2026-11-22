"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { RESEARCH_CATEGORIES } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminSetResearchArchived } from "@/lib/store/admin-actions";
import { allIdeasAdmin, personById } from "@/lib/store/selectors";
import type { ResearchReport } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import type { AppState } from "@/lib/store/state";
import { AdminHeader, Block, Details, Metric, MetricStrip } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { PermButton } from "../kit/can";
import { useConfirm } from "../kit/confirm";

const catLabel = (c: string) => RESEARCH_CATEGORIES.find((x) => x.id === c)?.label ?? c;
const DEPTH = { scan: "Quick scan", standard: "Standard", deep: "Deep" } as const;
const runsOf = (s: AppState) => [...s.research.map((r) => ({ ...r, ownerId: r.ownerId ?? "me" })), ...s.platform.research];
const statusOf = (r: ResearchReport) => (r.archived ? "archived" : (r.runStatus ?? "completed"));

export function ResearchList() {
  const s = useAppState();
  const rows = runsOf(s);
  const ideas = allIdeasAdmin(s);
  const columns: Column<ResearchReport>[] = [
    { id: "q", header: "Research question", primary: true, sort: (r) => r.question, csv: (r) => r.question, cell: (r) => <span className="line-clamp-2 min-w-[14rem]">{r.question}</span> },
    { id: "owner", header: "Requested by", sort: (r) => personById(s, r.ownerId ?? "me")?.name ?? "", csv: (r) => personById(s, r.ownerId ?? "me")?.name, cell: (r) => <span className="text-meta text-sub">{personById(s, r.ownerId ?? "me")?.name ?? "Unknown"}</span> },
    { id: "idea", header: "Linked idea", csv: (r) => ideas.find((i) => i.id === r.ideaId)?.title, cell: (r) => <span className="line-clamp-1 text-meta text-sub">{ideas.find((i) => i.id === r.ideaId)?.title.split(":")[0] ?? "—"}</span>, hideOnMobile: true },
    { id: "focus", header: "Focus areas", csv: (r) => r.categories.map(catLabel), cell: (r) => <span className="text-meta text-sub">{r.categories.map(catLabel).join(", ")}</span>, hideOnMobile: true },
    { id: "depth", header: "Depth", sort: (r) => r.depth, csv: (r) => r.depth, cell: (r) => <span className="text-meta text-sub">{DEPTH[r.depth]}</span> },
    { id: "status", header: "Status", sort: (r) => statusOf(r), csv: (r) => statusOf(r), cell: (r) => <AdminStatus value={statusOf(r)} /> },
    { id: "created", header: "Created", sort: (r) => r.createdAt, csv: (r) => r.createdAt.slice(0, 10), cell: (r) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(r.createdAt)}</span> },
  ];
  return (
    <>
      <AdminHeader
        title="AI Researcher"
        description="Research runs requested by members. In this phase every run is a template-generated research plan created in the browser; no AI model or search provider is connected, so there is no provider usage or cost to report."
      />
      <MetricStrip cols={4}>
        <Metric label="Runs" value={rows.length} />
        <Metric label="Saved reports" value={rows.filter((r) => r.saved).length} />
        <Metric label="Failed runs" value={rows.filter((r) => r.runStatus === "failed").length} />
        <Metric label="Provider usage" value="—" note="Not available: no provider connected" />
      </MetricStrip>
      <div className="mt-6">
        <DataTable
          label="Research runs"
          module="research"
          rows={rows}
          columns={columns}
          getId={(r) => r.id}
          search={(r) => [r.question, personById(s, r.ownerId ?? "me")?.name]}
          searchPlaceholder="Search questions or members"
          filters={[
            { id: "status", label: "Status", options: [{ value: "completed", label: "Completed" }, { value: "failed", label: "Failed" }, { value: "archived", label: "Archived" }], test: (r, v) => statusOf(r) === v },
            { id: "depth", label: "Depth", options: Object.entries(DEPTH).map(([value, label]) => ({ value, label })), test: (r, v) => r.depth === v },
          ]}
          initialSort={{ id: "created", dir: "desc" }}
          rowHref={(r) => `/admin/research/${r.id}`}
          exportName="truevix-research-runs"
        />
      </div>
    </>
  );
}

export function ResearchDetail({ id }: { id: string }) {
  const s = useAppState();
  const confirm = useConfirm();
  const r = runsOf(s).find((x) => x.id === id);
  if (!r) return <EmptyState title="Research run not found" body="It may have been deleted by the member." action={<ButtonLink href="/admin/research">All runs</ButtonLink>} />;
  const idea = allIdeasAdmin(s).find((i) => i.id === r.ideaId);
  return (
    <>
      <AdminHeader
        title={r.question}
        flags={
          <>
            <AdminStatus value={statusOf(r)} />
            <Flag title="Generated locally from templates">{r.provenance === "demo" ? "Template plan" : "Live"}</Flag>
          </>
        }
        meta={
          <>
            <span>Requested by {personById(s, r.ownerId ?? "me")?.name ?? "Unknown"}</span>
            <span>{formatDate(r.createdAt)}</span>
            <span>{r.saved ? "Saved by the member" : "Not saved"}</span>
          </>
        }
        actions={
          <PermButton
            module="research"
            perm="archive"
            variant="secondary"
            size="sm"
            onClick={() =>
              confirm.ask({
                title: r.archived ? "Restore this run?" : "Archive this run?",
                consequences: [r.archived ? "The run is listed again in admin views." : "The run is hidden from admin lists and analytics. The member’s own copy is not deleted."],
                confirmLabel: r.archived ? "Restore" : "Archive",
                reason: r.archived ? "optional" : "required",
                onConfirm: (reason) => {
                  adminSetResearchArchived(r.id, !r.archived, reason);
                  toast(r.archived ? "Run restored" : "Run archived");
                },
              })
            }
          >
            {r.archived ? "Restore" : "Archive"}
          </PermButton>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          {r.runStatus === "failed" && (
            <Block title="Failure">
              <p className="text-ui text-danger">{r.failureReason}</p>
            </Block>
          )}
          <Block title="Report sections" description="Template-generated plan. It contains questions and suggested sources, not findings.">
            {r.sections.length ? (
              <ul className="flex flex-col gap-4">
                {r.sections.map((sec) => (
                  <li key={sec.id}>
                    <p className="text-ui font-semibold">{sec.heading}</p>
                    <p className="text-ui text-charcoal">{sec.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-sub">No sections were produced.</p>
            )}
          </Block>
          <Block title="Source references">
            {r.sources.length ? (
              <ul>
                {r.sources.map((src) => (
                  <li key={src.id} className="border-b border-line py-2 text-ui last:border-b-0">
                    {src.title} <span className="text-meta text-sub">· {src.kind} · {src.url ? src.url : "suggestion, not retrieved"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-sub">No sources recorded.</p>
            )}
          </Block>
        </div>
        <Block title="Run details">
          <Details
            items={[
              { label: "Linked idea", value: idea ? <Link href={`/admin/ideas/${idea.id}`} className="underline underline-offset-4">{idea.title.split(":")[0]}</Link> : "None" },
              { label: "Focus areas", value: r.categories.map(catLabel).join(", "), wide: true },
              { label: "Depth", value: DEPTH[r.depth] },
              { label: "Provenance", value: r.provenance === "demo" ? "Generated in the browser from templates" : "Live provider" },
              { label: "Provider usage", value: "Not applicable — no AI provider is connected in this phase" },
            ]}
          />
        </Block>
      </div>
      {confirm.dialog}
    </>
  );
}
