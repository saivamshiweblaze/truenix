"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Progress } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { EVIDENCE_TYPES, evidenceLabel, VALIDATION_SECTIONS } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminDowngradeEvidence } from "@/lib/store/admin-actions";
import { allIdeasAdmin, personById } from "@/lib/store/selectors";
import type { AppState } from "@/lib/store/state";
import type { EvidenceItem, EvidenceType, ValidationWorkspace } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Block, Timeline } from "../kit/layout";
import { AdminStatus } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";
import { Button } from "@/components/ui/button";

interface Row {
  ideaId: string;
  title: string;
  owner: string;
  ws: ValidationWorkspace;
}

const workspaces = (s: AppState): Row[] => {
  const all = { ...s.platform.validations, ...s.validations };
  const ideas = allIdeasAdmin(s);
  return Object.values(all).map((ws) => {
    const idea = ideas.find((i) => i.id === ws.ideaId);
    return { ideaId: ws.ideaId, title: idea?.title ?? ws.ideaId, owner: personById(s, idea?.ownerId ?? "")?.name ?? "Unknown", ws };
  });
};

const count = (ws: ValidationWorkspace, t: EvidenceType) => ws.evidence.filter((e) => e.type === t).length;
const doneCount = (ws: ValidationWorkspace) => Object.values(ws.sections).filter((x) => x.status === "done").length;

/** Evidence groups in order of strength. Customer and experiment evidence are kept visually apart from analysis. */
const GROUPS: { title: string; types: EvidenceType[]; note: string }[] = [
  { title: "Customer evidence", types: ["customer_response", "experiment_result"], note: "Entered by the team from people they spoke to or tests they ran, each with a source." },
  { title: "Expert opinion", types: ["expert_opinion"], note: "Views from people with domain experience. Not endorsements." },
  { title: "Public research", types: ["public_research"], note: "Published sources the team cited." },
  { title: "AI analysis and assumptions", types: ["ai_analysis", "assumption"], note: "Generated reasoning and untested beliefs. Not proof." },
];

export function ValidationList() {
  const s = useAppState();
  const rows = workspaces(s);
  const columns: Column<Row>[] = [
    { id: "title", header: "Idea", primary: true, sort: (r) => r.title, csv: (r) => r.title, cell: (r) => <span className="line-clamp-2 min-w-[14rem]">{r.title}</span> },
    { id: "owner", header: "Owner", sort: (r) => r.owner, csv: (r) => r.owner, cell: (r) => <span className="text-meta text-sub">{r.owner}</span> },
    {
      id: "areas",
      header: "Areas done",
      sort: (r) => doneCount(r.ws),
      csv: (r) => `${doneCount(r.ws)}/12`,
      cell: (r) => (
        <span className="flex w-28 items-center gap-2">
          <Progress value={(doneCount(r.ws) / 12) * 100} label={`${r.title} validation areas done`} tone="positive" />
          <span className="text-micro tabular-nums text-sub">{doneCount(r.ws)}/12</span>
        </span>
      ),
    },
    { id: "customer", header: "Customer evidence", sort: (r) => count(r.ws, "customer_response") + count(r.ws, "experiment_result"), csv: (r) => count(r.ws, "customer_response") + count(r.ws, "experiment_result"), cell: (r) => <span className="text-meta tabular-nums">{count(r.ws, "customer_response") + count(r.ws, "experiment_result")}</span> },
    { id: "expert", header: "Expert", csv: (r) => count(r.ws, "expert_opinion"), cell: (r) => <span className="text-meta tabular-nums text-sub">{count(r.ws, "expert_opinion")}</span>, hideOnMobile: true },
    { id: "ai", header: "AI analysis", csv: (r) => count(r.ws, "ai_analysis"), cell: (r) => <span className="text-meta tabular-nums text-sub">{count(r.ws, "ai_analysis")}</span>, hideOnMobile: true },
    { id: "q", header: "Open questions", csv: (r) => r.ws.openQuestions.filter((q) => !q.resolved).length, cell: (r) => <span className="text-meta tabular-nums text-sub">{r.ws.openQuestions.filter((q) => !q.resolved).length}</span>, hideOnMobile: true },
    { id: "updated", header: "Updated", sort: (r) => r.ws.updatedAt, csv: (r) => r.ws.updatedAt.slice(0, 10), cell: (r) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(r.ws.updatedAt)}</span> },
  ];
  return (
    <>
      <AdminHeader
        title="Validation"
        description="Validation workspaces and their evidence. Evidence types stay separate: AI analysis and assumptions are never counted as customer validation, and TRUEVIX does not score ideas."
      />
      <DataTable
        label="Validation workspaces"
        module="validation"
        rows={rows}
        columns={columns}
        getId={(r) => r.ideaId}
        search={(r) => [r.title, r.owner]}
        searchPlaceholder="Search by idea or owner"
        initialSort={{ id: "updated", dir: "desc" }}
        rowHref={(r) => `/admin/validation/${r.ideaId}`}
        exportName="truevix-validation"
        emptyBody="Workspaces appear when a member starts validating an idea."
      />
    </>
  );
}

