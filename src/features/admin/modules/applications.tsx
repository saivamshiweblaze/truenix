"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineSelect, SelectField, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { adminAddRegistration, adminAddRegistrationNote, adminAddSubmission, adminSetRegistrationStatus } from "@/lib/store/admin-actions";
import { personById } from "@/lib/store/selectors";
import type { FileMeta, Opportunity, Registration, RegistrationStatus } from "@/lib/types";
import { formatDate, timeAgo, uid } from "@/lib/utils";
import { AdminHeader, Block, Details, Timeline } from "../kit/layout";
import { AdminStatus } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";
import { AdminFileField } from "../kit/upload";

export const REG_STATUSES: { value: RegistrationStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "info_requested", label: "Request more information" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "selected", label: "Selected" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const regName = (r: Registration) => r.teamName || r.members[0]?.name || "Applicant";

/** Weighted average score (0–10) for a registration across judges, for one round or all rounds. */
export function weightedScore(r: Registration, o: Opportunity, roundId?: string) {
  const criteria = o.hackathon?.criteria ?? [];
  const scores = r.scores.filter((x) => !roundId || x.roundId === roundId);
  if (!criteria.length || !scores.length) return null;
  const judges = Array.from(new Set(scores.map((x) => `${x.roundId}|${x.judgeId}`)));
  const totals = judges.map((j) => {
    const [round, judge] = j.split("|");
    const totalWeight = criteria.reduce((a, c) => a + c.weight, 0) || 1;
    return criteria.reduce((a, c) => a + (scores.find((x) => x.roundId === round && x.judgeId === judge && x.criterionId === c.id)?.score ?? 0) * c.weight, 0) / totalWeight;
  });
  return Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10;
}

export function useStatusDialog() {
  const confirm = useConfirm();
  const ask = (ids: string[], label: string, status: RegistrationStatus, done?: () => void) => {
    const meta = REG_STATUSES.find((x) => x.value === status)!;
    confirm.ask({
      title: `${meta.label}: ${label}?`,
      consequences: [
        status === "rejected" ? "The applicant’s status changes to Rejected. They see the new status and an in-app notification; no email is sent." : status === "info_requested" ? "The applicant is marked as needing to provide more information. Contact them through the listed channel; no email is sent." : `The status changes to ${meta.label.toLowerCase()}.`,
        "The change is added to the application’s history and the audit log.",
      ],
      confirmLabel: meta.label,
      reason: status === "rejected" || status === "info_requested" ? "required" : "optional",
      reasonLabel: status === "info_requested" ? "What information is needed?" : "Note",
      onConfirm: (note) => {
        adminSetRegistrationStatus(ids, status, note);
        toast(`Status changed to ${meta.label.toLowerCase()}`);
        done?.();
      },
    });
  };
  return { ask, dialog: confirm.dialog };
}

export function AddRegistrationDialog({ o, onClose }: { o: Opportunity; onClose: () => void }) {
  const s = useAppState();
  const [f, setF] = useState({ applicantId: "", mode: "individual", teamName: "", members: "", statement: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => {
    const err: Record<string, string> = {};
    if (!f.applicantId) err.applicantId = "Choose the lead applicant.";
    if (f.mode === "team" && f.teamName.trim().length < 2) err.teamName = "Enter a team name.";
    const extra = f.members
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, role] = l.split(/\s+[-–—]\s+/);
        return { name: name.trim().slice(0, 80), role: (role ?? "Member").trim().slice(0, 60) };
      });
    const size = 1 + (f.mode === "team" ? extra.length : 0);
    if (o.teamMax && size > o.teamMax) err.members = `This opportunity allows at most ${o.teamMax} people per team.`;
    if (f.mode === "team" && o.teamMin && size < o.teamMin) err.members = `Teams need at least ${o.teamMin} people.`;
    if (f.statement.trim().length < 10) err.statement = "Describe what they will work on (at least 10 characters).";
    setErrors(err);
    if (Object.keys(err).length) return;
    const lead = personById(s, f.applicantId);
    adminAddRegistration({
      opportunityId: o.id,
      applicantId: f.applicantId,
      mode: f.mode as "individual" | "team",
      teamName: f.mode === "team" ? f.teamName.trim() : undefined,
      members: [{ name: lead?.name ?? "Applicant", role: "Lead", personId: f.applicantId }, ...(f.mode === "team" ? extra : [])],
      statement: f.statement.trim(),
    });
    toast("Registration added", { body: "Recorded as added by an administrator." });
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Add a registration"
      description="For registrations received outside TRUEVIX (for example, at an event desk), or to test the workflow. It is labelled as added by an administrator."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Add registration</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField label="Lead applicant" value={f.applicantId} onChange={set("applicantId")} error={errors.applicantId} options={[{ value: "", label: "Choose a member" }, ...s.platform.people.map((p) => ({ value: p.id, label: p.name }))]} />
        <SelectField label="Registration type" value={f.mode} onChange={set("mode")} options={[{ value: "individual", label: "Individual" }, { value: "team", label: "Team" }]} />
        {f.mode === "team" && (
          <>
            <TextField label="Team name" value={f.teamName} onChange={set("teamName")} error={errors.teamName} maxLength={80} />
            <TextArea label="Other team members" rows={3} value={f.members} onChange={set("members")} error={errors.members} hint={`One per line, as “Name — role”.${o.teamMax ? ` Up to ${o.teamMax} people including the lead.` : ""}`} />
          </>
        )}
        <TextArea label="What they will work on" rows={3} value={f.statement} onChange={set("statement")} error={errors.statement} maxLength={1200} />
      </div>
    </Dialog>
  );
}

