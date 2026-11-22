"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChipGroup, InlineSelect, SelectField, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, EmptyState, Progress } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { INDUSTRIES, industryLabel, roleLabel, roleShort, ROLES } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminSetAccountStatus, adminSetMemberRole, adminUpdateMember } from "@/lib/store/admin-actions";
import { allIdeasAdmin, allPostsAdmin } from "@/lib/store/selectors";
import { memberRow, memberRows, type MemberRow } from "@/lib/admin/members";
import { inRange } from "@/lib/admin/metrics";
import { emailSchema, linkedinSchema, normalisePhone, phoneSchema } from "@/lib/validation";
import type { AccountStatus, IndustryId, RoleId } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Block, Details, PrivateValue, Timeline } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column, type FilterDef } from "../kit/data-table";
import { PermButton, useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";
import { RecordTabs, useTabParam } from "../kit/record-tabs";

const STATUS_ACTIONS: { status: AccountStatus; label: string; consequence: string }[] = [
  { status: "active", label: "Reactivate", consequence: "The member regains full access and appears in Community and search again." },
  { status: "restricted", label: "Restrict", consequence: "The member keeps their account but is marked restricted: posting and messaging are limited (enforced server-side in Phase 2)." },
  { status: "suspended", label: "Suspend", consequence: "The member’s profile, posts and ideas are hidden from other members until reactivated. Nothing is deleted." },
  { status: "deactivated", label: "Deactivate", consequence: "The account is closed and hidden. Records are kept for the retention period and can be restored." },
];

export function useStatusChange() {
  const confirm = useConfirm();
  const ask = (ids: string[], names: string, status: AccountStatus, done?: () => void) => {
    const a = STATUS_ACTIONS.find((x) => x.status === status)!;
    confirm.ask({
      title: `${a.label} ${names}?`,
      consequences: [a.consequence, "The change and your reason are recorded in the audit log."],
      confirmLabel: a.label,
      danger: status === "suspended" || status === "deactivated",
      reason: status === "active" ? "optional" : "required",
      onConfirm: (reason) => {
        adminSetAccountStatus(ids, status, reason);
        const past: Record<AccountStatus, string> = { active: "Reactivated", restricted: "Restricted", suspended: "Suspended", deactivated: "Deactivated" };
        toast(`${past[status]}: ${names}`);
        done?.();
      },
    });
  };
  return { ask, dialog: confirm.dialog };
}

export function UsersList() {
  const s = useAppState();
  const can = useCan();
  const [more, setMore] = useState(false);
  const status = useStatusChange();
  const rows = memberRows(s);
  const showEmail = can("users", "edit");

  const columns: Column<MemberRow>[] = useMemo(() => {
    const base: Column<MemberRow>[] = [
      {
        id: "name",
        header: "Member",
        primary: true,
        sort: (r) => r.person.name,
        csv: (r) => r.person.name,
        cell: (r) => (
          <span className="flex min-w-[12rem] items-center gap-2.5">
            <Avatar name={r.person.name} size={28} />
            <span className="min-w-0">
              <span className="block truncate">
                {r.person.name}
                {r.isMe && <span className="ml-1.5 text-micro font-normal text-mute">(you)</span>}
              </span>
              <span className="block max-w-[16rem] truncate text-micro font-normal text-mute">{r.person.headline}</span>
            </span>
          </span>
        ),
      },
      {
        id: "email",
        header: "Email",
        csv: (r) => r.account.email,
        sort: (r) => r.account.email,
        cell: (r) => (showEmail ? <span className="text-meta text-charcoal">{r.account.email}</span> : <span className="font-mono text-micro text-mute">hidden for your role</span>),
      },
      { id: "role", header: "Role", sort: (r) => roleLabel(r.person.role), csv: (r) => roleLabel(r.person.role), cell: (r) => <span className="whitespace-nowrap text-meta">{roleShort(r.person.role)}</span> },
      { id: "inst", header: "Institution", sort: (r) => r.institutionName ?? "", csv: (r) => r.institutionName, cell: (r) => <span className="text-meta text-sub">{r.institutionName ?? "—"}</span>, hideOnMobile: true },
      { id: "reg", header: "Registered", sort: (r) => r.account.registeredAt, csv: (r) => r.account.registeredAt.slice(0, 10), cell: (r) => <span className="whitespace-nowrap text-meta text-sub">{formatDate(r.account.registeredAt)}</span> },
      {
        id: "onb",
        header: "Onboarding",
        sort: (r) => (r.account.onboarding.completed ? 100 : (r.account.onboarding.step / r.account.onboarding.totalSteps) * 100),
        csv: (r) => (r.account.onboarding.completed ? "complete" : `step ${r.account.onboarding.step} of ${r.account.onboarding.totalSteps}`),
        cell: (r) => (r.account.onboarding.completed ? <span className="text-meta text-sub">Complete</span> : <AdminStatus value="pending" label={`Step ${r.account.onboarding.step}/${r.account.onboarding.totalSteps}`} />),
      },
      { id: "status", header: "Status", sort: (r) => r.account.status, csv: (r) => r.account.status, cell: (r) => <AdminStatus value={r.account.status} /> },
      { id: "last", header: "Last active", sort: (r) => r.account.lastActiveAt, csv: (r) => r.account.lastActiveAt.slice(0, 10), cell: (r) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(r.account.lastActiveAt)}</span>, hideOnMobile: true },
    ];
    if (!more) return base;
    return [
      ...base,
      { id: "phone", header: "Phone", cell: (r) => (r.account.phone ? <span className="font-mono text-micro text-mute">•••{r.account.phone.slice(-2)}</span> : <span className="text-mute">—</span>), hideOnMobile: true },
      { id: "edu", header: "Education or designation", csv: (r) => (r.account.education ? `${r.account.education.qualification} (${r.account.education.status})` : r.account.designation), cell: (r) => <span className="text-meta text-sub">{r.account.education ? `${r.account.education.qualification} · ${r.account.education.status}` : (r.account.designation ?? "—")}</span>, hideOnMobile: true },
      { id: "skills", header: "Skills", csv: (r) => r.person.skills, cell: (r) => <span className="text-meta text-sub">{r.person.skills.slice(0, 2).join(", ") || "—"}{r.person.skills.length > 2 ? ` +${r.person.skills.length - 2}` : ""}</span>, hideOnMobile: true },
      { id: "interests", header: "Interests", csv: (r) => r.person.interests.map(industryLabel), cell: (r) => <span className="text-meta text-sub">{r.person.interests.slice(0, 2).map(industryLabel).join(", ") || "—"}</span>, hideOnMobile: true },
      {
        id: "linkedin",
        header: "LinkedIn",
        csv: (r) => r.account.linkedin,
        cell: (r) =>
          r.account.linkedin ? (
            <a href={r.account.linkedin} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-meta text-sub underline underline-offset-4 hover:text-ink">
              Profile <ExternalLink size={12} aria-hidden />
            </a>
          ) : (
            <span className="text-mute">—</span>
          ),
        hideOnMobile: true,
      },
      { id: "verif", header: "Verification", csv: (r) => `email ${r.account.emailVerification}; phone ${r.account.phoneVerification}`, cell: (r) => <span className="text-micro text-sub">Email {r.account.emailVerification === "simulated" ? "confirmed on screen" : "not confirmed"} · phone unverified</span>, hideOnMobile: true },
    ];
  }, [more, showEmail]);

  const institutions = Array.from(new Set(rows.map((r) => r.institutionName).filter(Boolean))) as string[];
  const filters: FilterDef<MemberRow>[] = [
    { id: "role", label: "Role", options: ROLES.map((r) => ({ value: r.id, label: r.label })), test: (r, v) => r.person.role === v },
    { id: "status", label: "Status", options: STATUS_ACTIONS.map((a) => ({ value: a.status, label: a.status[0].toUpperCase() + a.status.slice(1) })), test: (r, v) => r.account.status === v },
    { id: "inst", label: "Institution", options: institutions.map((i) => ({ value: i, label: i })), test: (r, v) => r.institutionName === v },
    { id: "onb", label: "Onboarding", options: [{ value: "complete", label: "Complete" }, { value: "incomplete", label: "Incomplete" }], test: (r, v) => r.account.onboarding.completed === (v === "complete") },
    { id: "reg", label: "Registered", options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }], test: (r, v) => inRange(r.account.registeredAt, v as "7") },
  ];

  return (
    <>
      <AdminHeader
        title="Users"
        description="Every member account. Public profile fields and private account information are kept apart; private values are masked until revealed, and revealing is logged."
        meta={
          <>
            <span>{rows.length} members</span>
            <span>{rows.filter((r) => r.account.status !== "active").length} not active</span>
          </>
        }
      />
      <DataTable
        label="Members"
        module="users"
        rows={rows}
        columns={columns}
        getId={(r) => r.id}
        search={(r) => [r.person.name, r.account.email, r.person.organisation, r.person.headline, r.person.skills.join(" ")]}
        searchPlaceholder="Search by name, email, organisation or skill"
        filters={filters}
        initialSort={{ id: "reg", dir: "desc" }}
        rowHref={(r) => `/admin/users/${r.id}`}
        exportName="truevix-members"
        toolbarExtra={
          <label className="flex h-10 items-center gap-2 whitespace-nowrap px-1 text-meta text-sub">
            <input type="checkbox" checked={more} onChange={(e) => setMore(e.target.checked)} className="h-4 w-4 accent-[var(--color-ink)]" />
            More columns
          </label>
        }
        bulk={(ids, clear) => {
          const targets = ids.filter((id) => id !== "me");
          if (!can("users", "suspend")) return <span className="text-meta text-sub">Your role can’t change account status.</span>;
          const label = `${targets.length} ${targets.length === 1 ? "member" : "members"}`;
          return (
            <>
              <Button size="sm" variant="secondary" disabled={!targets.length} onClick={() => status.ask(targets, label, "restricted", clear)}>
                Restrict
              </Button>
              <Button size="sm" variant="secondary" disabled={!targets.length} onClick={() => status.ask(targets, label, "suspended", clear)}>
                Suspend
              </Button>
              <Button size="sm" variant="secondary" disabled={!targets.length} onClick={() => status.ask(targets, label, "active", clear)}>
                Reactivate
              </Button>
            </>
          );
        }}
      />
      {status.dialog}
    </>
  );
}

