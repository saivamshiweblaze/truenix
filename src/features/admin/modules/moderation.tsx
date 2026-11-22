"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectField, TextArea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { adminResolveReport } from "@/lib/store/admin-actions";
import { accountFor, allCommentsAdmin, allIdeasAdmin, allPostsAdmin, personById } from "@/lib/store/selectors";
import type { AccountStatus, ModerationReport } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Block, Details, Metric, MetricStrip, Timeline } from "../kit/layout";
import { AdminStatus } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";

const SEVERITY_ORDER = { high: 3, medium: 2, low: 1 } as const;
const severityStatus = (s: ModerationReport["severity"]) => (s === "high" ? "failed" : s === "medium" ? "pending" : "draft");
const TYPE_LABEL: Record<ModerationReport["targetType"], string> = { post: "Post", comment: "Comment", idea: "Idea", user: "Member", collaboration: "Collaboration request" };

export function SeverityLabel({ value }: { value: ModerationReport["severity"] }) {
  return <AdminStatus value={severityStatus(value)} label={value[0].toUpperCase() + value.slice(1)} />;
}

export function ModerationQueue() {
  const s = useAppState();
  const rows = s.platform.reports;
  const name = (id: string) => personById(s, id)?.name ?? "Unknown";
  const columns: Column<ModerationReport>[] = [
    { id: "label", header: "Reported content", primary: true, sort: (r) => r.targetLabel, csv: (r) => r.targetLabel, cell: (r) => <span className="line-clamp-2 min-w-[14rem]">{r.targetLabel}</span> },
    { id: "severity", header: "Severity", sort: (r) => SEVERITY_ORDER[r.severity], csv: (r) => r.severity, cell: (r) => <SeverityLabel value={r.severity} /> },
    { id: "reason", header: "Reason", sort: (r) => r.reason, csv: (r) => r.reason, cell: (r) => <span className="text-meta">{r.reason}</span> },
    { id: "type", header: "Type", sort: (r) => r.targetType, csv: (r) => TYPE_LABEL[r.targetType], cell: (r) => <span className="text-meta text-sub">{TYPE_LABEL[r.targetType]}</span> },
    { id: "user", header: "Reported member", sort: (r) => name(r.reportedUserId), csv: (r) => name(r.reportedUserId), cell: (r) => <span className="text-meta text-sub">{name(r.reportedUserId)}</span> },
    { id: "status", header: "Status", sort: (r) => r.status, csv: (r) => r.status, cell: (r) => <AdminStatus value={r.status} /> },
    { id: "created", header: "Reported", sort: (r) => r.createdAt, csv: (r) => r.createdAt.slice(0, 10), cell: (r) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(r.createdAt)}</span> },
    { id: "reviewed", header: "Reviewed", sort: (r) => r.reviewedAt ?? "", csv: (r) => r.reviewedAt?.slice(0, 10), cell: (r) => <span className="whitespace-nowrap text-meta text-sub">{r.reviewedAt ? timeAgo(r.reviewedAt) : "—"}</span>, hideOnMobile: true },
  ];
  const active = rows.filter((r) => r.status === "open" || r.status === "in_review");
  return (
    <>
      <AdminHeader title="Moderation queue" description="Reports from members about posts, comments, ideas, people and collaboration requests. Highest severity first." />
      <MetricStrip cols={4}>
        <Metric label="Open" value={rows.filter((r) => r.status === "open").length} />
        <Metric label="In review" value={rows.filter((r) => r.status === "in_review").length} />
        <Metric label="High severity open" value={active.filter((r) => r.severity === "high").length} />
        <Metric label="Resolved" value={rows.filter((r) => r.status === "actioned" || r.status === "dismissed").length} note="Action taken or dismissed" />
      </MetricStrip>
      <div className="mt-6">
        <DataTable
          label="Reports"
          module="moderation"
          rows={rows}
          columns={columns}
          getId={(r) => r.id}
          search={(r) => [r.targetLabel, r.reason, r.details, name(r.reportedUserId)]}
          searchPlaceholder="Search reports"
          filters={[
            { id: "status", label: "Status", options: [{ value: "active", label: "Needs review" }, { value: "open", label: "Open" }, { value: "in_review", label: "In review" }, { value: "actioned", label: "Action taken" }, { value: "dismissed", label: "Dismissed" }], test: (r, v) => (v === "active" ? r.status === "open" || r.status === "in_review" : r.status === v) },
            { id: "severity", label: "Severity", options: [{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }], test: (r, v) => r.severity === v },
            { id: "type", label: "Type", options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })), test: (r, v) => r.targetType === v },
          ]}
          initialFilters={{ status: "active" }}
          initialSort={{ id: "severity", dir: "desc" }}
          rowHref={(r) => `/admin/moderation/${r.id}`}
          exportName="truevix-reports"
          emptyTitle="No reports need review"
          emptyBody="New reports from members appear here. Change the status filter to see resolved reports."
        />
      </div>
    </>
  );
}

