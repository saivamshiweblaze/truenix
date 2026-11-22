"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineSelect, SelectField, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { industryLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminReviewTalent, adminSaveMentorship } from "@/lib/store/admin-actions";
import { allIdeasAdmin, personById } from "@/lib/store/selectors";
import type { Mentorship, TalentProfile } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Block, Details, Metric, MetricStrip, Timeline } from "../kit/layout";
import { AdminStatus } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";
import { RelatedList } from "./users";

const VERIF: Record<TalentProfile["verification"], string> = {
  self_declared: "Self-declared",
  references_requested: "References requested",
  admin_reviewed: "Reviewed by an administrator",
};

function MentorshipDialog({ onClose, mentorId }: { onClose: () => void; mentorId?: string }) {
  const s = useAppState();
  const mentors = s.platform.talent.filter((t) => t.status === "approved");
  const [f, setF] = useState({ mentorId: mentorId ?? "", menteeId: "", ideaId: "", focus: "" });
  const [error, setError] = useState<string>();
  const ideas = allIdeasAdmin(s).filter((i) => i.ownerId === f.menteeId);
  const save = () => {
    if (!f.mentorId || !f.menteeId) return setError("Choose a mentor and a member.");
    if (f.mentorId === f.menteeId) return setError("A member can’t mentor themselves.");
    if (f.focus.trim().length < 4) return setError("Describe the focus of the mentorship.");
    const t = s.platform.talent.find((x) => x.personId === f.mentorId);
    const active = s.platform.mentorships.filter((m) => m.mentorId === f.mentorId && m.status === "active").length;
    if (t && active >= t.capacity) return setError(`This mentor is at capacity (${t.capacity} active).`);
    adminSaveMentorship({ mentorId: f.mentorId, menteeId: f.menteeId, ideaId: f.ideaId || undefined, focus: f.focus.trim().slice(0, 160), status: "proposed", startedAt: new Date().toISOString().slice(0, 10) });
    toast("Mentorship proposed", { body: "Both members need to accept before it becomes active." });
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Propose a mentorship"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Propose mentorship</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField label="Mentor or expert" value={f.mentorId} onChange={(e) => setF({ ...f, mentorId: e.target.value })} options={[{ value: "", label: "Choose an approved mentor" }, ...mentors.map((t) => ({ value: t.personId, label: personById(s, t.personId)?.name ?? t.personId }))]} />
        <SelectField label="Member" value={f.menteeId} onChange={(e) => setF({ ...f, menteeId: e.target.value, ideaId: "" })} options={[{ value: "", label: "Choose a member" }, ...s.platform.people.map((p) => ({ value: p.id, label: p.name }))]} />
        <SelectField label="Project" value={f.ideaId} onChange={(e) => setF({ ...f, ideaId: e.target.value })} options={[{ value: "", label: "No specific project" }, ...ideas.map((i) => ({ value: i.id, label: i.title.split(":")[0] }))]} />
        <TextField label="Focus" value={f.focus} onChange={(e) => setF({ ...f, focus: e.target.value })} error={error} maxLength={160} />
      </div>
    </Dialog>
  );
}

/** Skill gaps: skills an idea needs that nobody on its team lists, and approved experts who list them. */
function SkillGaps() {
  const s = useAppState();
  const ideas = allIdeasAdmin(s).filter((i) => i.status === "submitted" && i.requiredSkills.length);
  const experts = s.platform.talent.filter((t) => t.status === "approved");
  return (
    <Block title="Skill gaps and possible matches" description="Calculated from each idea’s required skills and its team members’ listed skills. Matches are suggestions, not endorsements.">
      <ul>
        {ideas.map((i) => {
          const teamSkills = new Set(i.team.flatMap((t) => personById(s, t.personId)?.skills ?? []));
          const covered = i.requiredSkills.filter((k) => teamSkills.has(k));
          const gaps = i.requiredSkills.filter((k) => !teamSkills.has(k));
          const matches = experts.filter((t) => !i.team.some((m) => m.personId === t.personId) && (personById(s, t.personId)?.skills ?? []).some((k) => gaps.includes(k)));
          return (
            <li key={i.id} className="grid gap-2 border-b border-line py-3 last:border-b-0 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <Link href={`/admin/ideas/${i.id}`} className="text-ui font-medium hover:underline">
                  {i.title.split(":")[0]}
                </Link>
                <p className="text-micro text-mute">
                  Team covers {covered.length} of {i.requiredSkills.length} needed skills
                </p>
              </div>
              <p className="text-meta text-sub">
                <span className="text-micro text-mute">Gaps: </span>
                {gaps.join(", ") || "None"}
              </p>
              <p className="text-meta text-sub">
                <span className="text-micro text-mute">Experts with these skills: </span>
                {matches.map((m) => personById(s, m.personId)?.name).join(", ") || "None on TRUEVIX yet"}
              </p>
            </li>
          );
        })}
      </ul>
    </Block>
  );
}

