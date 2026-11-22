"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, Pencil, Star } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineSelect, SelectField, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { INDUSTRIES, industryLabel, stageLabel, STAGES, VISIBILITY } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminEditIdea, adminRecordConfidentialAccess, adminReviewIdeas, adminSetIdeaFeatured, adminSetIdeaPublication } from "@/lib/store/admin-actions";
import { allIdeasAdmin, personById } from "@/lib/store/selectors";
import type { Idea, IdeaReview, IdeaStage, IndustryId, TeamMember } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Block, Details, Timeline } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { PermButton, useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";
import { RecordTabs, useTabParam } from "../kit/record-tabs";
import { RelatedList } from "./users";

const reviewOf = (i: Idea) => (i.status === "draft" ? "draft" : (i.review?.status ?? "approved"));
const pubOf = (i: Idea) => i.publication ?? "published";
const visLabel = (v: Idea["visibility"]) => VISIBILITY.find((x) => x.id === v)?.label ?? v;

function useReview() {
  const confirm = useConfirm();
  const ask = (ids: string[], label: string, status: IdeaReview["status"], done?: () => void) => {
    const text = {
      approved: { title: `Approve ${label}?`, c: "Public ideas become listed in Ideas and Discover for other members.", btn: "Approve" },
      changes_requested: { title: `Request changes to ${label}?`, c: "The idea stays unlisted until it is approved. The owner sees your note.", btn: "Request changes" },
      rejected: { title: `Reject ${label}?`, c: "The idea stays visible to its owner only. Nothing is deleted.", btn: "Reject" },
      pending: { title: `Return ${label} to review?`, c: "The idea is unlisted until it is reviewed again.", btn: "Return to review" },
    }[status];
    confirm.ask({
      title: text.title,
      consequences: [text.c, "The decision is recorded in the idea’s history and the audit log."],
      confirmLabel: text.btn,
      danger: status === "rejected",
      reason: status === "approved" ? "optional" : "required",
      reasonLabel: status === "approved" ? "Note to the owner" : "Note to the owner (reason)",
      onConfirm: (note) => {
        adminReviewIdeas(ids, status, note);
        toast(`${text.btn === "Approve" ? "Approved" : text.btn === "Reject" ? "Rejected" : text.btn === "Request changes" ? "Changes requested" : "Returned to review"}: ${label}`);
        done?.();
      },
    });
  };
  return { ask, dialog: confirm.dialog };
}

export function IdeasList() {
  const s = useAppState();
  const can = useCan();
  const review = useReview();
  const rows = allIdeasAdmin(s);
  const columns: Column<Idea>[] = [
    {
      id: "title",
      header: "Idea",
      primary: true,
      sort: (i) => i.title,
      csv: (i) => i.title,
      cell: (i) => (
        <span className="flex min-w-[14rem] items-start gap-1.5">
          {i.featured && <Star size={13} className="mt-1 shrink-0 fill-accent text-accent" aria-label="Featured" />}
          <span className="line-clamp-2">{i.title}</span>
        </span>
      ),
    },
    { id: "owner", header: "Owner", sort: (i) => personById(s, i.ownerId)?.name ?? "", csv: (i) => personById(s, i.ownerId)?.name, cell: (i) => <span className="text-meta text-sub">{personById(s, i.ownerId)?.name ?? "Unknown"}</span> },
    { id: "industry", header: "Industry", sort: (i) => industryLabel(i.industry), csv: (i) => industryLabel(i.industry), cell: (i) => <span className="text-meta text-sub">{industryLabel(i.industry)}</span> },
    { id: "stage", header: "Stage", sort: (i) => STAGES.findIndex((x) => x.id === i.stage), csv: (i) => stageLabel(i.stage), cell: (i) => <span className="text-meta text-sub">{stageLabel(i.stage)}</span> },
    { id: "region", header: "Region", csv: (i) => i.geography, cell: (i) => <span className="text-meta text-sub">{i.geography || "—"}</span>, hideOnMobile: true },
    { id: "vis", header: "Visibility", sort: (i) => i.visibility, csv: (i) => visLabel(i.visibility), cell: (i) => <span className="text-meta text-sub">{visLabel(i.visibility)}</span> },
    { id: "review", header: "Review", sort: (i) => reviewOf(i), csv: (i) => reviewOf(i), cell: (i) => <AdminStatus value={reviewOf(i)} /> },
    { id: "pub", header: "Listing", sort: (i) => pubOf(i), csv: (i) => pubOf(i), cell: (i) => <AdminStatus value={pubOf(i)} /> },
    { id: "created", header: "Submitted", sort: (i) => i.createdAt, csv: (i) => i.createdAt.slice(0, 10), cell: (i) => <span className="whitespace-nowrap text-meta text-sub">{formatDate(i.createdAt)}</span> },
  ];
  return (
    <>
      <AdminHeader
        title="Ideas and projects"
        description="Review submitted ideas, manage listings and teams. Confidential details of private ideas stay closed until you record a reason for opening them."
        meta={
          <>
            <span>{rows.filter((i) => i.status === "submitted").length} submitted</span>
            <span>{rows.filter((i) => i.review?.status === "pending").length} awaiting review</span>
            <span>Review before listing: {s.admin.settings.requireIdeaReview ? "on" : "off"}</span>
          </>
        }
      />
      <DataTable
        label="Ideas"
        module="ideas"
        rows={rows}
        columns={columns}
        getId={(i) => i.id}
        search={(i) => [i.title, i.summary, personById(s, i.ownerId)?.name, i.geography]}
        searchPlaceholder="Search by title, owner or region"
        filters={[
          { id: "review", label: "Review", options: ["pending", "approved", "changes_requested", "rejected", "draft"].map((v) => ({ value: v, label: v.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()) })), test: (i, v) => reviewOf(i) === v },
          { id: "industry", label: "Industry", options: INDUSTRIES.map((x) => ({ value: x.id, label: x.label })), test: (i, v) => i.industry === v },
          { id: "stage", label: "Stage", options: STAGES.map((x) => ({ value: x.id, label: x.label })), test: (i, v) => i.stage === v },
          { id: "vis", label: "Visibility", options: VISIBILITY.map((x) => ({ value: x.id, label: x.label })), test: (i, v) => i.visibility === v },
          { id: "pub", label: "Listing", options: ["published", "unpublished", "archived"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })), test: (i, v) => pubOf(i) === v },
        ]}
        initialSort={{ id: "created", dir: "desc" }}
        rowHref={(i) => `/admin/ideas/${i.id}`}
        exportName="truevix-ideas"
        bulk={(ids, clear) =>
          can("ideas", "approve") ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => review.ask(ids, `${ids.length} ideas`, "approved", clear)}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => review.ask(ids, `${ids.length} ideas`, "changes_requested", clear)}>
                Request changes
              </Button>
            </>
          ) : null
        }
      />
      {review.dialog}
    </>
  );
}

