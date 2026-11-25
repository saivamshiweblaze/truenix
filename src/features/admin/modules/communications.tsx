"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckboxField, ChipGroup, SelectField, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { roleLabel, ROLES } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminAccessConversation, adminArchiveAnnouncement, adminPublishAnnouncement, adminSaveAnnouncement } from "@/lib/store/admin-actions";
import { allThreads, messagesFor, personById } from "@/lib/store/selectors";
import type { Announcement, AnnouncementChannel, RoleId, Thread } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Block } from "../kit/layout";
import { AdminStatus } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";

const CHANNEL: Record<AnnouncementChannel, string> = { in_app: "In-app notification", banner: "Site banner", email: "Email" };

function Editor({ existing, onClose }: { existing?: Announcement; onClose: () => void }) {
  const can = useCan();
  const [f, setF] = useState({
    title: existing?.title ?? "",
    body: existing?.body ?? "",
    audience: (existing?.audience ?? []) as string[],
    channels: existing?.channels ?? (["in_app"] as AnnouncementChannel[]),
    when: existing?.scheduledFor?.slice(0, 16) ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const check = () => {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 5) e.title = "Write a title of at least 5 characters.";
    if (f.body.trim().length < 10) e.body = "Write the announcement (at least 10 characters).";
    if (!f.channels.length) e.channels = "Choose at least one channel.";
    setErrors(e);
    return !Object.keys(e).length;
  };
  const save = (mode: "draft" | "publish" | "schedule") => {
    if (!check()) return;
    if (mode === "schedule" && (!f.when || new Date(f.when).getTime() <= Date.now())) return setErrors({ when: "Choose a time in the future." });
    const id = adminSaveAnnouncement({ id: existing?.id, title: f.title, body: f.body, audience: f.audience as RoleId[], channels: f.channels });
    if (mode === "publish") adminPublishAnnouncement(id);
    if (mode === "schedule") adminPublishAnnouncement(id, new Date(f.when).toISOString());
    toast(mode === "publish" ? "Announcement published" : mode === "schedule" ? "Announcement scheduled" : "Draft saved", {
      body: mode === "publish" && f.channels.includes("email") ? "Email was not sent: no email provider is connected. See the delivery log." : undefined,
    });
    onClose();
  };
  const toggleChannel = (c: AnnouncementChannel, on: boolean) => setF((x) => ({ ...x, channels: on ? [...x.channels, c] : x.channels.filter((y) => y !== c) }));
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={existing ? "Edit announcement" : "New announcement"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => check() && setPreview((v) => !v)}>
            {preview ? "Back to editing" : "Preview"}
          </Button>
          <Button variant="secondary" onClick={() => save("draft")}>
            Save draft
          </Button>
          {can("communications", "publish") && (
            <>
              <Button variant="secondary" onClick={() => save("schedule")}>
                Schedule
              </Button>
              <Button onClick={() => save("publish")}>Publish now</Button>
            </>
          )}
        </>
      }
    >
      {preview ? (
        <div className="flex flex-col gap-4">
          <p className="text-meta text-sub">As a notification:</p>
          <div className="rounded-md border border-line p-4">
            <p className="text-ui font-semibold">{f.title}</p>
            <p className="mt-1 text-ui text-charcoal">{f.body}</p>
          </div>
          {f.channels.includes("banner") && (
            <>
              <p className="text-meta text-sub">As the site banner:</p>
              <div className="rounded-sm bg-ink px-4 py-2 text-meta text-white">
                {f.title}. {f.body}
              </div>
            </>
          )}
          <p className="text-meta text-sub">Audience: {f.audience.length ? f.audience.map((r) => roleLabel(r as RoleId)).join(", ") : "Everyone"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <TextField label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={errors.title} maxLength={140} />
          <TextArea label="Message" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} error={errors.body} maxLength={1200} hint="Plain text. Links and formatting are not rendered." />
          <ChipGroup legend="Audience" hint="Leave empty to reach everyone." options={ROLES.map((r) => ({ value: r.id, label: r.short }))} value={f.audience} onChange={(v) => setF({ ...f, audience: v })} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-ui font-medium text-charcoal">Channels</legend>
            <CheckboxField checked={f.channels.includes("in_app")} onChange={(v) => toggleChannel("in_app", v)} label="In-app notification" />
            <CheckboxField checked={f.channels.includes("banner")} onChange={(v) => toggleChannel("banner", v)} label="Site banner (shown on public and member pages)" />
            <CheckboxField checked={f.channels.includes("email")} onChange={(v) => toggleChannel("email", v)} label="Email — not connected. Publishing records it as not sent." />
            {errors.channels && (
              <p role="alert" className="text-meta text-danger">
                {errors.channels}
              </p>
            )}
          </fieldset>
          <TextField label="Schedule for" type="datetime-local" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} error={errors.when} optional hint="Used by Schedule. Scheduled announcements are shown from this time. In-app notifications are created when you publish." />
        </div>
      )}
    </Dialog>
  );
}