/* ---------------- Edit dialog ---------------- */

function EditMemberDialog({ row, open, onClose }: { row: MemberRow; open: boolean; onClose: () => void }) {
  const s = useAppState();
  const p = row.person;
  const a = row.account;
  const [f, setF] = useState({
    name: p.name,
    headline: p.headline,
    organisation: p.organisation,
    location: p.location,
    bio: p.bio,
    skills: p.skills.join(", "),
    interests: p.interests as string[],
    email: a.email,
    phone: a.phone ?? "",
    linkedin: a.linkedin ?? "",
    institutionId: a.institutionId ?? "",
    designation: a.designation ?? "",
    adminNote: a.adminNote ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = () => {
    const err: Record<string, string> = {};
    if (f.name.trim().length < 2) err.name = "Enter a name of at least 2 characters.";
    if (!row.isMe && !emailSchema.safeParse(f.email).success) err.email = "Enter a valid email address.";
    if (f.phone.trim() && !phoneSchema.safeParse(f.phone).success) err.phone = "Enter a phone number with country code, e.g. +91 98765 43210.";
    if (f.linkedin.trim() && !linkedinSchema.safeParse(f.linkedin).success) err.linkedin = "Enter a LinkedIn profile URL starting with https://www.linkedin.com/";
    setErrors(err);
    if (Object.keys(err).length) return;
    adminUpdateMember(
      row.id,
      {
        name: f.name.trim(),
        headline: f.headline.trim(),
        organisation: f.organisation.trim(),
        location: f.location.trim(),
        bio: f.bio.trim(),
        skills: f.skills.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20),
        interests: f.interests as IndustryId[],
      },
      row.isMe
        ? { phone: f.phone.trim() ? normalisePhone(f.phone) : undefined, linkedin: f.linkedin.trim() || undefined }
        : {
            email: f.email.trim().toLowerCase(),
            phone: f.phone.trim() ? normalisePhone(f.phone) : undefined,
            linkedin: f.linkedin.trim() || undefined,
            institutionId: f.institutionId || undefined,
            designation: f.designation.trim() || undefined,
            adminNote: f.adminNote.trim() || undefined,
          },
    );
    toast("Member record saved", { body: "The public profile shows the updated fields." });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Edit ${p.name}`}
      description="Members can edit their own profiles; use this to correct records. Every change is logged with before and after values (private values are not written to the log)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save changes</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-section font-bold">Public profile</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Full name" value={f.name} onChange={set("name")} error={errors.name} maxLength={80} />
            <TextField label="Headline" value={f.headline} onChange={set("headline")} maxLength={160} />
            <TextField label="Organisation" value={f.organisation} onChange={set("organisation")} maxLength={120} />
            <TextField label="Location" value={f.location} onChange={set("location")} maxLength={120} />
          </div>
          <TextArea label="Bio" rows={3} value={f.bio} onChange={set("bio")} maxLength={1000} />
          <TextField label="Skills" hint="Separate with commas." value={f.skills} onChange={set("skills")} />
          <ChipGroup legend="Interests" options={INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))} value={f.interests} onChange={(v) => setF((x) => ({ ...x, interests: v }))} />
        </fieldset>
        <fieldset className="flex flex-col gap-4 rounded-md bg-surface p-4">
          <legend className="mb-2 px-1 text-section font-bold">Private account information</legend>
          <p className="-mt-2 text-meta text-sub">Never shown on the public profile.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Email" type="email" value={f.email} onChange={set("email")} error={errors.email} disabled={row.isMe} hint={row.isMe ? "Change your own email in Settings." : undefined} />
            <TextField label="Phone" value={f.phone} onChange={set("phone")} error={errors.phone} optional hint="Unverified: no SMS provider is connected." />
            <TextField label="LinkedIn profile URL" value={f.linkedin} onChange={set("linkedin")} error={errors.linkedin} optional />
            {!row.isMe && (
              <SelectField
                label="Linked institution"
                value={f.institutionId}
                onChange={set("institutionId")}
                options={[{ value: "", label: "None" }, ...s.platform.institutions.filter((i) => i.status !== "archived").map((i) => ({ value: i.id, label: i.name }))]}
              />
            )}
            {!row.isMe && <TextField label="Professional designation" value={f.designation} onChange={set("designation")} optional maxLength={120} />}
          </div>
          {!row.isMe && <TextArea label="Internal note" rows={2} value={f.adminNote} onChange={set("adminNote")} optional hint="Visible to administrators only." maxLength={600} />}
        </fieldset>
      </div>
    </Dialog>
  );
}

/* ---------------- Detail ---------------- */

type UserTab = "overview" | "details" | "activity" | "related";

export function UserDetail({ id }: { id: string }) {
  const s = useAppState();
  const can = useCan();
  const row = memberRow(s, id);
  const [tab, setTab] = useTabParam<UserTab>(["overview", "details", "activity", "related"], "overview");
  const [editing, setEditing] = useState(false);
  const status = useStatusChange();
  if (!row) return <EmptyState title="Member not found" body="The account may have been removed, or the link is wrong." action={<ButtonLink href="/admin/users">All users</ButtonLink>} />;
  const { person: p, account: a } = row;
  const ideas = allIdeasAdmin(s).filter((i) => i.ownerId === id || i.team.some((t) => t.personId === id));
  const posts = allPostsAdmin(s).filter((x) => x.authorId === id);
  const regs = s.platform.registrations.filter((r) => r.applicantId === id || r.members.some((m) => m.personId === id));
  const collabs = s.platform.collaborations.filter((c) => c.fromId === id || c.toId === id);
  const reportsAbout = s.platform.reports.filter((r) => r.reportedUserId === id);
  const reportsBy = s.platform.reports.filter((r) => r.reporterId === id);
  const mentorships = s.platform.mentorships.filter((m) => m.mentorId === id || m.menteeId === id);
  const studies = s.platform.participations.filter((x) => x.personId === id);
  const audit = s.admin.audit.filter((e) => e.targetId === id && e.entity === "user");
  const timeline = [
    { id: "reg", at: a.registeredAt, text: "Registered" },
    ...(a.onboarding.completed ? [{ id: "onb", at: a.registeredAt, text: "Completed onboarding" }] : [{ id: "onb", at: a.registeredAt, text: `Onboarding stopped at step ${a.onboarding.step} of ${a.onboarding.totalSteps}` }]),
    ...ideas.map((i) => ({ id: `i-${i.id}`, at: i.createdAt, text: `${i.status === "draft" ? "Drafted" : "Submitted"} idea “${i.title.split(":")[0]}”` })),
    ...posts.map((x) => ({ id: `p-${x.id}`, at: x.createdAt, text: `Posted “${x.title}”` })),
    ...regs.map((r) => ({ id: `r-${r.id}`, at: r.createdAt, text: `Applied to ${s.platform.opportunities.find((o) => o.id === r.opportunityId)?.title ?? "an opportunity"}` })),
    ...collabs.map((c) => ({ id: `c-${c.id}`, at: c.createdAt, text: `Collaboration ${c.kind.replace("_", " ")}: ${c.role}` })),
    ...audit.map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `Admin: ${e.action}${e.reason ? ` — ${e.reason}` : ""}` })),
  ].sort((x, y) => y.at.localeCompare(x.at));
  const statusOptions = STATUS_ACTIONS.filter((x) => x.status !== a.status);

  return (
    <>
      <AdminHeader
        title={p.name}
        flags={
          <>
            <AdminStatus value={a.status} />
            {p.demo && <Flag title="Fictional demonstration profile">Sample</Flag>}
            {row.isMe && <Flag>You</Flag>}
          </>
        }
        description={p.headline}
        meta={
          <>
            <span>{roleLabel(p.role)}</span>
            <span>Registered {formatDate(a.registeredAt)}</span>
            <span>Last active {timeAgo(a.lastActiveAt)}</span>
            <span>Profile {row.profileCompletion}% complete</span>
          </>
        }
        actions={
          <>
            <ButtonLink href={row.isMe ? "/profile" : `/people/${p.id}`} variant="ghost" size="sm">
              Public profile
            </ButtonLink>
            <PermButton module="users" perm="edit" variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} aria-hidden /> Edit
            </PermButton>
            {!row.isMe && can("users", "suspend") && (
              <InlineSelect
                aria-label="Change account status"
                value=""
                className="h-8"
                onChange={(e) => e.target.value && status.ask([p.id], p.name, e.target.value as AccountStatus)}
                options={[{ value: "", label: "Change status…" }, ...statusOptions.map((x) => ({ value: x.status, label: x.label }))]}
              />
            )}
          </>
        }
      />
      {a.statusReason && a.status !== "active" && (
        <p className="mb-5 rounded-sm bg-surface px-3 py-2 text-meta text-charcoal">
          <span className="font-medium">Status reason:</span> {a.statusReason}
        </p>
      )}

      <RecordTabs
        label="Member record"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "details", label: "Onboarding and documents" },
          { value: "activity", label: "Activity", count: timeline.length },
          { value: "related", label: "Related records", count: ideas.length + posts.length + regs.length + collabs.length + reportsAbout.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Public profile" description="Visible to signed-in members.">
            <Details
              items={[
                { label: "Name", value: p.name },
                { label: "Headline", value: p.headline },
                { label: "Organisation", value: p.organisation },
                { label: "Location", value: p.location },
                { label: "Skills", value: p.skills.join(", "), wide: true },
                { label: "Interests", value: p.interests.map(industryLabel).join(", "), wide: true },
                { label: "Bio", value: p.bio, wide: true },
              ]}
            />
            {!row.isMe && can("users", "edit") && (
              <div className="mt-4 max-w-xs">
                <SelectField
                  label="Platform role"
                  value={p.role}
                  onChange={(e) => {
                    adminSetMemberRole(p.id, e.target.value as RoleId);
                    toast(`Role changed to ${roleLabel(e.target.value as RoleId)}`);
                  }}
                  options={ROLES.map((r) => ({ value: r.id, label: r.label }))}
                  hint="Changes what the member sees. Not an access-control boundary in this phase."
                />
              </div>
            )}
          </Block>
          <Block title="Private account information" description="Administrators only. Revealing a value is recorded in the audit log.">
            <Details
              items={[
                { label: "Email", private: true, value: <PrivateValue value={a.email} entity="user" targetId={id} target={p.name} field="email" /> },
                { label: "Phone", private: true, value: <PrivateValue value={a.phone} entity="user" targetId={id} target={p.name} field="phone" /> },
                { label: "LinkedIn", private: true, value: a.linkedin ? <PrivateValue value={a.linkedin} entity="user" targetId={id} target={p.name} field="LinkedIn URL" /> : undefined },
                { label: "Email confirmation", value: a.emailVerification === "simulated" ? "Confirmed on screen (simulated; no email sent)" : "Not confirmed" },
                { label: "Phone verification", value: "Not verified — no SMS provider is connected" },
                { label: "Linked institution", value: row.institutionName },
                { label: "Internal note", private: true, value: a.adminNote, wide: true },
              ]}
            />
            <p className="mt-4 text-micro text-mute">Passwords and session tokens are never stored or shown. Sign-in in this phase is browser-local.</p>
          </Block>
        </div>
      )}

      {tab === "details" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Onboarding">
            <div className="mb-4 max-w-sm">
              <Progress value={a.onboarding.completed ? 100 : (a.onboarding.step / a.onboarding.totalSteps) * 100} label="Onboarding progress" />
              <p className="mt-1.5 text-meta text-sub">{a.onboarding.completed ? "Complete" : `Step ${a.onboarding.step} of ${a.onboarding.totalSteps}`}</p>
            </div>
            <Details
              items={[
                { label: "Profile type", value: a.onboarding.profileKind?.replace("_", " and ") },
                { label: "Education", value: a.education ? `${a.education.level} · ${a.education.qualification}` : undefined },
                { label: "Education status", value: a.education ? [a.education.status, a.education.year].filter(Boolean).join(" · ") : undefined },
                { label: "Designation", value: a.designation },
              ]}
            />
            <Link href="/admin/onboarding" className="mt-4 inline-block text-meta text-sub underline underline-offset-4 hover:text-ink">
              Correct onboarding fields
            </Link>
          </Block>
          <Block title="Documents">
            {a.resume ? (
              <Details
                items={[
                  { label: "Resume", private: true, value: a.resume.name },
                  { label: "Size", value: `${Math.round(a.resume.size / 1024)} KB` },
                  { label: "Storage", value: "Metadata only. The file stayed in the member’s browser tab; nothing was uploaded." },
                ]}
              />
            ) : (
              <p className="text-meta text-sub">No documents attached.</p>
            )}
          </Block>
        </div>
      )}

      {tab === "activity" && (
        <Block title="Activity timeline" description="Platform activity and administrative actions for this member.">
          <Timeline events={timeline} />
        </Block>
      )}

      {tab === "related" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Ideas and projects">
            <RelatedList items={ideas.map((i) => ({ id: i.id, href: `/admin/ideas/${i.id}`, title: i.title, meta: i.ownerId === id ? "Owner" : "Team member" }))} />
          </Block>
          <Block title="Posts">
            <RelatedList items={posts.map((x) => ({ id: x.id, href: `/admin/content?post=${x.id}`, title: x.title, meta: x.moderation?.status ?? "visible" }))} />
          </Block>
          <Block title="Applications">
            <RelatedList items={regs.map((r) => ({ id: r.id, href: `/admin/opportunities/${r.opportunityId}/applications/${r.id}`, title: s.platform.opportunities.find((o) => o.id === r.opportunityId)?.title ?? r.opportunityId, meta: r.status.replace("_", " ") }))} />
          </Block>
          <Block title="Collaborations and mentorships">
            <RelatedList
              items={[
                ...collabs.map((c) => ({ id: c.id, href: "/admin/collaboration", title: `${c.kind.replace("_", " ")}: ${c.role}`, meta: c.status })),
                ...mentorships.map((m) => ({ id: m.id, href: "/admin/talent", title: `Mentorship: ${m.focus}`, meta: m.status })),
                ...studies.map((x) => ({ id: x.id, href: `/admin/studies/${x.studyId}`, title: `Study: ${s.platform.studies.find((st) => st.id === x.studyId)?.title ?? x.studyId}`, meta: x.status })),
              ]}
            />
          </Block>
          <Block title="Reports about this member">
            <RelatedList items={reportsAbout.map((r) => ({ id: r.id, href: `/admin/moderation/${r.id}`, title: `${r.reason}: ${r.targetLabel}`, meta: r.status.replace("_", " ") }))} />
          </Block>
          <Block title="Reports made by this member">
            <RelatedList items={reportsBy.map((r) => ({ id: r.id, href: `/admin/moderation/${r.id}`, title: `${r.reason}: ${r.targetLabel}`, meta: r.status.replace("_", " ") }))} />
          </Block>
        </div>
      )}

      {editing && <EditMemberDialog row={row} open={editing} onClose={() => setEditing(false)} />}
      {status.dialog}
    </>
  );
}

export function RelatedList({ items }: { items: { id: string; href: string; title: string; meta?: string }[] }) {
  if (!items.length) return <p className="text-meta text-sub">None.</p>;
  return (
    <ul>
      {items.map((x) => (
        <li key={x.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
          <Link href={x.href} className="min-w-0 truncate text-ui hover:underline">
            {x.title}
          </Link>
          {x.meta && <span className="shrink-0 text-meta capitalize text-sub">{x.meta}</span>}
        </li>
      ))}
    </ul>
  );
}