export function TalentPage() {
  const s = useAppState();
  const can = useCan();
  const [tab, setTab] = useState<"directory" | "applications" | "mentorships" | "matching">("directory");
  const [proposing, setProposing] = useState(false);
  const rows = s.platform.talent;
  const columns: Column<TalentProfile>[] = [
    { id: "name", header: "Name", primary: true, sort: (t) => personById(s, t.personId)?.name ?? "", csv: (t) => personById(s, t.personId)?.name, cell: (t) => <span className="min-w-[10rem]">{personById(s, t.personId)?.name ?? t.personId}</span> },
    { id: "kind", header: "Type", sort: (t) => t.kind, csv: (t) => t.kind, cell: (t) => <span className="text-meta capitalize text-sub">{t.kind}</span> },
    { id: "areas", header: "Expertise", csv: (t) => t.areas, cell: (t) => <span className="text-meta text-sub">{t.areas.join(", ")}</span> },
    { id: "years", header: "Experience", sort: (t) => t.yearsExperience ?? 0, csv: (t) => t.yearsExperience, cell: (t) => <span className="text-meta tabular-nums text-sub">{t.yearsExperience ? `${t.yearsExperience} yrs (self-declared)` : "—"}</span>, hideOnMobile: true },
    { id: "avail", header: "Availability", sort: (t) => t.availability, csv: (t) => t.availability, cell: (t) => <span className="text-meta text-sub">{t.availability === "available" ? `Available · ${t.hoursPerMonth} h/month` : t.availability === "limited" ? "Limited" : "Unavailable"}</span> },
    { id: "verif", header: "Checks", sort: (t) => t.verification, csv: (t) => VERIF[t.verification], cell: (t) => <span className="text-meta text-sub">{VERIF[t.verification]}</span>, hideOnMobile: true },
    { id: "status", header: "Status", sort: (t) => t.status, csv: (t) => t.status, cell: (t) => <AdminStatus value={t.status} /> },
  ];
  const mentorshipCols: Column<Mentorship>[] = [
    { id: "pair", header: "Mentor and member", primary: true, csv: (m) => `${personById(s, m.mentorId)?.name} → ${personById(s, m.menteeId)?.name}`, cell: (m) => <span>{personById(s, m.mentorId)?.name} → {personById(s, m.menteeId)?.name}</span> },
    { id: "focus", header: "Focus", csv: (m) => m.focus, cell: (m) => <span className="text-meta text-sub">{m.focus}</span> },
    { id: "idea", header: "Project", cell: (m) => <span className="text-meta text-sub">{allIdeasAdmin(s).find((i) => i.id === m.ideaId)?.title.split(":")[0] ?? "—"}</span> },
    { id: "start", header: "Started", sort: (m) => m.startedAt, csv: (m) => m.startedAt, cell: (m) => <span className="text-meta text-sub">{formatDate(m.startedAt)}</span> },
    { id: "status", header: "Status", sort: (m) => m.status, csv: (m) => m.status, cell: (m) => <AdminStatus value={m.status} /> },
    {
      id: "act",
      header: "",
      cell: (m) =>
        can("talent", "edit") ? (
          <InlineSelect
            aria-label={`Change status of mentorship ${m.focus}`}
            className="h-8"
            value=""
            onChange={(e) => e.target.value && (adminSaveMentorship({ ...m, status: e.target.value as Mentorship["status"] }), toast("Mentorship updated"))}
            options={[{ value: "", label: "Change…" }, ...(["proposed", "active", "completed", "ended"] as const).filter((x) => x !== m.status).map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))]}
          />
        ) : null,
    },
  ];
  return (
    <>
      <AdminHeader
        title="Mentors and experts"
        description="Expert and mentor directory, applications, assignments and skill coverage. Experience and credentials are self-declared unless the record says an administrator checked them."
        actions={
          can("talent", "create") && (
            <Button size="sm" variant="secondary" onClick={() => setProposing(true)}>
              Propose mentorship
            </Button>
          )
        }
      />
      <MetricStrip cols={4}>
        <Metric label="Approved mentors" value={rows.filter((t) => t.kind === "mentor" && t.status === "approved").length} />
        <Metric label="Approved experts" value={rows.filter((t) => t.kind === "expert" && t.status === "approved").length} />
        <Metric label="Applications" value={rows.filter((t) => t.status === "applied").length} />
        <Metric label="Active mentorships" value={s.platform.mentorships.filter((m) => m.status === "active").length} />
      </MetricStrip>
      <Tabs
        label="Talent views"
        value={tab}
        onChange={setTab}
        className="my-5"
        items={[
          { value: "directory", label: "Directory", count: rows.length },
          { value: "applications", label: "Applications", count: rows.filter((t) => t.status === "applied").length },
          { value: "mentorships", label: "Assignments", count: s.platform.mentorships.length },
          { value: "matching", label: "Skill gaps and matching" },
        ]}
      />
      {(tab === "directory" || tab === "applications") && (
        <DataTable
          key={tab}
          label={tab === "directory" ? "Experts and mentors" : "Applications"}
          module="talent"
          rows={tab === "applications" ? rows.filter((t) => t.status === "applied") : rows}
          columns={columns}
          getId={(t) => t.personId}
          search={(t) => [personById(s, t.personId)?.name, t.areas.join(" "), (personById(s, t.personId)?.skills ?? []).join(" ")]}
          searchPlaceholder="Search by name, skill or expertise"
          filters={[
            { id: "kind", label: "Type", options: [{ value: "mentor", label: "Mentor" }, { value: "expert", label: "Expert" }], test: (t, v) => t.kind === v },
            { id: "avail", label: "Availability", options: [{ value: "available", label: "Available" }, { value: "limited", label: "Limited" }, { value: "unavailable", label: "Unavailable" }], test: (t, v) => t.availability === v },
          ]}
          rowHref={(t) => `/admin/talent/${t.personId}`}
          exportName="truevix-talent"
          emptyTitle={tab === "applications" ? "No applications waiting" : undefined}
        />
      )}
      {tab === "mentorships" && <DataTable label="Mentorship assignments" module="talent" rows={s.platform.mentorships} columns={mentorshipCols} getId={(m) => m.id} search={(m) => [m.focus, personById(s, m.mentorId)?.name, personById(s, m.menteeId)?.name]} initialSort={{ id: "start", dir: "desc" }} exportName="truevix-mentorships" />}
      {tab === "matching" && <SkillGaps />}
      {proposing && <MentorshipDialog onClose={() => setProposing(false)} />}
    </>
  );
}

