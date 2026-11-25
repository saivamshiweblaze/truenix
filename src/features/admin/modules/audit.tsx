"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Dialog } from "@/components/ui/overlay";
import { useAppState } from "@/lib/store/store";
import type { AuditEntry } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Details } from "../kit/layout";
import { DataTable, type Column } from "../kit/data-table";
import { inRange } from "@/lib/admin/metrics";

export function AuditPage() {
  const s = useAppState();
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const rows = s.admin.audit;
  const entities = Array.from(new Set(rows.map((r) => r.entity).filter(Boolean))) as string[];
  const actors = Array.from(new Set(rows.map((r) => r.actor)));
  const columns: Column<AuditEntry>[] = [
    { id: "when", header: "When", sort: (a) => a.createdAt, csv: (a) => a.createdAt, cell: (a) => <span className="whitespace-nowrap text-meta text-sub" title={new Date(a.createdAt).toLocaleString("en-GB")}>{timeAgo(a.createdAt)}</span> },
    { id: "actor", header: "Administrator", sort: (a) => a.actor, csv: (a) => a.actor, cell: (a) => <span className="text-meta">{a.actor}</span> },
    {
      id: "action",
      header: "Action",
      primary: true,
      sort: (a) => a.action,
      csv: (a) => a.action,
      cell: (a) => (
        <button type="button" onClick={() => setOpen(a)} className="inline-flex items-center gap-1.5 text-left font-medium text-ink underline-offset-4 hover:underline">
          {a.sensitive && <Lock size={12} className="shrink-0 text-caution" aria-label="Sensitive" />}
          {a.action}
        </button>
      ),
    },
    { id: "entity", header: "Entity", sort: (a) => a.entity ?? "", csv: (a) => a.entity, cell: (a) => <span className="text-meta capitalize text-sub">{a.entity?.replace("_", " ") ?? "—"}</span> },
    { id: "target", header: "Record", csv: (a) => a.target, cell: (a) => <span className="line-clamp-1 text-meta text-sub">{a.target}</span> },
    { id: "reason", header: "Reason", csv: (a) => a.reason, cell: (a) => <span className="line-clamp-1 text-meta text-sub">{a.reason ?? "—"}</span>, hideOnMobile: true },
  ];
  return (
    <>
      <AdminHeader
        title="Audit log"
        description="Every administrative action, newest first. The log is append-only: the database rejects edits and deletions. Entries are written by the server with each action; the latest 500 are shown."
      />
      <DataTable
        label="Audit entries"
        module="audit"
        rows={rows}
        columns={columns}
        getId={(a) => a.id}
        search={(a) => [a.action, a.target, a.actor, a.reason, a.targetId]}
        searchPlaceholder="Search actions, records, administrators or reasons"
        filters={[
          { id: "entity", label: "Entity", options: entities.map((e) => ({ value: e, label: e.replace("_", " ") })), test: (a, v) => a.entity === v },
          { id: "actor", label: "Administrator", options: actors.map((x) => ({ value: x, label: x })), test: (a, v) => a.actor === v },
          { id: "sensitive", label: "Sensitive", options: [{ value: "yes", label: "Sensitive access only" }], test: (a) => !!a.sensitive },
          { id: "when", label: "Date", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }], test: (a, v) => inRange(a.createdAt, v as "7") },
        ]}
        initialSort={{ id: "when", dir: "desc" }}
        exportName="truevix-audit-log"
        pageSize={25}
        emptyTitle="No administrative actions yet"
        emptyBody="Actions such as approvals, edits, exports and settings changes are recorded here."
      />
      {open && (
        <Dialog open onClose={() => setOpen(null)} title={open.action} description={new Date(open.createdAt).toLocaleString("en-GB")}>
          <Details
            items={[
              { label: "Administrator", value: open.actor },
              { label: "Admin role", value: open.actorRole },
              { label: "Entity", value: open.entity },
              { label: "Record", value: open.target },
              { label: "Record ID", value: open.targetId },
              { label: "Sensitive", value: open.sensitive ? "Yes — private or confidential information" : "No" },
              { label: "Previous value", value: open.before, wide: true },
              { label: "New value", value: open.after, wide: true },
              { label: "Reason", value: open.reason, wide: true },
              { label: "Date", value: formatDate(open.createdAt) },
            ]}
          />
        </Dialog>
      )}
    </>
  );
}
