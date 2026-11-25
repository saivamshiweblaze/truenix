"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HBarChart } from "@/components/ui/charts";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Progress } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { roleLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminUpdateOnboarding } from "@/lib/store/admin-actions";
import { memberRows, type MemberRow } from "@/lib/admin/members";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Block, Metric, MetricStrip } from "../kit/layout";
import { AdminStatus } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";

const KIND_LABEL: Record<string, string> = { student: "Student or graduate", founder: "Founder", professional: "Professional", expert_mentor: "Expert or mentor", participant: "Research participant", institution: "Institution" };

function CorrectDialog({ row, onClose }: { row: MemberRow; onClose: () => void }) {
  const s = useAppState();
  const a = row.account;
  const [f, setF] = useState({
    level: a.education?.level ?? "",
    qualification: a.education?.qualification ?? "",
    status: a.education?.status ?? "",
    year: a.education?.year ?? "",
    designation: a.designation ?? "",
    institutionId: a.institutionId ?? "",
    reason: "",
  });
  const [error, setError] = useState<string>();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => {
    if (f.reason.trim().length < 5) return setError("Say why the record is being corrected (at least 5 characters).");
    adminUpdateOnboarding(
      row.id,
      {
        education: f.level.trim() ? { level: f.level.trim(), qualification: f.qualification.trim(), status: f.status.trim(), year: f.year.trim() || undefined } : undefined,
        designation: f.designation.trim() || undefined,
        institutionId: f.institutionId || undefined,
      },
      f.reason.trim(),
    );
    toast("Onboarding record corrected");
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Correct ${row.person.name}’s onboarding record`}
      description="For fixing mistakes the member reported. Completion status is the member’s own and can’t be changed here."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save correction</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Education level" value={f.level} onChange={set("level")} optional placeholder="e.g. Undergraduate" />
        <TextField label="Qualification" value={f.qualification} onChange={set("qualification")} optional />
        <TextField label="Education status" value={f.status} onChange={set("status")} optional placeholder="Studying, Graduated…" />
        <TextField label="Year" value={f.year} onChange={set("year")} optional />
        <TextField label="Professional designation" value={f.designation} onChange={set("designation")} optional />
        <SelectField label="Institution" value={f.institutionId} onChange={set("institutionId")} options={[{ value: "", label: "None" }, ...s.platform.institutions.map((i) => ({ value: i.id, label: i.name }))]} />
        <div className="md:col-span-2">
          <TextArea label="Reason for the correction" rows={2} value={f.reason} onChange={set("reason")} error={error} hint="Recorded in the audit log." />
        </div>
      </div>
    </Dialog>
  );
}

export function OnboardingPage() {
  const s = useAppState();
  const can = useCan();
  const rows = memberRows(s).filter((r) => !r.isMe);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const complete = rows.filter((r) => r.account.onboarding.completed).length;
  const kinds = Object.entries(KIND_LABEL).map(([k, label]) => ({ label, value: rows.filter((r) => r.account.onboarding.profileKind === k).length })).filter((x) => x.value);

  const columns: Column<MemberRow>[] = [
    { id: "name", header: "Member", primary: true, sort: (r) => r.person.name, csv: (r) => r.person.name, cell: (r) => r.person.name },
    { id: "reg", header: "Registered", sort: (r) => r.account.registeredAt, csv: (r) => r.account.registeredAt.slice(0, 10), cell: (r) => <span className="whitespace-nowrap text-meta text-sub">{formatDate(r.account.registeredAt)}</span> },
    { id: "kind", header: "Profile type", sort: (r) => r.account.onboarding.profileKind ?? "", csv: (r) => r.account.onboarding.profileKind, cell: (r) => <span className="text-meta">{KIND_LABEL[r.account.onboarding.profileKind ?? ""] ?? roleLabel(r.person.role)}</span> },
    {
      id: "progress",
      header: "Progress",
      sort: (r) => (r.account.onboarding.completed ? 100 : r.account.onboarding.step),
      csv: (r) => (r.account.onboarding.completed ? "complete" : `${r.account.onboarding.step}/${r.account.onboarding.totalSteps}`),
      cell: (r) => (r.account.onboarding.completed ? <AdminStatus value="completed" label="Complete" /> : <AdminStatus value="pending" label={`Step ${r.account.onboarding.step} of ${r.account.onboarding.totalSteps}`} />),
    },
    { id: "edu", header: "Education", csv: (r) => r.account.education?.qualification, cell: (r) => <span className="text-meta text-sub">{r.account.education ? `${r.account.education.qualification} · ${r.account.education.status}${r.account.education.year ? ` · ${r.account.education.year}` : ""}` : "—"}</span> },
    { id: "inst", header: "Institution", sort: (r) => r.institutionName ?? "", csv: (r) => r.institutionName, cell: (r) => <span className="text-meta text-sub">{r.institutionName ?? "—"}</span> },
    { id: "resume", header: "Resume", csv: (r) => r.account.resume?.name, cell: (r) => <span className="text-meta text-sub">{r.account.resume ? "Metadata on file" : "—"}</span>, hideOnMobile: true },
    { id: "linkedin", header: "LinkedIn", csv: (r) => (r.account.linkedin ? "provided" : ""), cell: (r) => <span className="text-meta text-sub">{r.account.linkedin ? "Provided" : "—"}</span>, hideOnMobile: true },
    { id: "phone", header: "Phone", csv: (r) => (r.account.phone ? "provided, unverified" : ""), cell: (r) => <span className="text-meta text-sub">{r.account.phone ? "Provided · unverified" : "—"}</span>, hideOnMobile: true },
    {
      id: "complete",
      header: "Profile",
      sort: (r) => r.profileCompletion,
      csv: (r) => r.profileCompletion,
      cell: (r) => (
        <span className="flex w-24 items-center gap-2">
          <Progress value={r.profileCompletion} label={`${r.person.name} profile completion`} />
          <span className="text-micro tabular-nums text-sub">{r.profileCompletion}%</span>
        </span>
      ),
    },
    {
      id: "act",
      header: "",
      cell: (r) =>
        can("onboarding", "edit") ? (
          <Button size="sm" variant="ghost" onClick={() => setEditing(r)} aria-label={`Correct onboarding record for ${r.person.name}`}>
            Correct
          </Button>
        ) : null,
      hideOnMobile: false,
    },
  ];

  return (
    <>
      <AdminHeader title="Onboarding" description="Registrations and onboarding progress. Email confirmation comes from the account service. Phone numbers and resumes are not verified; the table says only what the member provided." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <MetricStrip cols={3}>
          <Metric label="Registrations" value={rows.length} />
          <Metric label="Onboarding complete" value={complete} note={`${Math.round((complete / Math.max(1, rows.length)) * 100)}%`} />
          <Metric label="Incomplete" value={rows.length - complete} note="Stopped before the last step" />
        </MetricStrip>
        <Block title="Profile types">
          <HBarChart caption="Members by onboarding profile type" rows={kinds} unit="members" />
        </Block>
      </div>
      <div className="mt-6">
        <DataTable
          label="Onboarding records"
          module="onboarding"
          rows={rows}
          columns={columns}
          getId={(r) => r.id}
          search={(r) => [r.person.name, r.institutionName, r.account.education?.qualification]}
          searchPlaceholder="Search by name, institution or qualification"
          filters={[
            { id: "state", label: "Onboarding", options: [{ value: "incomplete", label: "Incomplete" }, { value: "complete", label: "Complete" }], test: (r, v) => r.account.onboarding.completed === (v === "complete") },
            { id: "kind", label: "Profile type", options: Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })), test: (r, v) => r.account.onboarding.profileKind === v },
          ]}
          initialSort={{ id: "reg", dir: "desc" }}
          rowHref={(r) => `/admin/users/${r.id}?tab=details`}
          exportName="truevix-onboarding"
        />
      </div>
      {editing && <CorrectDialog row={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