export function TalentDetail({ id }: { id: string }) {
  const s = useAppState();
  const can = useCan();
  const confirm = useConfirm();
  const [proposing, setProposing] = useState(false);
  const t = s.platform.talent.find((x) => x.personId === id);
  const p = personById(s, id);
  const [cap, setCap] = useState({ availability: t?.availability ?? "available", hours: String(t?.hoursPerMonth ?? 0), capacity: String(t?.capacity ?? 1) });
  if (!t || !p) return <EmptyState title="Not in the talent directory" body="This member has no expert or mentor profile." action={<ButtonLink href="/admin/talent">Talent directory</ButtonLink>} />;
  const decide = (status: TalentProfile["status"]) =>
    confirm.ask({
      title: `${status === "approved" ? "Approve" : status === "rejected" ? "Reject" : status === "paused" ? "Pause" : "Reopen"} ${p.name}?`,
      consequences: [
        status === "approved" ? `${p.name} appears in the ${t.kind} directory and can be assigned. Approval is not a credential check.` : status === "rejected" ? "The application is declined. The member keeps their account." : "The profile is hidden from matching and assignments until resumed.",
        "Recorded in the audit log.",
      ],
      confirmLabel: status === "approved" ? "Approve" : status === "rejected" ? "Reject" : status === "paused" ? "Pause" : "Reopen",
      reason: status === "approved" ? "optional" : "required",
      onConfirm: (note) => {
        adminReviewTalent(id, { status, reviewNote: note || undefined }, status === "approved" ? `Approved ${t.kind}` : status === "rejected" ? `Rejected ${t.kind} application` : status === "paused" ? `Paused ${t.kind}` : `Reopened ${t.kind} application`);
        toast(status === "approved" ? "Approved" : status === "rejected" ? "Application rejected" : status === "paused" ? "Paused" : "Reopened");
      },
    });
  const mentorships = s.platform.mentorships.filter((m) => m.mentorId === id || m.menteeId === id);
  const collabs = s.platform.collaborations.filter((c) => c.fromId === id || c.toId === id);
  const judging = s.platform.opportunities.filter((o) => o.hackathon?.judges.includes(id));
  const audit = s.admin.audit.filter((e) => e.entity === "talent" && e.targetId === id);
  return (
    <>
      <AdminHeader
        title={p.name}
        flags={<AdminStatus value={t.status} />}
        description={p.headline}
        meta={
          <>
            <span className="capitalize">{t.kind}</span>
            <span>{VERIF[t.verification]}</span>
            <Link href={`/admin/users/${id}`} className="underline underline-offset-4">
              Member record
            </Link>
          </>
        }
        actions={
          can("talent", "approve") && (
            <>
              {t.status !== "approved" && (
                <Button size="sm" onClick={() => decide("approved")}>
                  Approve
                </Button>
              )}
              {t.status === "applied" && (
                <Button size="sm" variant="secondary" onClick={() => decide("rejected")}>
                  Reject
                </Button>
              )}
              {t.status === "approved" && (
                <Button size="sm" variant="secondary" onClick={() => decide("paused")}>
                  Pause
                </Button>
              )}
              {t.status === "approved" && (
                <Button size="sm" variant="ghost" onClick={() => setProposing(true)}>
                  Propose mentorship
                </Button>
              )}
            </>
          )
        }
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-8">
          {t.application && (
            <Block title="Application">
              <Details
                items={[
                  { label: "Submitted", value: formatDate(t.application.submittedAt) },
                  { label: "Statement", value: t.application.statement, wide: true },
                ]}
              />
            </Block>
          )}
          <Block title="Expertise">
            <Details
              items={[
                { label: "Areas", value: t.areas.join(", "), wide: true },
                { label: "Skills", value: p.skills.join(", "), wide: true },
                { label: "Industries", value: p.interests.map(industryLabel).join(", "), wide: true },
                { label: "Experience", value: t.yearsExperience ? `${t.yearsExperience} years (self-declared)` : "Not stated" },
                { label: "Work history", value: p.experience.map((x) => `${x.title}, ${x.org} (${x.period})`).join("; "), wide: true },
              ]}
            />
          </Block>
          <Block title="Checks" description="Record only what you actually did. TRUEVIX never displays a credential as verified.">
            {can("talent", "edit") ? (
              <SelectField
                label="What has been checked"
                value={t.verification}
                onChange={(e) => (adminReviewTalent(id, { verification: e.target.value as TalentProfile["verification"] }, "Updated expert checks"), toast("Checks updated"))}
                options={Object.entries(VERIF).map(([value, label]) => ({ value, label }))}
              />
            ) : (
              <p className="text-ui">{VERIF[t.verification]}</p>
            )}
            {t.reviewNote && <p className="mt-2 text-meta text-sub">Note: {t.reviewNote}</p>}
          </Block>
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Availability and capacity">
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="Availability" value={cap.availability} onChange={(e) => setCap({ ...cap, availability: e.target.value as TalentProfile["availability"] })} options={[{ value: "available", label: "Available" }, { value: "limited", label: "Limited" }, { value: "unavailable", label: "Unavailable" }]} />
              <TextField label="Hours / month" inputMode="numeric" value={cap.hours} onChange={(e) => setCap({ ...cap, hours: e.target.value })} />
              <TextField label="Max mentees" inputMode="numeric" value={cap.capacity} onChange={(e) => setCap({ ...cap, capacity: e.target.value })} />
            </div>
            {can("talent", "edit") && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  const hours = Number(cap.hours);
                  const capacity = Number(cap.capacity);
                  if (!Number.isInteger(hours) || hours < 0 || hours > 80 || !Number.isInteger(capacity) || capacity < 0 || capacity > 20) return toast("Use whole numbers: up to 80 hours and 20 mentees.");
                  adminReviewTalent(id, { availability: cap.availability as TalentProfile["availability"], hoursPerMonth: hours, capacity }, "Updated availability");
                  toast("Availability saved");
                }}
              >
                Save availability
              </Button>
            )}
          </Block>
          <Block title="Assignments and collaboration">
            <RelatedList
              items={[
                ...mentorships.map((m) => ({ id: m.id, href: "/admin/talent", title: `Mentorship: ${m.focus}`, meta: m.status })),
                ...judging.map((o) => ({ id: o.id, href: `/admin/opportunities/${o.id}?tab=hackathon`, title: `Judge: ${o.title}`, meta: "assigned" })),
                ...collabs.map((c) => ({ id: c.id, href: "/admin/collaboration", title: `${c.kind.replace("_", " ")}: ${c.role}`, meta: c.status })),
              ]}
            />
          </Block>
          <Block title="Review history">
            <Timeline events={audit.map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `${e.action}${e.reason ? ` — ${e.reason}` : ""}` }))} empty="No decisions recorded yet." />
          </Block>
        </div>
      </div>
      {proposing && <MentorshipDialog mentorId={id} onClose={() => setProposing(false)} />}
      {confirm.dialog}
    </>
  );
}