function EditIdeaDialog({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const [f, setF] = useState({ title: idea.title, summary: idea.summary, industry: idea.industry as string, stage: idea.stage as string, geography: idea.geography, reason: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () => {
    const err: Record<string, string> = {};
    if (f.title.trim().length < 8) err.title = "Use at least 8 characters.";
    if (f.reason.trim().length < 5) err.reason = "Say why you are editing the owner’s idea (at least 5 characters).";
    setErrors(err);
    if (Object.keys(err).length) return;
    adminEditIdea(idea.id, { title: f.title.trim(), summary: f.summary.trim(), industry: f.industry as IndustryId, stage: f.stage as IdeaStage, geography: f.geography.trim() }, f.reason.trim());
    toast("Idea updated", { body: "The change is shown in the idea’s history." });
    onClose();
  };
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Edit listing information"
      description="Correct listing details such as the title, category or stage. The problem and solution are the owner’s words and can’t be rewritten here."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save changes</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TextField label="Title" value={f.title} onChange={set("title")} error={errors.title} maxLength={140} />
        </div>
        <div className="md:col-span-2">
          <TextArea label="Public summary" rows={3} value={f.summary} onChange={set("summary")} maxLength={300} />
        </div>
        <SelectField label="Industry" value={f.industry} onChange={set("industry")} options={INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))} />
        <SelectField label="Stage" value={f.stage} onChange={set("stage")} options={STAGES.map((x) => ({ value: x.id, label: x.label }))} />
        <TextField label="Region" value={f.geography} onChange={set("geography")} maxLength={120} />
        <div className="md:col-span-2">
          <TextArea label="Reason for editing" rows={2} value={f.reason} onChange={set("reason")} error={errors.reason} hint="Recorded in the audit log and the idea’s history." />
        </div>
      </div>
    </Dialog>
  );
}