function ReportedContent({ r }: { r: ModerationReport }) {
  const s = useAppState();
  if (r.targetType === "post") {
    const p = allPostsAdmin(s).find((x) => x.id === r.targetId);
    if (!p) return <p className="text-meta text-sub">The post no longer exists.</p>;
    return (
      <div>
        <p className="text-ui font-semibold">{p.title}</p>
        <p className="mt-1 whitespace-pre-line text-ui text-charcoal">{p.body}</p>
        <p className="mt-2 text-meta text-sub">Status: {p.moderation?.status ?? "visible"}</p>
      </div>
    );
  }
  if (r.targetType === "comment") {
    const c = allCommentsAdmin(s).find((x) => x.id === r.targetId);
    return c ? <p className="whitespace-pre-line text-ui text-charcoal">“{c.body}”</p> : <p className="text-meta text-sub">The comment no longer exists.</p>;
  }
  if (r.targetType === "idea") {
    const i = allIdeasAdmin(s).find((x) => x.id === r.targetId);
    return i ? (
      <p className="text-ui">
        <Link href={`/admin/ideas/${i.id}`} className="font-semibold underline underline-offset-4">
          {i.title}
        </Link>
        <span className="mt-1 block text-charcoal">{i.summary}</span>
      </p>
    ) : (
      <p className="text-meta text-sub">The idea no longer exists.</p>
    );
  }
  if (r.targetType === "collaboration") {
    const c = s.platform.collaborations.find((x) => x.id === r.targetId);
    return c ? (
      <p className="text-ui text-charcoal">
        <span className="font-semibold">{c.role}:</span> “{c.message}”
      </p>
    ) : (
      <p className="text-meta text-sub">The request no longer exists.</p>
    );
  }
  return (
    <p className="text-ui">
      Member profile:{" "}
      <Link href={`/admin/users/${r.targetId}`} className="underline underline-offset-4">
        {personById(s, r.targetId)?.name}
      </Link>
    </p>
  );
}

