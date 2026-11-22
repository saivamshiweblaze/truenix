"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineSelect, SelectField, TextArea, TextField } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { adminSaveStudy, adminSetParticipation } from "@/lib/store/admin-actions";
import { allIdeasAdmin, personById } from "@/lib/store/selectors";
import type { Study, StudyParticipation } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Block, Details, FormActions, Timeline } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";

const STATUSES: Study["status"][] = ["draft", "recruiting", "in_progress", "completed", "closed"];
const label = (v: string) => (v === "in_progress" ? "In progress" : v[0].toUpperCase() + v.slice(1).replace("_", " "));

export function StudiesList() {
  const s = useAppState();
  const can = useCan();
  const rows = s.platform.studies;
  const parts = (st: Study) => s.platform.participations.filter((p) => p.studyId === st.id);
  const columns: Column<Study>[] = [
    { id: "title", header: "Study", primary: true, sort: (x) => x.title, csv: (x) => x.title, cell: (x) => <span className="line-clamp-2 min-w-[14rem]">{x.title}</span> },
    { id: "owner", header: "Run by", sort: (x) => personById(s, x.ownerId)?.name ?? "", csv: (x) => personById(s, x.ownerId)?.name, cell: (x) => <span className="text-meta text-sub">{personById(s, x.ownerId)?.name ?? "—"}</span> },
    { id: "format", header: "Format", csv: (x) => x.format, cell: (x) => <span className="text-meta text-sub">{x.format}</span>, hideOnMobile: true },
    { id: "schedule", header: "Schedule", sort: (x) => x.start, csv: (x) => `${x.start} to ${x.end}`, cell: (x) => <span className="whitespace-nowrap text-meta text-sub">{formatDate(x.start)} – {formatDate(x.end)}</span> },
    { id: "parts", header: "Participants", sort: (x) => parts(x).length, csv: (x) => parts(x).length, cell: (x) => <span className="text-meta tabular-nums text-sub">{parts(x).filter((p) => p.status === "selected" || p.status === "completed").length} of {x.target} · {parts(x).filter((p) => p.status === "applied").length} applied</span> },
    { id: "status", header: "Status", sort: (x) => x.status, csv: (x) => x.status, cell: (x) => <AdminStatus value={x.status} label={label(x.status)} /> },
  ];
  return (
    <>
      <AdminHeader
        title="Research studies"
        description="Studies founders run with research participants. Participation is voluntary; consent is recorded only when the participant gives it, and contact details are never shown to founders here."
        actions={
          can("studies", "create") && (
            <ButtonLink href="/admin/studies/new" variant="accent" size="sm">
              <Plus size={15} aria-hidden /> New study
            </ButtonLink>
          )
        }
      />
      <DataTable
        label="Studies"
        module="studies"
        rows={rows}
        columns={columns}
        getId={(x) => x.id}
        search={(x) => [x.title, x.description, personById(s, x.ownerId)?.name]}
        searchPlaceholder="Search studies"
        filters={[{ id: "status", label: "Status", options: STATUSES.map((v) => ({ value: v, label: label(v) })), test: (x, v) => x.status === v }]}
        initialSort={{ id: "schedule", dir: "desc" }}
        rowHref={(x) => `/admin/studies/${x.id}`}
        exportName="truevix-studies"
      />
    </>
  );
}

const blankStudy = (): Study => ({ id: "", title: "", ownerId: "", description: "", format: "", eligibility: "", note: "", status: "draft", start: "", end: "", target: 10, consentText: "Taking part is voluntary. You can stop at any time. Your answers are reported without your name unless you agree otherwise.", demo: false });

export function StudyForm({ existing, onDone }: { existing?: Study; onDone?: () => void }) {
  const s = useAppState();
  const router = useRouter();
  const [f, setF] = useState<Study>(() => existing ?? blankStudy());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const text = (k: keyof Study) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const ideas = allIdeasAdmin(s).filter((i) => i.ownerId === f.ownerId);
  const save = () => {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 8) e.title = "Give the study a clear title (at least 8 characters).";
    if (!f.ownerId) e.ownerId = "Choose who runs the study.";
    if (f.eligibility.trim().length < 5) e.eligibility = "Say who can take part.";
    if (!f.start || !f.end) e.end = "Set start and end dates.";
    else if (f.end < f.start) e.end = "The study must end after it starts.";
    if (!Number.isInteger(Number(f.target)) || Number(f.target) < 1 || Number(f.target) > 500) e.target = "Use a whole number from 1 to 500.";
    if (f.consentText.trim().length < 30) e.consentText = "Explain consent in plain words (at least 30 characters).";
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = adminSaveStudy({ ...f, title: f.title.trim(), target: Number(f.target) }, !existing);
    toast(existing ? "Study saved" : "Study created");
    if (onDone) onDone();
    else router.push(`/admin/studies/${id}`);
  };
  return (
    <>
      {!existing && <AdminHeader title="New study" description="Studies in draft are visible to administrators only. Set the status to Recruiting to show it to research participants." />}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex max-w-3xl flex-col gap-4"
      >
        <TextField label="Title" value={f.title} onChange={text("title")} error={errors.title} maxLength={160} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Run by" value={f.ownerId} onChange={text("ownerId")} error={errors.ownerId} options={[{ value: "", label: "Choose a member" }, ...s.platform.people.map((p) => ({ value: p.id, label: p.name }))]} />
          <SelectField label="Linked idea" value={f.ideaId ?? ""} onChange={(e) => setF((x) => ({ ...x, ideaId: e.target.value || undefined }))} options={[{ value: "", label: "None" }, ...ideas.map((i) => ({ value: i.id, label: i.title.split(":")[0] }))]} />
        </div>
        <TextArea label="Description" rows={3} value={f.description} onChange={text("description")} maxLength={1200} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Format" value={f.format} onChange={text("format")} placeholder="e.g. 30-minute video call" maxLength={120} />
          <SelectField label="Status" value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value as Study["status"] }))} options={STATUSES.map((v) => ({ value: v, label: label(v) }))} />
          <TextField label="Starts" type="date" value={f.start} onChange={text("start")} />
          <TextField label="Ends" type="date" value={f.end} onChange={text("end")} error={errors.end} />
          <TextField label="Participants needed" inputMode="numeric" value={String(f.target)} onChange={(e) => setF((x) => ({ ...x, target: Number(e.target.value) || 0 }))} error={errors.target} />
        </div>
        <TextArea label="Who can take part" rows={2} value={f.eligibility} onChange={text("eligibility")} error={errors.eligibility} maxLength={400} />
        <TextField label="Note to participants" value={f.note} onChange={text("note")} optional maxLength={200} />
        <TextArea label="Consent statement" rows={3} value={f.consentText} onChange={text("consentText")} error={errors.consentText} hint="Shown before a participant joins. They must confirm it." maxLength={1200} />
        <FormActions>
          <Button variant="ghost" onClick={() => (onDone ? onDone() : router.push("/admin/studies"))}>
            Cancel
          </Button>
          <Button type="submit">{existing ? "Save changes" : "Create study"}</Button>
        </FormActions>
      </form>
    </>
  );
}