function TeamEditor({ idea }: { idea: Idea }) {
  const s = useAppState();
  const can = useCan();
  const [team, setTeam] = useState<TeamMember[]>(idea.team);
  const [add, setAdd] = useState("");
  const dirty = JSON.stringify(team) !== JSON.stringify(idea.team);
  const candidates = s.platform.people.filter((p) => !team.some((t) => t.personId === p.id));
  const editable = can("ideas", "edit");
  return (
    <div className="flex flex-col gap-3">
      <ul>
        {team.map((t, i) => {
          const p = personById(s, t.personId);
          const owner = t.personId === idea.ownerId;
          return (
            <li key={t.personId} className="flex flex-wrap items-center gap-3 border-b border-line py-2">
              <Link href={`/admin/users/${t.personId}`} className="min-w-[10rem] flex-1 text-ui hover:underline">
                {p?.name ?? t.personId}
                {owner && <span className="ml-2 text-micro text-mute">Owner</span>}
              </Link>
              <input
                aria-label={`Role of ${p?.name ?? t.personId}`}
                value={t.role}
                disabled={!editable}
                maxLength={60}
                onChange={(e) => setTeam((list) => list.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                className="h-8 w-44 rounded-sm border border-line-strong px-2 text-meta focus:border-ink focus:outline-none"
              />
              {!owner && editable && (
                <Button size="sm" variant="ghost" onClick={() => setTeam((list) => list.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <InlineSelect aria-label="Add team member" value={add} onChange={(e) => setAdd(e.target.value)} options={[{ value: "", label: "Add a member…" }, ...candidates.map((p) => ({ value: p.id, label: p.name }))]} />
          <Button size="sm" variant="secondary" className="h-10" disabled={!add} onClick={() => (setTeam((l) => [...l, { personId: add, role: "Contributor" }]), setAdd(""))}>
            Add
          </Button>
          <Button
            size="sm"
            className="h-10"
            disabled={!dirty}
            onClick={() => {
              adminEditIdea(idea.id, { team }, "Team membership corrected by an administrator");
              toast("Team updated");
            }}
          >
            Save team
          </Button>
        </div>
      )}
    </div>
  );
}

type IdeaTab = "overview" | "confidential" | "team" | "history" | "related";

export function IdeaAdminDetail({ id }: { id: string }) {
  const s = useAppState();
  const can = useCan();
  const idea = allIdeasAdmin(s).find((i) => i.id === id);
  const [tab, setTab] = useTabParam<IdeaTab>(["overview", "confidential", "team", "history", "related"], "overview");
  const [editing, setEditing] = useState(false);
  const [opened, setOpened] = useState(false);
  const review = useReview();
  const confirm = useConfirm();
  if (!idea) return <EmptyState title="Idea not found" body="It may have been deleted by its owner." action={<ButtonLink href="/admin/ideas">All ideas</ButtonLink>} />;
  const owner = personById(s, idea.ownerId);
  const confidential = idea.visibility !== "public_summary";
  const reports = s.platform.reports.filter((r) => r.targetType === "idea" && r.targetId === idea.id);
  const audit = s.admin.audit.filter((e) => e.targetId === idea.id);
  const label = `“${idea.title.split(":")[0]}”`;
  const pub = pubOf(idea);
  const setPub = (p: NonNullable<Idea["publication"]>) =>
    confirm.ask({
      title: `${p === "published" ? "Restore" : p === "archived" ? "Archive" : "Unpublish"} ${label}?`,
      consequences: [p === "published" ? "The idea is listed again according to its owner’s visibility setting." : "The idea is hidden from other members. The owner keeps full access and nothing is deleted."],
      confirmLabel: p === "published" ? "Restore listing" : p === "archived" ? "Archive" : "Unpublish",
      reason: p === "published" ? "optional" : "required",
      onConfirm: (r) => {
        adminSetIdeaPublication(idea.id, p, r);
        toast(p === "published" ? "Listing restored" : p === "archived" ? "Idea archived" : "Idea unpublished");
      },
    });

  return (
    <>
      <AdminHeader
        title={idea.title}
        flags={
          <>
            <AdminStatus value={reviewOf(idea)} />
            {pub !== "published" && <AdminStatus value={pub} />}
            {idea.featured && <Flag tone="accent">Featured</Flag>}
            {idea.demo && <Flag>Sample</Flag>}
          </>
        }
        meta={
          <>
            <span>
              Owner:{" "}
              <Link href={`/admin/users/${idea.ownerId}`} className="text-ink underline underline-offset-4">
                {owner?.name ?? "Unknown"}
              </Link>
            </span>
            <span>{visLabel(idea.visibility)}</span>
            <span>Updated {formatDate(idea.updatedAt)}</span>
          </>
        }
        actions={
          <>
            {idea.status === "submitted" && (
              <ButtonLink href={`/ideas/${idea.id}`} variant="ghost" size="sm">
                Public page
              </ButtonLink>
            )}
            <PermButton module="ideas" perm="edit" variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} aria-hidden /> Edit
            </PermButton>
            <PermButton module="ideas" perm="publish" variant="secondary" size="sm" onClick={() => (adminSetIdeaFeatured(idea.id, !idea.featured), toast(idea.featured ? "Removed from featured" : "Featured"))}>
              {idea.featured ? "Unfeature" : "Feature"}
            </PermButton>
            {can("ideas", "archive") && (
              <InlineSelect
                aria-label="Change listing"
                value=""
                className="h-8"
                onChange={(e) => e.target.value && setPub(e.target.value as NonNullable<Idea["publication"]>)}
                options={[{ value: "", label: "Listing…" }, ...(["published", "unpublished", "archived"] as const).filter((p) => p !== pub).map((p) => ({ value: p, label: p === "published" ? "Restore listing" : p === "archived" ? "Archive" : "Unpublish" }))]}
              />
            )}
          </>
        }
      />

      {idea.status === "submitted" && can("ideas", "approve") && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-line bg-paper p-3">
          <p className="min-w-0 flex-1 text-ui">
            <span className="font-medium">Review decision.</span> <span className="text-sub">{idea.review?.note ? `Last note: ${idea.review.note}` : "Decisions are shown to the owner and logged."}</span>
          </p>
          {reviewOf(idea) !== "approved" && (
            <Button size="sm" onClick={() => review.ask([idea.id], label, "approved")}>
              Approve
            </Button>
          )}
          {reviewOf(idea) !== "changes_requested" && (
            <Button size="sm" variant="secondary" onClick={() => review.ask([idea.id], label, "changes_requested")}>
              Request changes
            </Button>
          )}
          {reviewOf(idea) !== "rejected" && (
            <Button size="sm" variant="ghost" onClick={() => review.ask([idea.id], label, "rejected")}>
              Reject
            </Button>
          )}
        </div>
      )}

      <RecordTabs
        label="Idea record"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "confidential", label: confidential ? "Confidential details" : "Full details" },
          { value: "team", label: "Team", count: idea.team.length },
          { value: "history", label: "History" },
          { value: "related", label: "Related", count: reports.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Block title="Public listing" description="What other members see when the idea is listed.">
            <Details
              items={[
                { label: "Summary", value: idea.summary, wide: true },
                { label: "Industry", value: industryLabel(idea.industry) },
                { label: "Stage", value: stageLabel(idea.stage) },
                { label: "Region", value: idea.geography },
                { label: "Target users", value: idea.targetUsers },
                { label: "Skills needed", value: idea.requiredSkills.join(", "), wide: true },
              ]}
            />
          </Block>
          <Block title="Status">
            <Details
              items={[
                { label: "Submission", value: idea.status === "submitted" ? "Submitted" : "Draft (owner only)" },
                { label: "Ownership declaration", value: idea.demo ? "Sample record (no declaration)" : idea.status === "submitted" ? "Confirmed by the owner at submission" : "Not yet given (draft)" },
                { label: "Research", value: idea.researchStatus.replace(/_/g, " ") },
                { label: "Validation", value: idea.validationStatus.replace(/_/g, " ") },
                { label: "Followers", value: idea.followers },
                { label: "Created", value: formatDate(idea.createdAt) },
              ]}
            />
          </Block>
        </div>
      )}

      {tab === "confidential" &&
        (confidential && !opened ? (
          <div className="max-w-xl rounded-md border border-dashed border-line-strong p-6">
            <Lock size={20} className="text-sub" aria-hidden />
            <h2 className="mt-3 text-section font-bold">Confidential idea details</h2>
            <p className="mt-1 text-ui text-sub">
              The owner shared this idea as “{visLabel(idea.visibility)}”. Open the problem, solution and research only when you need them for a review, report or support request. Opening is recorded in the audit log.
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() =>
                confirm.ask({
                  title: "Open confidential details?",
                  consequences: ["Your name, the time and your reason are recorded in the audit log."],
                  confirmLabel: "Open details",
                  reason: "required",
                  reasonLabel: "Why do you need to see these details?",
                  onConfirm: (r) => {
                    adminRecordConfidentialAccess(idea.id, idea.title, r);
                    setOpened(true);
                  },
                })
              }
            >
              Open with a reason
            </Button>
          </div>
        ) : (
          <Block title={confidential ? "Confidential details" : "Full details"} description={confidential ? "Opened for this session. Access was logged." : "Visible to signed-in members because the owner chose a public summary."}>
            <Details
              items={[
                { label: "Problem", value: idea.problem, wide: true },
                { label: "Proposed solution", value: idea.solution, wide: true },
                { label: "Existing research", value: idea.existingResearch, wide: true },
                { label: "Collaboration needs", value: idea.collaborationNeeds, wide: true },
              ]}
            />
          </Block>
        ))}

      {tab === "team" && (
        <Block title="Project team" description="Correct team membership and roles when members ask for help.">
          <TeamEditor idea={idea} />
        </Block>
      )}

      {tab === "history" && (
        <Block title="Status and change history">
          <Timeline
            events={[
              ...(idea.history ?? []),
              ...audit.filter((e) => !(idea.history ?? []).some((h) => h.at === e.createdAt)).map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `${e.action}${e.reason ? ` — ${e.reason}` : ""}` })),
              { id: "created", at: idea.createdAt, by: owner?.name, text: idea.status === "submitted" ? "Submitted" : "Draft created" },
            ].sort((a, b) => b.at.localeCompare(a.at))}
          />
        </Block>
      )}

      {tab === "related" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Reports about this idea">
            <RelatedList items={reports.map((r) => ({ id: r.id, href: `/admin/moderation/${r.id}`, title: r.reason, meta: r.status.replace("_", " ") }))} />
          </Block>
          <Block title="Research and validation">
            <RelatedList
              items={[
                ...[...s.research, ...s.platform.research].filter((r) => r.ideaId === idea.id).map((r) => ({ id: r.id, href: `/admin/research/${r.id}`, title: r.question, meta: r.runStatus ?? "completed" })),
                ...(s.validations[idea.id] || s.platform.validations[idea.id] ? [{ id: "val", href: `/admin/validation/${idea.id}`, title: "Validation workspace", meta: idea.validationStatus.replace(/_/g, " ") }] : []),
              ]}
            />
          </Block>
          <Block title="Collaboration">
            <RelatedList items={s.platform.collaborations.filter((c) => c.ideaId === idea.id).map((c) => ({ id: c.id, href: "/admin/collaboration", title: `${c.kind.replace("_", " ")}: ${c.role}`, meta: c.status }))} />
          </Block>
        </div>
      )}

      {editing && <EditIdeaDialog idea={idea} onClose={() => setEditing(false)} />}
      {review.dialog}
      {confirm.dialog}
    </>
  );
}