function ConversationAccess({ thread, onClose }: { thread: Thread; onClose: () => void }) {
  const s = useAppState();
  const [reason, setReason] = useState("safety");
  const [caseRef, setCaseRef] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();
  const [opened, setOpened] = useState(false);
  const msgs = messagesFor(s, thread.id);
  return (
    <Dialog open onClose={onClose} size="lg" title={opened ? thread.subject : "Open a private conversation"} description={opened ? "Opened under a documented workflow. Access was logged." : undefined}>
      {opened ? (
        <ul className="flex flex-col gap-3">
          {msgs.map((m) => (
            <li key={m.id} className="rounded-md bg-surface p-3">
              <p className="text-micro text-mute">
                {m.authorId === "me" ? s.user?.name : personById(s, m.authorId)?.name} · {formatDate(m.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-line text-ui">{m.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="flex gap-2 text-ui text-charcoal">
            <Lock size={16} className="mt-0.5 shrink-0" aria-hidden />
            Direct messages are private. Open one only for a support request the member made, a safety investigation, or a legal obligation. Your name, the reason and the case reference are permanently recorded.
          </p>
          <SelectField
            label="Workflow"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={[
              { value: "support", label: "Support request from a participant" },
              { value: "safety", label: "Safety investigation" },
              { value: "legal", label: "Legal obligation" },
            ]}
          />
          <TextField label="Case reference" value={caseRef} onChange={(e) => (setCaseRef(e.target.value), setError(undefined))} error={error} placeholder="e.g. SAFE-2026-014" maxLength={40} />
          <CheckboxField checked={confirm} onChange={setConfirm} label="I confirm this access is necessary and limited to this case." />
          <div>
            <Button
              disabled={!confirm}
              onClick={() => {
                if (caseRef.trim().length < 3) return setError("Enter the case reference.");
                adminAccessConversation(thread.id, thread.subject, reason, caseRef.trim());
                setOpened(true);
              }}
            >
              Open conversation
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function CommunicationsPage() {
  const s = useAppState();
  const can = useCan();
  const params = useSearchParams();
  const [tab, setTab] = useState<"announcements" | "delivery" | "conversations">("announcements");
  const [editing, setEditing] = useState<Announcement | "new" | null>(params.get("new") ? "new" : null);
  const [thread, setThread] = useState<Thread | null>(null);
  const anns = s.platform.announcements;
  const deliveries = anns.flatMap((a) => a.deliveries.map((d, i) => ({ ...d, id: `${a.id}-${i}`, title: a.title })));
  const threads = allThreads(s);
  const annCols: Column<Announcement>[] = [
    { id: "title", header: "Announcement", primary: true, sort: (a) => a.title, csv: (a) => a.title, cell: (a) => <button type="button" className="min-w-[12rem] text-left font-medium text-ink underline-offset-4 hover:underline" onClick={() => setEditing(a)}>{a.title}</button> },
    { id: "aud", header: "Audience", csv: (a) => (a.audience.length ? a.audience.join("; ") : "everyone"), cell: (a) => <span className="text-meta text-sub">{a.audience.length ? a.audience.map((r) => ROLES.find((x) => x.id === r)?.short).join(", ") : "Everyone"}</span> },
    { id: "ch", header: "Channels", csv: (a) => a.channels.join("; "), cell: (a) => <span className="text-meta text-sub">{a.channels.map((c) => CHANNEL[c]).join(", ")}</span>, hideOnMobile: true },
    { id: "status", header: "Status", sort: (a) => a.status, csv: (a) => a.status, cell: (a) => <AdminStatus value={a.status} /> },
    { id: "when", header: "Published or scheduled", sort: (a) => a.publishedAt ?? a.scheduledFor ?? a.createdAt, csv: (a) => a.publishedAt ?? a.scheduledFor, cell: (a) => <span className="whitespace-nowrap text-meta text-sub">{a.publishedAt ? formatDate(a.publishedAt) : a.scheduledFor ? `For ${formatDate(a.scheduledFor)}` : "—"}</span> },
    {
      id: "act",
      header: "",
      cell: (a) =>
        can("communications", "archive") && a.status !== "archived" ? (
          <Button size="sm" variant="ghost" onClick={() => (adminArchiveAnnouncement(a.id), toast("Announcement archived", { body: "It no longer appears to members." }))}>
            Archive
          </Button>
        ) : null,
    },
  ];
  type D = (typeof deliveries)[number];
  const delCols: Column<D>[] = [
    { id: "title", header: "Announcement", primary: true, csv: (d) => d.title, cell: (d) => d.title },
    { id: "ch", header: "Channel", csv: (d) => d.channel, cell: (d) => <span className="text-meta text-sub">{CHANNEL[d.channel]}</span> },
    { id: "status", header: "Result", sort: (d) => d.status, csv: (d) => d.status, cell: (d) => <AdminStatus value={d.status === "not_sent" ? "failed" : "completed"} label={d.status === "not_sent" ? "Not sent" : d.status === "shown_as_banner" ? "Shown as banner" : "Delivered in-app"} /> },
    { id: "detail", header: "Detail", csv: (d) => d.detail, cell: (d) => <span className="text-meta text-sub">{d.detail}</span> },
    { id: "at", header: "When", sort: (d) => d.at, csv: (d) => d.at, cell: (d) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(d.at)}</span> },
  ];
  const threadCols: Column<Thread>[] = [
    { id: "subject", header: "Conversation", primary: true, csv: (t) => t.subject, cell: (t) => <span className="min-w-[12rem]">{t.subject}</span> },
    { id: "kind", header: "Type", csv: (t) => t.kind, cell: (t) => <span className="text-meta capitalize text-sub">{t.kind.replace(/_/g, " ")}</span> },
    { id: "people", header: "Participants", cell: (t) => <span className="text-meta text-sub">{s.user?.name} and {personById(s, t.participantId)?.name}</span> },
    { id: "count", header: "Messages", cell: (t) => <span className="text-meta tabular-nums text-sub">{messagesFor(s, t.id).length}</span> },
    { id: "last", header: "Last message", cell: (t) => <span className="text-meta text-sub">{messagesFor(s, t.id).at(-1) ? timeAgo(messagesFor(s, t.id).at(-1)!.createdAt) : "—"}</span> },
    {
      id: "act",
      header: "",
      cell: (t) =>
        can("communications", "approve") ? (
          <Button size="sm" variant="ghost" onClick={() => setThread(t)}>
            <Lock size={13} aria-hidden /> Open with a case
          </Button>
        ) : (
          <span className="text-micro text-mute">Restricted</span>
        ),
    },
  ];
  return (
    <>
      <AdminHeader
        title="Announcements and messaging"
        description="Draft, preview, schedule and publish announcements. Announcements are delivered as in-app notifications and as a site banner. Email and SMS are not connected."
        actions={
          can("communications", "create") && (
            <Button size="sm" variant="accent" onClick={() => setEditing("new")}>
              <Plus size={15} aria-hidden /> New announcement
            </Button>
          )
        }
      />
      <Tabs
        label="Communication views"
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: "announcements", label: "Announcements", count: anns.length },
          { value: "delivery", label: "Delivery log", count: deliveries.length },
          { value: "conversations", label: "Private conversations" },
        ]}
      />
      {tab === "announcements" && <DataTable key="a" label="Announcements" module="communications" rows={anns} columns={annCols} getId={(a) => a.id} search={(a) => [a.title, a.body]} filters={[{ id: "status", label: "Status", options: ["draft", "scheduled", "published", "archived"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })), test: (a, v) => a.status === v }]} initialSort={{ id: "when", dir: "desc" }} exportName="truevix-announcements" />}
      {tab === "delivery" && (
        <>
          <p className="mb-3 text-meta text-sub">Every delivery attempt, including channels that could not be used. “Not sent” means no provider is connected for that channel, so nothing was attempted.</p>
          <DataTable key="d" label="Delivery records" module="communications" rows={deliveries} columns={delCols} getId={(d) => d.id} search={(d) => [d.title, d.detail]} filters={[{ id: "status", label: "Result", options: [{ value: "not_sent", label: "Not sent" }, { value: "delivered_in_app", label: "Delivered in-app" }, { value: "shown_as_banner", label: "Shown as banner" }], test: (d, v) => d.status === v }]} initialSort={{ id: "at", dir: "desc" }} exportName="truevix-deliveries" emptyBody="Deliveries are recorded when an announcement is published." />
        </>
      )}
      {tab === "conversations" && (
        <Block title="Private conversations" description="Metadata only. Message content stays closed unless opened under a documented support, safety or legal case, which is permanently logged.">
          <p className="mb-3 text-micro text-mute">Only your own conversations are listed. Opening another member’s conversation requires a documented case and is audited.</p>
          <DataTable label="Conversations" module="communications" rows={threads} columns={threadCols} getId={(t) => t.id} search={(t) => [t.subject]} />
        </Block>
      )}
      {editing && <Editor existing={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {thread && <ConversationAccess thread={thread} onClose={() => setThread(null)} />}
    </>
  );
}
