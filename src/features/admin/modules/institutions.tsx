"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineSelect, SelectField, TextArea, TextField } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { ORG_KIND_LABEL } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminSaveInstitution, adminSetInstitutionStatus, adminUpdateMember } from "@/lib/store/admin-actions";
import { memberRows } from "@/lib/admin/members";
import type { FileMeta, Institution, OrgKind } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Block, Details, FormActions, Timeline } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { PermButton, useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";
import { RecordTabs, useTabParam } from "../kit/record-tabs";
import { AdminFileField } from "../kit/upload";
import { RelatedList } from "./users";

const REL_LABEL: Record<Institution["relationship"], string> = { listed: "Listed only", registered: "Registered account", partner_confirmed: "Partner (agreement on file)" };

function useInstitutionStatus() {
  const confirm = useConfirm();
  const ask = (i: Institution, status: Institution["status"]) => {
    const t = {
      verified: { btn: "Approve", c: "The organisation is marked verified and can be chosen as an organiser and linked to members. This does not make it a partner." },
      rejected: { btn: "Reject", c: "The request is declined. The record is kept so the decision can be reviewed." },
      archived: { btn: "Archive", c: "Hidden from selectors and lists. Linked members and opportunities keep their history." },
      pending: { btn: "Return to review", c: "The organisation goes back to the pending queue." },
    }[status];
    confirm.ask({
      title: `${t.btn} ${i.name}?`,
      consequences: [t.c, "Recorded in the audit log."],
      confirmLabel: t.btn,
      danger: status === "rejected",
      reason: status === "verified" ? "optional" : "required",
      onConfirm: (r) => {
        adminSetInstitutionStatus(i.id, status, r);
        toast(`${t.btn === "Approve" ? "Approved" : t.btn === "Reject" ? "Rejected" : t.btn === "Archive" ? "Archived" : "Returned to review"}: ${i.name}`);
      },
    });
  };
  return { ask, dialog: confirm.dialog };
}

export function InstitutionsList() {
  const s = useAppState();
  const can = useCan();
  const status = useInstitutionStatus();
  const members = memberRows(s);
  const count = (i: Institution) => members.filter((m) => m.account.institutionId === i.id).length;
  const rows = s.platform.institutions;
  const requests = rows.filter((i) => i.status === "pending");
  const columns: Column<Institution>[] = [
    { id: "name", header: "Organisation", primary: true, sort: (i) => i.name, csv: (i) => i.name, cell: (i) => <span className="min-w-[12rem]">{i.name}</span> },
    { id: "kind", header: "Type", sort: (i) => ORG_KIND_LABEL[i.kind], csv: (i) => ORG_KIND_LABEL[i.kind], cell: (i) => <span className="text-meta text-sub">{ORG_KIND_LABEL[i.kind]}</span> },
    { id: "loc", header: "Location", sort: (i) => i.location, csv: (i) => i.location, cell: (i) => <span className="text-meta text-sub">{i.location}</span> },
    { id: "members", header: "Members on TRUEVIX", sort: count, csv: count, cell: (i) => <span className="text-meta tabular-nums text-sub">{count(i)}</span> },
    { id: "rel", header: "Relationship", sort: (i) => i.relationship, csv: (i) => REL_LABEL[i.relationship], cell: (i) => <span className="text-meta text-sub">{REL_LABEL[i.relationship]}</span>, hideOnMobile: true },
    { id: "status", header: "Status", sort: (i) => i.status, csv: (i) => i.status, cell: (i) => <AdminStatus value={i.status} /> },
  ];
  return (
    <>
      <AdminHeader
        title="Institutions and organisations"
        description="Universities, colleges, incubators, accelerators, companies and research organisations. Verification confirms an organisation is real; only a recorded agreement makes it a partner."
        actions={
          can("institutions", "create") && (
            <ButtonLink href="/admin/institutions/new" variant="accent" size="sm">
              <Plus size={15} aria-hidden /> New organisation
            </ButtonLink>
          )
        }
      />
      {requests.length > 0 && (
        <Block title="Registration requests" className="mb-8" description="Organisations that asked for an institution account.">
          <ul>
            {requests.map((i) => (
              <li key={i.id} className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/institutions/${i.id}`} className="text-ui font-medium hover:underline">
                    {i.name}
                  </Link>
                  <p className="text-meta text-sub">
                    {ORG_KIND_LABEL[i.kind]} · {i.location}
                    {i.request ? ` · requested ${formatDate(i.request.submittedAt)} by ${i.request.submittedBy}` : ""}
                  </p>
                  {i.request?.note && <p className="mt-0.5 text-meta text-charcoal">“{i.request.note}”</p>}
                </div>
                {can("institutions", "approve") && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => status.ask(i, "verified")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => status.ask(i, "rejected")}>
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Block>
      )}
      <DataTable
        label="Organisations"
        module="institutions"
        rows={rows}
        columns={columns}
        getId={(i) => i.id}
        search={(i) => [i.name, i.location, i.description]}
        searchPlaceholder="Search organisations"
        filters={[
          { id: "kind", label: "Type", options: Object.entries(ORG_KIND_LABEL).map(([value, label]) => ({ value, label })), test: (i, v) => i.kind === v },
          { id: "status", label: "Status", options: ["pending", "verified", "rejected", "archived"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })), test: (i, v) => i.status === v },
        ]}
        initialSort={{ id: "name", dir: "asc" }}
        rowHref={(i) => `/admin/institutions/${i.id}`}
        exportName="truevix-organisations"
      />
      {status.dialog}
    </>
  );
}

const blankInstitution = (): Institution => ({
  id: "",
  name: "",
  kind: "university",
  location: "",
  website: "",
  description: "",
  status: "verified",
  relationship: "listed",
  representatives: [],
  administrators: [],
  documents: [],
  programmes: [],
  createdAt: "",
  demo: false,
});

export function InstitutionForm({ id }: { id?: string }) {
  const s = useAppState();
  const router = useRouter();
  const can = useCan();
  const existing = id ? s.platform.institutions.find((i) => i.id === id) : undefined;
  const [f, setF] = useState<Institution>(() => existing ?? blankInstitution());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slot] = useState(() => id ?? `new-${Date.now()}`);
  if (id && !existing) return <EmptyState title="Organisation not found" body="It may have been removed." action={<ButtonLink href="/admin/institutions">All organisations</ButtonLink>} />;
  if (!can("institutions", existing ? "edit" : "create")) return <EmptyState title="Your role can’t do this" body="Ask a super administrator for institution permissions." />;
  const text = (k: keyof Institution) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 3) e.name = "Enter the organisation’s full name.";
    if (f.location.trim().length < 2) e.location = "Enter a city and country.";
    if (f.website?.trim() && !/^https:\/\/[^\s]+\.[^\s]+$/i.test(f.website.trim())) e.website = "Enter a full https:// address.";
    if (f.relationship === "partner_confirmed" && (f.agreementRef ?? "").trim().length < 3) e.agreementRef = "A partner label needs the reference of the signed agreement.";
    if (s.platform.institutions.some((i) => i.id !== f.id && i.name.trim().toLowerCase() === f.name.trim().toLowerCase())) e.name = "An organisation with this name already exists.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const newId = adminSaveInstitution({ ...f, name: f.name.trim(), location: f.location.trim(), website: f.website?.trim() || undefined, description: f.description.trim().slice(0, 1000) }, !existing);
    toast(existing ? "Organisation saved" : "Organisation created", { body: existing ? undefined : "It can now be chosen as an organiser and linked to members." });
    router.push(`/admin/institutions/${newId}`);
  };
  return (
    <>
      <AdminHeader title={existing ? `Edit ${existing.name}` : "New organisation"} description="Organisations you create are verified by default. Add a partnership only when a signed agreement exists." />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex max-w-3xl flex-col gap-8"
      >
        <Block title="Profile">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <TextField label="Organisation name" value={f.name} onChange={text("name")} error={errors.name} maxLength={160} />
            </div>
            <SelectField label="Type" value={f.kind} onChange={(e) => setF((x) => ({ ...x, kind: e.target.value as OrgKind }))} options={Object.entries(ORG_KIND_LABEL).map(([value, label]) => ({ value, label }))} />
            <TextField label="Location" value={f.location} onChange={text("location")} error={errors.location} maxLength={120} />
            <div className="md:col-span-2">
              <TextField label="Website" value={f.website ?? ""} onChange={text("website")} error={errors.website} optional placeholder="https://" />
            </div>
            <div className="md:col-span-2">
              <TextArea label="Description" rows={3} value={f.description} onChange={text("description")} maxLength={1000} />
            </div>
          </div>
        </Block>
        <Block title="Relationship with TRUEVIX">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Relationship"
              value={f.relationship}
              onChange={(e) => setF((x) => ({ ...x, relationship: e.target.value as Institution["relationship"] }))}
              options={[
                { value: "listed", label: "Listed only (no agreement)" },
                { value: "registered", label: "Registered account" },
                { value: "partner_confirmed", label: "Partner — signed agreement on file" },
              ]}
              hint="Members only see the word “partner” for the last option."
            />
            {f.relationship === "partner_confirmed" && <TextField label="Agreement reference" value={f.agreementRef ?? ""} onChange={text("agreementRef")} error={errors.agreementRef} />}
          </div>
        </Block>
        <Block title="Logo and documents">
          <div className="grid gap-6 md:grid-cols-2">
            <AdminFileField kind="image" slot={`inst:${slot}:logo`} label="Logo" value={f.logo ? [f.logo] : []} onChange={(v: FileMeta[]) => setF((x) => ({ ...x, logo: v[0] }))} />
            <AdminFileField kind="document" slot={`inst:${slot}:docs`} label="Supporting documents" value={f.documents} onChange={(v) => setF((x) => ({ ...x, documents: v }))} multiple />
          </div>
        </Block>
        <FormActions>
          <Button variant="ghost" onClick={() => router.push(existing ? `/admin/institutions/${existing.id}` : "/admin/institutions")}>
            Cancel
          </Button>
          <Button type="submit">{existing ? "Save changes" : "Create organisation"}</Button>
        </FormActions>
      </form>
    </>
  );
}

type InstTab = "overview" | "people" | "programmes" | "related";

export function InstitutionDetail({ id }: { id: string }) {
  const s = useAppState();
  const can = useCan();
  const router = useRouter();
  const status = useInstitutionStatus();
  const [tab, setTab] = useTabParam<InstTab>(["overview", "people", "programmes", "related"], "overview");
  const [link, setLink] = useState("");
  const [rep, setRep] = useState("");
  const [prog, setProg] = useState({ name: "", status: "Planned" });
  const i = s.platform.institutions.find((x) => x.id === id);
  if (!i) return <EmptyState title="Organisation not found" body="It may have been removed." action={<ButtonLink href="/admin/institutions">All organisations</ButtonLink>} />;
  const members = memberRows(s).filter((m) => m.account.institutionId === i.id);
  const unlinked = memberRows(s).filter((m) => !m.isMe && m.account.institutionId !== i.id);
  const opps = s.platform.opportunities.filter((o) => o.organiserId === i.id);
  const regs = s.platform.registrations.filter((r) => r.members.some((m) => m.personId && members.some((x) => x.id === m.personId)));
  const collabs = s.platform.collaborations.filter((c) => members.some((m) => m.id === c.fromId || m.id === c.toId));
  const audit = s.admin.audit.filter((e) => e.targetId === i.id);
  const edit = can("institutions", "edit");
  const save = (patch: Partial<Institution>, msg: string) => {
    adminSaveInstitution({ ...i, ...patch }, false);
    toast(msg);
  };
  return (
    <>
      <AdminHeader
        title={i.name}
        flags={
          <>
            <AdminStatus value={i.status} />
            {i.relationship === "partner_confirmed" && <Flag tone="accent">Partner</Flag>}
            {i.demo && <Flag>Sample</Flag>}
          </>
        }
        meta={
          <>
            <span>{ORG_KIND_LABEL[i.kind]}</span>
            <span>{i.location}</span>
            <span>{members.length} members on TRUEVIX</span>
          </>
        }
        actions={
          <>
            <PermButton module="institutions" perm="edit" variant="secondary" size="sm" onClick={() => router.push(`/admin/institutions/${i.id}/edit`)}>
              <Pencil size={14} aria-hidden /> Edit
            </PermButton>
            {can("institutions", "approve") && (
              <InlineSelect
                aria-label="Change organisation status"
                value=""
                className="h-8"
                onChange={(e) => e.target.value && status.ask(i, e.target.value as Institution["status"])}
                options={[{ value: "", label: "Change status…" }, ...(["verified", "rejected", "pending", "archived"] as const).filter((x) => x !== i.status).map((x) => ({ value: x, label: x === "verified" ? "Approve" : x === "pending" ? "Return to review" : x[0].toUpperCase() + x.slice(1) }))]}
              />
            )}
          </>
        }
      />
      <RecordTabs
        label="Organisation record"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "people", label: "Members and representatives", count: members.length },
          { value: "programmes", label: "Programmes", count: i.programmes.length },
          { value: "related", label: "Activity and related" },
        ]}
      />
      {tab === "overview" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Profile">
            <Details
              items={[
                { label: "Description", value: i.description, wide: true },
                { label: "Website", value: i.website ? <a href={i.website} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">{i.website}</a> : undefined },
                { label: "Relationship", value: REL_LABEL[i.relationship] },
                { label: "Agreement reference", value: i.agreementRef },
                { label: "Logo", value: i.logo?.name },
                { label: "Documents", value: i.documents.map((d) => d.name).join(", ") },
                { label: "Created", value: i.createdAt ? formatDate(i.createdAt) : undefined },
              ]}
            />
          </Block>
          {i.request && (
            <Block title="Registration request">
              <Details
                items={[
                  { label: "Submitted by", value: i.request.submittedBy },
                  { label: "Submitted", value: formatDate(i.request.submittedAt) },
                  { label: "Note", value: i.request.note, wide: true },
                ]}
              />
            </Block>
          )}
        </div>
      )}
      {tab === "people" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Linked members" description="Students and staff who list this organisation.">
            <RelatedList items={members.map((m) => ({ id: m.id, href: `/admin/users/${m.id}`, title: m.person.name, meta: m.person.role.replace("_", " ") }))} />
            {edit && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InlineSelect aria-label="Member to link" value={link} onChange={(e) => setLink(e.target.value)} options={[{ value: "", label: "Link a member…" }, ...unlinked.map((m) => ({ value: m.id, label: m.person.name }))]} />
                <Button size="sm" variant="secondary" className="h-10" disabled={!link} onClick={() => (adminUpdateMember(link, {}, { institutionId: i.id }), setLink(""), toast("Member linked"))}>
                  Link member
                </Button>
              </div>
            )}
          </Block>
          <Block title="Representatives and administrators" description="Administrators can run programmes for this organisation once server roles exist.">
            <ul>
              {[...new Set([...i.representatives, ...i.administrators])].map((pid) => (
                <li key={pid} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                  <Link href={`/admin/users/${pid}`} className="text-ui hover:underline">
                    {s.platform.people.find((p) => p.id === pid)?.name ?? pid}
                  </Link>
                  <span className="flex items-center gap-2 text-meta text-sub">
                    {i.administrators.includes(pid) ? "Administrator" : "Representative"}
                    {edit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => save({ representatives: i.representatives.filter((x) => x !== pid), administrators: i.administrators.filter((x) => x !== pid) }, "Removed from organisation")}
                      >
                        Remove
                      </Button>
                    )}
                  </span>
                </li>
              ))}
              {!i.representatives.length && !i.administrators.length && <li className="text-meta text-sub">None assigned.</li>}
            </ul>
            {edit && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InlineSelect aria-label="Person to add as representative" value={rep} onChange={(e) => setRep(e.target.value)} options={[{ value: "", label: "Choose a member…" }, ...s.platform.people.filter((p) => !i.representatives.includes(p.id)).map((p) => ({ value: p.id, label: p.name }))]} />
                <Button size="sm" variant="secondary" className="h-10" disabled={!rep} onClick={() => (save({ representatives: [...i.representatives, rep] }, "Representative added"), setRep(""))}>
                  Add representative
                </Button>
                <Button size="sm" variant="ghost" className="h-10" disabled={!rep} onClick={() => (save({ representatives: [...new Set([...i.representatives, rep])], administrators: [...new Set([...i.administrators, rep])] }, "Institution administrator added"), setRep(""))}>
                  Add as administrator
                </Button>
              </div>
            )}
          </Block>
        </div>
      )}
      {tab === "programmes" && (
        <Block title="Programmes and activities">
          <ul>
            {i.programmes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                <span className="text-ui">{p.name}</span>
                <span className="text-meta text-sub">
                  {p.status} · {p.participants} participants
                </span>
              </li>
            ))}
            {!i.programmes.length && <li className="text-meta text-sub">No programmes recorded.</li>}
          </ul>
          {edit && (
            <div className="mt-4 grid max-w-xl gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
              <TextField label="Programme name" value={prog.name} onChange={(e) => setProg({ ...prog, name: e.target.value })} maxLength={120} />
              <SelectField label="Status" value={prog.status} onChange={(e) => setProg({ ...prog, status: e.target.value })} options={["Planned", "Applications open", "Running", "Completed"].map((x) => ({ value: x, label: x }))} />
              <Button
                variant="secondary"
                disabled={prog.name.trim().length < 3}
                onClick={() => {
                  save({ programmes: [...i.programmes, { id: `prog-${Date.now()}`, name: prog.name.trim(), status: prog.status, participants: 0 }] }, "Programme added");
                  setProg({ name: "", status: "Planned" });
                }}
              >
                Add
              </Button>
            </div>
          )}
        </Block>
      )}
      {tab === "related" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Opportunities organised">
            <RelatedList items={opps.map((o) => ({ id: o.id, href: `/admin/opportunities/${o.id}`, title: o.title, meta: o.publication ?? "published" }))} />
          </Block>
          <Block title="Members’ applications">
            <RelatedList items={regs.map((r) => ({ id: r.id, href: `/admin/opportunities/${r.opportunityId}/applications/${r.id}`, title: r.teamName || r.members[0]?.name || r.id, meta: r.status.replace("_", " ") }))} />
          </Block>
          <Block title="Members’ collaborations">
            <RelatedList items={collabs.map((c) => ({ id: c.id, href: "/admin/collaboration", title: c.role, meta: c.status }))} />
          </Block>
          <Block title="History">
            <Timeline events={audit.map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `${e.action}${e.reason ? ` — ${e.reason}` : ""}` }))} empty="No administrative changes yet." />
          </Block>
        </div>
      )}
      {status.dialog}
    </>
  );
}