export function ApplicationsTable({ o }: { o: Opportunity }) {
  const s = useAppState();
  const can = useCan();
  const status = useStatusDialog();
  const [adding, setAdding] = useState(false);
  const rows = s.platform.registrations.filter((r) => r.opportunityId === o.id);
  const columns: Column<Registration>[] = [
    { id: "name", header: "Applicant or team", primary: true, sort: regName, csv: regName, cell: (r) => <span className="min-w-[10rem]">{regName(r)}</span> },
    { id: "lead", header: "Lead", sort: (r) => personById(s, r.applicantId)?.name ?? "", csv: (r) => personById(s, r.applicantId)?.name, cell: (r) => <span className="text-meta text-sub">{personById(s, r.applicantId)?.name ?? "—"}</span> },
    { id: "mode", header: "Type", sort: (r) => r.mode, csv: (r) => r.mode, cell: (r) => <span className="text-meta text-sub">{r.mode === "team" ? `Team of ${r.members.length}` : "Individual"}</span> },
    { id: "status", header: "Status", sort: (r) => r.status, csv: (r) => r.status, cell: (r) => <AdminStatus value={r.status} /> },
    { id: "subs", header: "Submissions", sort: (r) => r.submissions.length, csv: (r) => r.submissions.length, cell: (r) => <span className="text-meta tabular-nums text-sub">{r.submissions.length}</span> },
    { id: "score", header: "Score", sort: (r) => weightedScore(r, o) ?? -1, csv: (r) => weightedScore(r, o), cell: (r) => <span className="text-meta tabular-nums text-sub">{weightedScore(r, o) ?? "—"}</span>, hideOnMobile: !o.hackathon },
    { id: "created", header: "Registered", sort: (r) => r.createdAt, csv: (r) => r.createdAt.slice(0, 10), cell: (r) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(r.createdAt)}</span> },
  ];
  return (
    <>
      <DataTable
        label="Applications"
        module="opportunities"
        rows={rows}
        columns={columns}
        getId={(r) => r.id}
        search={(r) => [r.teamName, r.statement, ...r.members.map((m) => m.name)]}
        searchPlaceholder="Search applicants, teams or statements"
        filters={[{ id: "status", label: "Status", options: REG_STATUSES.map((x) => ({ value: x.value, label: x.value === "info_requested" ? "Information requested" : x.label })), test: (r, v) => r.status === v }]}
        initialSort={{ id: "created", dir: "desc" }}
        rowHref={(r) => `/admin/opportunities/${o.id}/applications/${r.id}`}
        exportName={`truevix-applications-${o.id}`}
        emptyTitle="No applications yet"
        emptyBody={o.registrationMode === "on_platform" ? "Members can register from the public listing once it is published and open." : "This listing sends members to the organiser’s own site, so applications aren’t collected on TRUEVIX."}
        toolbarExtra={
          can("opportunities", "create") ? (
            <Button size="sm" variant="secondary" className="h-10" onClick={() => setAdding(true)}>
              Add registration
            </Button>
          ) : undefined
        }
        bulk={(ids, clear) =>
          can("opportunities", "approve") ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => status.ask(ids, `${ids.length} applications`, "under_review", clear)}>
                Mark under review
              </Button>
              <Button size="sm" variant="secondary" onClick={() => status.ask(ids, `${ids.length} applications`, "shortlisted", clear)}>
                Shortlist
              </Button>
              <Button size="sm" variant="secondary" onClick={() => status.ask(ids, `${ids.length} applications`, "rejected", clear)}>
                Reject
              </Button>
            </>
          ) : null
        }
      />
      {adding && <AddRegistrationDialog o={o} onClose={() => setAdding(false)} />}
      {status.dialog}
    </>
  );
}

const httpsUrl = (v: string) => /^https:\/\/[^\s]+\.[^\s]+$/i.test(v.trim());