export function ReportDetail({ id }: { id: string }) {
  const s = useAppState();
  const can = useCan();
  const r = s.platform.reports.find((x) => x.id === id);
  const [contentAction, setContentAction] = useState<"none" | "hide" | "remove">("none");
  const [memberAction, setMemberAction] = useState<"" | AccountStatus>("");
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string>();
  if (!r) return <EmptyState title="Report not found" body="It may have been removed." action={<ButtonLink href="/admin/moderation">Moderation queue</ButtonLink>} />;
  const reported = personById(s, r.reportedUserId);
  const account = accountFor(s, r.reportedUserId);
  const others = s.platform.reports.filter((x) => x.reportedUserId === r.reportedUserId && x.id !== r.id);
  const history = s.admin.audit.filter((e) => e.targetId === r.id || e.targetId === r.targetId || (e.entity === "user" && e.targetId === r.reportedUserId));
  const resolved = r.status === "actioned" || r.status === "dismissed";
  const canAct = can("moderation", "edit");

  const finish = (outcome: "actioned" | "dismissed") => {
    if (resolution.trim().length < 5) return setError("Write a resolution of at least 5 characters. It is stored with the report.");
    adminResolveReport(r.id, outcome, resolution.trim(), { contentAction: outcome === "actioned" ? contentAction : "none", restrictUser: outcome === "actioned" && memberAction ? memberAction : null });
    toast(outcome === "dismissed" ? "Report dismissed" : "Report resolved", { body: outcome === "actioned" ? "The decision was applied and logged." : "The content stays as it is." });
    setResolution("");
  };

  return (
    <>
      <AdminHeader
        title={r.reason}
        flags={
          <>
            <SeverityLabel value={r.severity} />
            <AdminStatus value={r.status} />
          </>
        }
        description={r.targetLabel}
        meta={
          <>
            <span>Reported {formatDate(r.createdAt)}</span>
            <span>By {personById(s, r.reporterId)?.name ?? "a member"}</span>
            {r.reviewedAt && <span>Reviewed {timeAgo(r.reviewedAt)} by {r.reviewedBy}</span>}
          </>
        }
        actions={
          canAct && r.status === "open" ? (
            <Button size="sm" variant="secondary" onClick={() => (adminResolveReport(r.id, "in_review", ""), toast("Marked as in review"))}>
              Start review
            </Button>
          ) : canAct && resolved ? (
            <Button size="sm" variant="secondary" onClick={() => (adminResolveReport(r.id, "open", "Reopened"), toast("Report reopened"))}>
              Reopen
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Report">
            <Details
              items={[
                { label: "Reason", value: r.reason },
                { label: "Content type", value: TYPE_LABEL[r.targetType] },
                { label: "Reporter’s details", value: r.details, wide: true },
                ...(r.resolution ? [{ label: "Resolution", value: r.resolution, wide: true }] : []),
              ]}
            />
          </Block>
          <Block title="Reported content">
            <div className="rounded-md bg-surface p-4">
              <ReportedContent r={r} />
            </div>
          </Block>
          {canAct && !resolved && (
            <Block title="Decision" description="Apply an outcome. Both choices need a resolution note.">
              <div className="flex flex-col gap-4">
                {(r.targetType === "post" || r.targetType === "comment" || r.targetType === "idea") && (
                  <SelectField
                    label="Content action"
                    value={contentAction}
                    onChange={(e) => setContentAction(e.target.value as typeof contentAction)}
                    options={[
                      { value: "none", label: "Keep the content" },
                      { value: "hide", label: r.targetType === "idea" ? "Unpublish the idea" : "Hide the content" },
                      ...(r.targetType !== "idea" ? [{ value: "remove", label: "Remove the content" }] : []),
                    ]}
                  />
                )}
                {r.reportedUserId !== "me" && (
                  <SelectField
                    label="Member action"
                    value={memberAction}
                    onChange={(e) => setMemberAction(e.target.value as typeof memberAction)}
                    hint={others.length ? `This member has ${others.length} other report${others.length === 1 ? "" : "s"}.` : "No other reports about this member."}
                    options={[
                      { value: "", label: "No change to the account" },
                      { value: "restricted", label: "Restrict the account" },
                      { value: "suspended", label: "Suspend the account (repeat offenders)" },
                    ]}
                  />
                )}
                <TextArea label="Resolution" rows={3} value={resolution} onChange={(e) => (setResolution(e.target.value), setError(undefined))} error={error} hint="Stored with the report and in the audit log." />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => finish("actioned")}>Resolve with action</Button>
                  <Button variant="secondary" onClick={() => finish("dismissed")}>
                    Dismiss report
                  </Button>
                </div>
              </div>
            </Block>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Reported member">
            {reported ? (
              <Details
                items={[
                  { label: "Name", value: <Link href={`/admin/users/${r.reportedUserId}`} className="underline underline-offset-4">{reported.name}</Link> },
                  { label: "Account status", value: account ? <AdminStatus value={account.status} /> : "Active" },
                  { label: "Other reports", value: others.length },
                ]}
              />
            ) : (
              <p className="text-meta text-sub">Unknown member.</p>
            )}
            {others.length > 0 && (
              <ul className="mt-3">
                {others.map((o) => (
                  <li key={o.id} className="border-b border-line py-1.5 text-meta last:border-b-0">
                    <Link href={`/admin/moderation/${o.id}`} className="hover:underline">
                      {o.reason}
                    </Link>{" "}
                    <span className="text-sub">· {o.status.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
          <Block title="Moderation history">
            <Timeline events={history.map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `${e.action}${e.reason ? ` — ${e.reason}` : ""}` }))} empty="No decisions yet." />
          </Block>
        </div>
      </div>
    </>
  );
}