export function StudyDetail({ id }: { id: string }) {
  const s = useAppState();
  const can = useCan();
  const [editing, setEditing] = useState(false);
  const st = s.platform.studies.find((x) => x.id === id);
  if (!st) return <EmptyState title="Study not found" body="It may have been removed." action={<ButtonLink href="/admin/studies">All studies</ButtonLink>} />;
  const parts = s.platform.participations.filter((p) => p.studyId === id);
  const audit = s.admin.audit.filter((e) => e.entity === "study" && e.targetId === id);
  const name = (p: StudyParticipation) => personById(s, p.personId)?.name ?? "Participant";
  const columns: Column<StudyParticipation>[] = [
    { id: "name", header: "Participant", primary: true, sort: name, csv: name, cell: (p) => <Link href={`/admin/users/${p.personId}`} className="hover:underline">{name(p)}</Link> },
    { id: "applied", header: "Applied", sort: (p) => p.appliedAt, csv: (p) => p.appliedAt.slice(0, 10), cell: (p) => <span className="text-meta text-sub">{formatDate(p.appliedAt)}</span> },
    { id: "status", header: "Selection", sort: (p) => p.status, csv: (p) => p.status, cell: (p) => <AdminStatus value={p.status} label={label(p.status)} /> },
    { id: "consent", header: "Consent", sort: (p) => p.consent, csv: (p) => p.consent, cell: (p) => <span className="text-meta text-sub">{p.consent === "given" ? `Given ${p.consentAt ? formatDate(p.consentAt) : ""}` : p.consent === "withdrawn" ? "Withdrawn" : "Not recorded"}</span> },
    {
      id: "act",
      header: "",
      cell: (p) =>
        can("studies", "approve") ? (
          <InlineSelect
            aria-label={`Change selection for ${name(p)}`}
            className="h-8"
            value=""
            onChange={(e) => {
              const v = e.target.value as StudyParticipation["status"];
              if (!v) return;
              if ((v === "selected" || v === "completed") && p.consent !== "given") return toast("Consent not recorded", { body: "A participant can be selected only after they give consent." });
              adminSetParticipation(p.id, { status: v });
              toast(`Marked ${label(v).toLowerCase()}`);
            }}
            options={[{ value: "", label: "Change…" }, ...(["applied", "selected", "not_selected", "completed", "withdrawn"] as const).filter((x) => x !== p.status).map((x) => ({ value: x, label: label(x) }))]}
          />
        ) : null,
    },
  ];
  return (
    <>
      <AdminHeader
        title={st.title}
        flags={
          <>
            <AdminStatus value={st.status} label={label(st.status)} />
            {st.demo && <Flag>Sample</Flag>}
          </>
        }
        meta={
          <>
            <span>Run by {personById(s, st.ownerId)?.name}</span>
            <span>
              {formatDate(st.start)} – {formatDate(st.end)}
            </span>
            <span>{parts.filter((p) => p.status === "completed").length} completed</span>
          </>
        }
        actions={
          can("studies", "edit") && (
            <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close editor" : "Edit study"}
            </Button>
          )
        }
      />
      {editing ? (
        <StudyForm existing={st} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <Block title="Study">
              <Details
                items={[
                  { label: "Description", value: st.description, wide: true },
                  { label: "Format", value: st.format },
                  { label: "Participants needed", value: st.target },
                  { label: "Who can take part", value: st.eligibility, wide: true },
                ]}
              />
            </Block>
            <Block title="Consent" description="Participants confirm this statement before joining. Selection requires recorded consent.">
              <p className="text-ui text-charcoal">{st.consentText}</p>
            </Block>
          </div>
          <Block title="Participants" description="Contact details stay private. Founders see only participants who consented and were selected (in Phase 2).">
            <DataTable label="Participants" module="studies" rows={parts} columns={columns} getId={(p) => p.id} search={(p) => [name(p)]} searchPlaceholder="Search participants" exportName={`truevix-study-${st.id}`} emptyBody="Participants appear when they volunteer from Research studies." />
          </Block>
          <Block title="History">
            <Timeline events={audit.map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `${e.action}${e.after ? ` (${e.after})` : ""}` }))} empty="No changes recorded." />
          </Block>
        </div>
      )}
    </>
  );
}