function SubmissionForm({ r, o }: { r: Registration; o: Opportunity }) {
  const rounds = o.hackathon?.rounds ?? [];
  const [f, setF] = useState({ roundId: rounds[0]?.id ?? "main", title: "", link: "" });
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [error, setError] = useState<string>();
  const save = () => {
    if (f.title.trim().length < 3) return setError("Give the submission a title.");
    if (f.link.trim() && !httpsUrl(f.link)) return setError("Links must start with https://");
    adminAddSubmission(r.id, { id: uid("sub"), roundId: f.roundId, title: f.title.trim().slice(0, 140), link: f.link.trim() || undefined, files, at: new Date().toISOString() });
    toast("Submission recorded");
    setF({ ...f, title: "", link: "" });
    setFiles([]);
    setError(undefined);
  };
  return (
    <div className="flex flex-col gap-3 rounded-md bg-surface p-4">
      <p className="text-ui font-semibold">Record a submission</p>
      {rounds.length > 0 && <SelectField label="Round" value={f.roundId} onChange={(e) => setF({ ...f, roundId: e.target.value })} options={rounds.map((x) => ({ value: x.id, label: x.name }))} />}
      <TextField label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={140} />
      <TextField label="Link" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} optional placeholder="https://" />
      <AdminFileField kind="document" slot={`reg:${r.id}:sub`} label="Attachments" value={files} onChange={setFiles} multiple />
      {error && (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
      <div>
        <Button size="sm" onClick={save}>
          Record submission
        </Button>
      </div>
    </div>
  );
}

export function ApplicationDetail({ opportunityId, id }: { opportunityId: string; id: string }) {
  const s = useAppState();
  const can = useCan();
  const status = useStatusDialog();
  const [note, setNote] = useState("");
  const o = s.platform.opportunities.find((x) => x.id === opportunityId);
  const r = s.platform.registrations.find((x) => x.id === id && x.opportunityId === opportunityId);
  if (!o || !r) return <EmptyState title="Application not found" body="It may have been withdrawn." action={<ButtonLink href={`/admin/opportunities/${opportunityId}?tab=applications`}>All applications</ButtonLink>} />;
  const lead = personById(s, r.applicantId);
  const score = weightedScore(r, o);
  return (
    <>
      <AdminHeader
        title={regName(r)}
        flags={<AdminStatus value={r.status} />}
        description={`Application to ${o.title}`}
        meta={
          <>
            <span>{r.mode === "team" ? `Team of ${r.members.length}` : "Individual"}</span>
            <span>Registered {formatDate(r.createdAt)}</span>
            {score !== null && <span>Weighted score {score} / 10</span>}
          </>
        }
        actions={
          can("opportunities", "approve") ? (
            <InlineSelect
              aria-label="Change application status"
              value=""
              className="h-8"
              onChange={(e) => e.target.value && status.ask([r.id], regName(r), e.target.value as RegistrationStatus)}
              options={[{ value: "", label: "Change status…" }, ...REG_STATUSES.filter((x) => x.value !== r.status).map((x) => ({ value: x.value, label: x.label }))]}
            />
          ) : undefined
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Application">
            <Details
              items={[
                { label: "Lead applicant", value: lead ? <Link href={`/admin/users/${r.applicantId}`} className="underline underline-offset-4">{lead.name}</Link> : "Unknown" },
                { label: "Headline", value: lead?.headline },
                { label: "What they will work on", value: r.statement, wide: true },
              ]}
            />
          </Block>
          <Block title="Team members">
            <ul>
              {r.members.map((m, i) => (
                <li key={`${m.name}-${i}`} className="flex justify-between gap-3 border-b border-line py-2 text-ui last:border-b-0">
                  {m.personId ? (
                    <Link href={`/admin/users/${m.personId}`} className="hover:underline">
                      {m.name}
                    </Link>
                  ) : (
                    <span>
                      {m.name} <span className="text-micro text-mute">(not a member)</span>
                    </span>
                  )}
                  <span className="text-meta text-sub">{m.role}</span>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Submissions">
            {r.submissions.length ? (
              <ul className="mb-4">
                {r.submissions.map((x) => (
                  <li key={x.id} className="border-b border-line py-2 last:border-b-0">
                    <p className="text-ui font-medium">{x.title}</p>
                    <p className="text-meta text-sub">
                      {o.hackathon?.rounds.find((rd) => rd.id === x.roundId)?.name ?? "Main"} · {formatDate(x.at)}
                      {x.link && (
                        <>
                          {" · "}
                          <a href={x.link} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">
                            Open link
                          </a>
                        </>
                      )}
                    </p>
                    {x.files.length > 0 && <p className="text-micro text-mute">Files: {x.files.map((f) => f.name).join(", ")} (metadata only)</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-meta text-sub">No submissions yet.</p>
            )}
            {can("opportunities", "edit") && <SubmissionForm r={r} o={o} />}
          </Block>
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Internal reviewer notes" description="Never shown to the applicant.">
            {can("opportunities", "edit") && (
              <div className="mb-4 flex flex-col gap-2">
                <TextArea label="Add a note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
                <div>
                  <Button size="sm" variant="secondary" disabled={note.trim().length < 2} onClick={() => (adminAddRegistrationNote(r.id, note), setNote(""), toast("Note added"))}>
                    Add note
                  </Button>
                </div>
              </div>
            )}
            <Timeline events={r.notes.map((n) => ({ id: n.id, at: n.at, by: n.by, text: n.text }))} empty="No notes yet." />
          </Block>
          <Block title="Status history">
            <Timeline events={r.history} />
          </Block>
        </div>
      </div>
      {status.dialog}
    </>
  );
}