export function ValidationDetail({ ideaId }: { ideaId: string }) {
  const s = useAppState();
  const can = useCan();
  const confirm = useConfirm();
  const row = workspaces(s).find((r) => r.ideaId === ideaId);
  if (!row) return <EmptyState title="No validation workspace" body="This idea has no validation workspace yet." action={<ButtonLink href="/admin/validation">All workspaces</ButtonLink>} />;
  const { ws } = row;
  const act = (ev: EvidenceItem, remove: boolean) =>
    confirm.ask({
      title: remove ? "Remove this evidence?" : "Reclassify as an assumption?",
      description: `“${ev.text.slice(0, 120)}”`,
      consequences: [
        remove ? "The item is removed from the workspace. Use this for duplicates or content that breaks the rules." : "Use when an item was filed under a stronger type than its source supports. Administrators can only downgrade evidence, never upgrade it.",
        "The owner sees the change. Your reason is recorded in the audit log.",
      ],
      confirmLabel: remove ? "Remove evidence" : "Reclassify",
      danger: remove,
      reason: "required",
      onConfirm: (reason) => {
        adminDowngradeEvidence(ideaId, ev, reason, remove);
        toast(remove ? "Evidence removed" : "Reclassified as assumption");
      },
    });
  const history = s.admin.audit.filter((e) => e.entity === "validation" && e.targetId === ideaId);
  return (
    <>
      <AdminHeader
        title={row.title}
        description="Validation workspace"
        meta={
          <>
            <span>Owner: {row.owner}</span>
            <span>{doneCount(ws)} of 12 areas done</span>
            <span>Updated {formatDate(ws.updatedAt)}</span>
          </>
        }
        actions={
          <ButtonLink href={`/admin/ideas/${ideaId}`} variant="ghost" size="sm">
            Idea record
          </ButtonLink>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          {GROUPS.map((g) => {
            const items = ws.evidence.filter((e) => g.types.includes(e.type));
            return (
              <Block key={g.title} title={g.title} description={g.note}>
                {items.length ? (
                  <ul>
                    {items.map((e) => (
                      <li key={e.id} className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0">
                        <div className="flex flex-wrap items-center gap-2 text-micro text-mute">
                          <span className="font-medium text-charcoal">{evidenceLabel(e.type)}</span>
                          <span>{VALIDATION_SECTIONS.find((x) => x.id === e.sectionId)?.label}</span>
                          {e.demoGenerated && <span>Template output</span>}
                        </div>
                        <p className="text-ui text-ink">{e.text}</p>
                        <p className="text-meta text-sub">Source: {e.source || "none given"}</p>
                        {can("validation", "edit") && (
                          <div className="mt-1 flex gap-2">
                            {e.type !== "assumption" && (
                              <Button size="sm" variant="ghost" onClick={() => act(e, false)}>
                                Reclassify as assumption
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => act(e, true)}>
                              Remove
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-meta text-sub">None recorded.</p>
                )}
              </Block>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Twelve validation areas">
            <ul>
              {VALIDATION_SECTIONS.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-meta last:border-b-0">
                  <span>{v.label}</span>
                  <AdminStatus value={ws.sections[v.id]?.status ?? "not_started"} label={ws.sections[v.id]?.status === "done" ? "Done" : ws.sections[v.id]?.status === "in_progress" ? "In progress" : "Not started"} />
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Evidence by type">
            <ul>
              {EVIDENCE_TYPES.map((t) => (
                <li key={t.id} className="flex justify-between border-b border-line py-1.5 text-meta last:border-b-0">
                  <span>{t.label}</span>
                  <span className="tabular-nums">{count(ws, t.id)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-micro text-mute">There is no success score. Counts describe what was recorded, not whether the idea is validated.</p>
          </Block>
          <Block title="Open questions">
            {ws.openQuestions.length ? (
              <ul>
                {ws.openQuestions.map((q) => (
                  <li key={q.id} className="border-b border-line py-1.5 text-ui last:border-b-0">
                    {q.text} <span className="text-meta text-sub">· {q.resolved ? "resolved" : "open"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-sub">No open questions.</p>
            )}
          </Block>
          <Block title="Validation history">
            <Timeline events={history.map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `${e.action}${e.reason ? ` — ${e.reason}` : ""}` }))} empty="No administrative changes." />
            <p className="mt-2 text-micro text-mute">
              <Link href="/admin/audit" className="underline underline-offset-4">
                Full audit log
              </Link>
            </p>
          </Block>
        </div>
      </div>
      {confirm.dialog}
    </>
  );
}
