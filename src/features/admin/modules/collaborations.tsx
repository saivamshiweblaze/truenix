"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineSelect } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { adminSetCollaboration } from "@/lib/store/admin-actions";
import { allIdeasAdmin, personById } from "@/lib/store/selectors";
import type { Collaboration, Idea } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Details } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";

const KIND: Record<Collaboration["kind"], string> = { request: "Collaboration request", invitation: "Invitation", cofounder_match: "Co-founder match", open_role: "Open role" };

export function CollaborationsPage() {
  const s = useAppState();
  const can = useCan();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"requests" | "teams">("requests");
  const [open, setOpen] = useState<Collaboration | null>(null);
  const ideas = allIdeasAdmin(s);
  const name = (id?: string) => (id ? (personById(s, id)?.name ?? "Unknown") : "—");
  const change = (c: Collaboration, status: Collaboration["status"]) =>
    confirm.ask({
      title: `Mark as ${status}?`,
      consequences: ["Both members see the new status. Use this for support requests or when a request breaks the rules."],
      confirmLabel: `Mark ${status}`,
      reason: "required",
      onConfirm: (r) => {
        adminSetCollaboration(c.id, { status }, r);
        toast("Collaboration updated");
      },
    });
  const columns: Column<Collaboration>[] = [
    {
      id: "role",
      header: "Role or request",
      primary: true,
      sort: (c) => c.role,
      csv: (c) => c.role,
      cell: (c) => (
        <button type="button" onClick={() => setOpen(c)} className="flex min-w-[12rem] flex-wrap items-center gap-1.5 text-left font-medium text-ink underline-offset-4 hover:underline">
          {c.role}
          {c.flagged && <Flag tone="caution">Reported</Flag>}
        </button>
      ),
    },
    { id: "kind", header: "Type", sort: (c) => c.kind, csv: (c) => KIND[c.kind], cell: (c) => <span className="text-meta text-sub">{KIND[c.kind]}</span> },
    { id: "from", header: "From", sort: (c) => name(c.fromId), csv: (c) => name(c.fromId), cell: (c) => <span className="text-meta text-sub">{name(c.fromId)}</span> },
    { id: "to", header: "To", sort: (c) => name(c.toId), csv: (c) => name(c.toId), cell: (c) => <span className="text-meta text-sub">{c.kind === "open_role" ? "Open to anyone" : name(c.toId)}</span> },
    { id: "idea", header: "Project", csv: (c) => ideas.find((i) => i.id === c.ideaId)?.title, cell: (c) => <span className="line-clamp-1 text-meta text-sub">{ideas.find((i) => i.id === c.ideaId)?.title.split(":")[0] ?? "—"}</span>, hideOnMobile: true },
    { id: "status", header: "Status", sort: (c) => c.status, csv: (c) => c.status, cell: (c) => <AdminStatus value={c.status} /> },
    { id: "created", header: "Created", sort: (c) => c.createdAt, csv: (c) => c.createdAt.slice(0, 10), cell: (c) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(c.createdAt)}</span> },
  ];
  const teamCols: Column<Idea>[] = [
    { id: "title", header: "Project", primary: true, sort: (i) => i.title, csv: (i) => i.title, cell: (i) => <span className="line-clamp-1 min-w-[12rem]">{i.title.split(":")[0]}</span> },
    { id: "size", header: "Team size", sort: (i) => i.team.length, csv: (i) => i.team.length, cell: (i) => <span className="text-meta tabular-nums text-sub">{i.team.length}</span> },
    { id: "members", header: "Members and roles", csv: (i) => i.team.map((t) => `${name(t.personId)} (${t.role})`), cell: (i) => <span className="text-meta text-sub">{i.team.map((t) => `${name(t.personId)} · ${t.role}`).join("; ")}</span> },
    { id: "needs", header: "Looking for", csv: (i) => i.collaborationNeeds, cell: (i) => <span className="line-clamp-2 text-meta text-sub">{i.collaborationNeeds || "—"}</span>, hideOnMobile: true },
  ];
  const rows = s.platform.collaborations;
  return (
    <>
      <AdminHeader title="Collaboration and teams" description="Collaboration requests, invitations, co-founder matches, open roles and project teams. Message content between members is not shown here." />
      <Tabs
        label="Collaboration views"
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: "requests", label: "Requests and roles", count: rows.length },
          { value: "teams", label: "Project teams", count: ideas.filter((i) => i.status === "submitted").length },
        ]}
      />
      {tab === "requests" ? (
        <DataTable
          key="req"
          label="Collaboration records"
          module="collaboration"
          rows={rows}
          columns={columns}
          getId={(c) => c.id}
          search={(c) => [c.role, c.message, name(c.fromId), name(c.toId)]}
          searchPlaceholder="Search roles, members or messages"
          filters={[
            { id: "kind", label: "Type", options: Object.entries(KIND).map(([value, label]) => ({ value, label })), test: (c, v) => c.kind === v },
            { id: "status", label: "Status", options: ["open", "pending", "accepted", "declined", "closed"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })), test: (c, v) => c.status === v },
            { id: "flag", label: "Reported", options: [{ value: "yes", label: "Reported only" }], test: (c) => !!c.flagged },
          ]}
          initialSort={{ id: "created", dir: "desc" }}
          exportName="truevix-collaborations"
        />
      ) : (
        <DataTable key="teams" label="Project teams" module="collaboration" rows={ideas.filter((i) => i.status === "submitted")} columns={teamCols} getId={(i) => i.id} search={(i) => [i.title, ...i.team.map((t) => name(t.personId))]} rowHref={(i) => `/admin/ideas/${i.id}?tab=team`} exportName="truevix-teams" />
      )}
      {open && (
        <Dialog
          open
          onClose={() => setOpen(null)}
          title={open.role}
          description={`${KIND[open.kind]} · ${formatDate(open.createdAt)}`}
          footer={
            can("collaboration", "edit") ? (
              <>
                {open.flagged && (
                  <Button size="sm" variant="secondary" onClick={() => (adminSetCollaboration(open.id, { clearFlag: true }, "Report reviewed"), setOpen(null), toast("Flag cleared"))}>
                    Clear report flag
                  </Button>
                )}
                <InlineSelect
                  aria-label="Change collaboration status"
                  className="h-8"
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const c = open;
                    setOpen(null);
                    change(c, e.target.value as Collaboration["status"]);
                  }}
                  options={[{ value: "", label: "Change status…" }, ...(["open", "pending", "accepted", "declined", "closed"] as const).filter((x) => x !== open.status).map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))]}
                />
              </>
            ) : undefined
          }
        >
          <Details
            items={[
              { label: "From", value: <Link href={`/admin/users/${open.fromId}`} className="underline underline-offset-4">{name(open.fromId)}</Link> },
              { label: "To", value: open.toId ? <Link href={`/admin/users/${open.toId}`} className="underline underline-offset-4">{name(open.toId)}</Link> : "Open to anyone" },
              { label: "Status", value: <AdminStatus value={open.status} /> },
              { label: "Project", value: ideas.find((i) => i.id === open.ideaId)?.title },
              { label: "Request text", value: open.message, wide: true },
              ...(open.flagged ? [{ label: "Report", value: `${open.flagged.reason} (${formatDate(open.flagged.at)})`, wide: true }] : []),
            ]}
          />
          {open.flagged && (
            <p className="mt-4 text-meta text-sub">
              See the related report in the{" "}
              <Link href="/admin/moderation" className="underline underline-offset-4">
                moderation queue
              </Link>
              .
            </p>
          )}
        </Dialog>
      )}
      {confirm.dialog}
    </>
  );
}
