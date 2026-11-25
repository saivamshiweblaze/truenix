"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineSelect, SelectField, TextArea, TextField } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { industryLabel, OPPORTUNITY_KIND_LABEL, stageLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminPatchOpportunity, adminSetOpportunityPublication, adminSetScore, adminUpdateHackathon } from "@/lib/store/admin-actions";
import { personById } from "@/lib/store/selectors";
import { opportunityLifecycle } from "@/lib/admin/lifecycle";
import type { FileMeta, HackathonConfig, Opportunity, OpportunityPublication } from "@/lib/types";
import { formatDate, timeAgo, uid } from "@/lib/utils";
import { AdminHeader, Block, Details, Timeline } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { PermButton, useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";
import { RecordTabs, useTabParam } from "../kit/record-tabs";
import { AdminFileField } from "../kit/upload";
import { ApplicationsTable, regName, weightedScore } from "./applications";

const SOURCE_LABEL = (o: Opportunity) => (o.source === "weblaze" ? "Run on TRUEVIX" : "External listing");

export function usePublication() {
  const confirm = useConfirm();
  const ask = (ids: string[], label: string, to: OpportunityPublication, done?: () => void) => {
    const t = {
      published: { btn: "Publish", c: "Visible in Opportunities to every member according to its dates.", past: "Published" },
      unpublished: { btn: "Unpublish", c: "Removed from Opportunities. Existing applications are kept.", past: "Unpublished" },
      archived: { btn: "Archive", c: "Hidden everywhere and moved to the archive. It can be restored.", past: "Archived" },
      draft: { btn: "Restore as draft", c: "Moves back to drafts so it can be edited before publishing again.", past: "Restored as draft" },
    }[to];
    confirm.ask({
      title: `${t.btn} ${label}?`,
      consequences: [t.c, "Recorded in the opportunity’s history and the audit log."],
      confirmLabel: t.btn,
      reason: to === "published" || to === "draft" ? "optional" : "required",
      onConfirm: (r) => {
        adminSetOpportunityPublication(ids, to, r);
        toast(`${t.past}: ${label}`);
        done?.();
      },
    });
  };
  return { ask, dialog: confirm.dialog };
}

export function OpportunitiesList() {
  const s = useAppState();
  const can = useCan();
  const pub = usePublication();
  const rows = s.platform.opportunities;
  const appCount = (o: Opportunity) => s.platform.registrations.filter((r) => r.opportunityId === o.id).length;
  const columns: Column<Opportunity>[] = [
    {
      id: "title",
      header: "Opportunity",
      primary: true,
      sort: (o) => o.title,
      csv: (o) => o.title,
      cell: (o) => (
        <span className="flex min-w-[14rem] items-start gap-1.5">
          {o.featured && <Star size={13} className="mt-1 shrink-0 fill-accent text-accent" aria-label="Featured" />}
          <span className="line-clamp-2">{o.title}</span>
        </span>
      ),
    },
    { id: "kind", header: "Type", sort: (o) => OPPORTUNITY_KIND_LABEL[o.kind], csv: (o) => OPPORTUNITY_KIND_LABEL[o.kind], cell: (o) => <span className="text-meta text-sub">{OPPORTUNITY_KIND_LABEL[o.kind]}</span> },
    { id: "org", header: "Organiser", sort: (o) => o.organisation, csv: (o) => o.organisation, cell: (o) => <span className="line-clamp-1 text-meta text-sub">{o.organisation}</span>, hideOnMobile: true },
    { id: "source", header: "Source", sort: (o) => o.source ?? "", csv: (o) => `${SOURCE_LABEL(o)}${o.source === "external" ? ` (${o.sourceVerification ?? "unverified"})` : ""}`, cell: (o) => <span className="text-meta text-sub">{SOURCE_LABEL(o)}{o.source === "external" && o.sourceVerification !== "verified" ? " · not verified" : ""}</span>, hideOnMobile: true },
    { id: "status", header: "Status", sort: (o) => opportunityLifecycle(o), csv: (o) => opportunityLifecycle(o), cell: (o) => <AdminStatus value={opportunityLifecycle(o)} /> },
    { id: "deadline", header: "Deadline", sort: (o) => o.deadline, csv: (o) => o.deadline, cell: (o) => <span className="whitespace-nowrap text-meta text-sub">{formatDate(o.deadline)}</span> },
    { id: "apps", header: "Applications", sort: appCount, csv: appCount, cell: (o) => <span className="text-meta tabular-nums text-sub">{o.registrationMode === "on_platform" ? appCount(o) : "External"}</span> },
  ];
  return (
    <>
      <AdminHeader
        title="Opportunities"
        description="Hackathons, competitions, internships, scholarships, grants, workshops and programmes. Listing an external opportunity never implies a partnership with its organiser."
        actions={
          can("opportunities", "create") && (
            <>
              <ButtonLink href="/admin/opportunities/new?kind=hackathon" variant="secondary" size="sm">
                New hackathon
              </ButtonLink>
              <ButtonLink href="/admin/opportunities/new" variant="accent" size="sm">
                <Plus size={15} aria-hidden /> New opportunity
              </ButtonLink>
            </>
          )
        }
      />
      <DataTable
        label="Opportunities"
        module="opportunities"
        rows={rows}
        columns={columns}
        getId={(o) => o.id}
        search={(o) => [o.title, o.organisation, o.description, o.location]}
        searchPlaceholder="Search by title, organiser or location"
        filters={[
          { id: "status", label: "Status", options: ["draft", "upcoming", "open", "closing_soon", "closed", "completed", "unpublished", "archived"].map((v) => ({ value: v, label: v === "closing_soon" ? "Closing soon" : v[0].toUpperCase() + v.slice(1) })), test: (o, v) => opportunityLifecycle(o) === v },
          { id: "kind", label: "Type", options: Object.entries(OPPORTUNITY_KIND_LABEL).map(([value, label]) => ({ value, label })), test: (o, v) => o.kind === v },
          { id: "source", label: "Source", options: [{ value: "weblaze", label: "Run on TRUEVIX" }, { value: "external", label: "External" }], test: (o, v) => (o.source ?? "external") === v },
        ]}
        initialSort={{ id: "deadline", dir: "asc" }}
        rowHref={(o) => `/admin/opportunities/${o.id}`}
        exportName="truevix-opportunities"
        bulk={(ids, clear) =>
          can("opportunities", "publish") ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => pub.ask(ids, `${ids.length} opportunities`, "published", clear)}>
                Publish
              </Button>
              <Button size="sm" variant="secondary" onClick={() => pub.ask(ids, `${ids.length} opportunities`, "unpublished", clear)}>
                Unpublish
              </Button>
              <Button size="sm" variant="secondary" onClick={() => pub.ask(ids, `${ids.length} opportunities`, "archived", clear)}>
                Archive
              </Button>
            </>
          ) : null
        }
      />
      {pub.dialog}
    </>
  );
}

/* ---------------- Hackathon management ---------------- */

const BLANK: HackathonConfig = { rounds: [], criteria: [], judges: [], winners: [], certificates: { issuedTo: [] }, communications: [] };

function HackathonPanel({ o }: { o: Opportunity }) {
  const s = useAppState();
  const can = useCan();
  const confirm = useConfirm();
  const h = { ...BLANK, ...o.hackathon };
  const edit = can("opportunities", "edit");
  const regs = s.platform.registrations.filter((r) => r.opportunityId === o.id && r.status !== "withdrawn" && r.status !== "rejected");
  const [round, setRound] = useState({ name: "", deadline: "", description: "" });
  const [crit, setCrit] = useState({ label: "", weight: "" });
  const [judge, setJudge] = useState("");
  const [scoreRound, setScoreRound] = useState(h.rounds[0]?.id ?? "");
  const [scoreJudge, setScoreJudge] = useState(h.judges[0] ?? "");
  const [msg, setMsg] = useState({ subject: "", body: "", audience: "all" as "all" | "shortlisted" | "selected" });
  const [err, setErr] = useState<Record<string, string>>({});
  const totalWeight = h.criteria.reduce((a, c) => a + c.weight, 0);
  const judgeCandidates = s.platform.people.filter((p) => !h.judges.includes(p.id) && s.platform.talent.some((t) => t.personId === p.id && t.status === "approved"));

  const addRound = () => {
    if (round.name.trim().length < 2 || !round.deadline) return setErr({ round: "Give the round a name and a deadline." });
    if (round.deadline > o.deadline && o.eventEnd && round.deadline > o.eventEnd) return setErr({ round: "Round deadlines must fall before the event ends." });
    adminUpdateHackathon(o.id, { rounds: [...h.rounds, { id: uid("r"), name: round.name.trim().slice(0, 80), deadline: round.deadline, description: round.description.trim().slice(0, 400) }] }, "Added competition round");
    setRound({ name: "", deadline: "", description: "" });
    setErr({});
  };
  const addCriterion = () => {
    const w = Number(crit.weight);
    if (crit.label.trim().length < 2 || !Number.isFinite(w) || w <= 0 || w > 100) return setErr({ crit: "Give the criterion a name and a weight between 1 and 100." });
    if (totalWeight + w > 100) return setErr({ crit: `Weights add up to ${totalWeight + w}. Keep the total at 100.` });
    adminUpdateHackathon(o.id, { criteria: [...h.criteria, { id: uid("c"), label: crit.label.trim().slice(0, 80), weight: w }] }, "Added evaluation criterion");
    setCrit({ label: "", weight: "" });
    setErr({});
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <Block title="Rounds" description="Each round has its own deadline and submissions.">
          <ul className="mb-3">
            {h.rounds.map((r, i) => (
              <li key={r.id} className="flex items-start gap-3 border-b border-line py-2 last:border-b-0">
                <span className="mt-0.5 w-6 text-meta tabular-nums text-mute">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-ui font-medium">{r.name}</p>
                  <p className="text-meta text-sub">
                    Deadline {formatDate(r.deadline)}
                    {r.description ? ` · ${r.description}` : ""}
                  </p>
                </div>
                {edit && (
                  <button type="button" aria-label={`Remove round ${r.name}`} className="rounded-sm p-1 text-sub hover:bg-surface hover:text-ink" onClick={() => adminUpdateHackathon(o.id, { rounds: h.rounds.filter((x) => x.id !== r.id) }, "Removed competition round")}>
                    <Trash2 size={14} aria-hidden />
                  </button>
                )}
              </li>
            ))}
            {!h.rounds.length && <li className="text-meta text-sub">No rounds yet.</li>}
          </ul>
          {edit && (
            <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
              <TextField label="Round name" value={round.name} onChange={(e) => setRound({ ...round, name: e.target.value })} />
              <TextField label="Deadline" type="date" value={round.deadline} onChange={(e) => setRound({ ...round, deadline: e.target.value })} />
              <div className="sm:col-span-2">
                <TextField label="What to submit" value={round.description} onChange={(e) => setRound({ ...round, description: e.target.value })} optional error={err.round} />
              </div>
              <div>
                <Button size="sm" variant="secondary" onClick={addRound}>
                  Add round
                </Button>
              </div>
            </div>
          )}
        </Block>

        <Block title="Evaluation criteria" description={`Weights total ${totalWeight} of 100.`}>
          <ul className="mb-3">
            {h.criteria.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                <span className="text-ui">{c.label}</span>
                <span className="flex items-center gap-2 text-meta tabular-nums text-sub">
                  {c.weight}%
                  {edit && (
                    <button type="button" aria-label={`Remove criterion ${c.label}`} className="rounded-sm p-1 hover:bg-surface hover:text-ink" onClick={() => adminUpdateHackathon(o.id, { criteria: h.criteria.filter((x) => x.id !== c.id) }, "Removed evaluation criterion")}>
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </span>
              </li>
            ))}
            {!h.criteria.length && <li className="text-meta text-sub">No criteria yet.</li>}
          </ul>
          {edit && (
            <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
              <TextField label="Criterion" value={crit.label} onChange={(e) => setCrit({ ...crit, label: e.target.value })} error={err.crit} />
              <TextField label="Weight %" inputMode="numeric" value={crit.weight} onChange={(e) => setCrit({ ...crit, weight: e.target.value })} />
              <div>
                <Button size="sm" variant="secondary" onClick={addCriterion}>
                  Add criterion
                </Button>
              </div>
            </div>
          )}
        </Block>
      </div>

      <Block title="Judges" description="Assign approved experts and mentors. Judges are listed by name only; being a judge is not a credential.">
        <ul className="mb-3 flex flex-wrap gap-2">
          {h.judges.map((j) => (
            <li key={j} className="flex items-center gap-2 rounded-sm border border-line px-2.5 py-1 text-ui">
              <Link href={`/admin/users/${j}`} className="hover:underline">
                {personById(s, j)?.name ?? j}
              </Link>
              {edit && (
                <button type="button" aria-label={`Remove judge ${personById(s, j)?.name ?? j}`} className="text-sub hover:text-ink" onClick={() => adminUpdateHackathon(o.id, { judges: h.judges.filter((x) => x !== j) }, "Removed judge")}>
                  <Trash2 size={13} aria-hidden />
                </button>
              )}
            </li>
          ))}
          {!h.judges.length && <li className="text-meta text-sub">No judges assigned.</li>}
        </ul>
        {edit && (
          <div className="flex flex-wrap items-center gap-2">
            <InlineSelect aria-label="Judge to assign" value={judge} onChange={(e) => setJudge(e.target.value)} options={[{ value: "", label: "Choose an approved expert or mentor" }, ...judgeCandidates.map((p) => ({ value: p.id, label: p.name }))]} />
            <Button size="sm" variant="secondary" className="h-10" disabled={!judge} onClick={() => (adminUpdateHackathon(o.id, { judges: [...h.judges, judge] }, "Assigned judge"), setJudge(""), toast("Judge assigned"))}>
              Assign judge
            </Button>
          </div>
        )}
      </Block>

      <Block title="Scoring" description="Scores from 0 to 10 per criterion, recorded per round and judge. The weighted score uses the criteria weights.">
        {h.rounds.length && h.criteria.length && h.judges.length ? (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <InlineSelect aria-label="Round to score" value={scoreRound} onChange={(e) => setScoreRound(e.target.value)} options={h.rounds.map((r) => ({ value: r.id, label: r.name }))} />
              <InlineSelect aria-label="Judge" value={scoreJudge} onChange={(e) => setScoreJudge(e.target.value)} options={h.judges.map((j) => ({ value: j, label: personById(s, j)?.name ?? j }))} />
            </div>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[36rem] text-left text-ui">
                <caption className="sr-only">Scores for the selected round and judge</caption>
                <thead className="bg-surface text-meta text-sub">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Applicant
                    </th>
                    {h.criteria.map((c) => (
                      <th key={c.id} scope="col" className="px-3 py-2 font-medium">
                        {c.label} <span className="text-mute">({c.weight}%)</span>
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2 font-medium">
                      Weighted (round)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <th scope="row" className="px-3 py-2 font-medium">
                        {regName(r)}
                      </th>
                      {h.criteria.map((c) => {
                        const cur = r.scores.find((x) => x.roundId === scoreRound && x.judgeId === scoreJudge && x.criterionId === c.id)?.score;
                        return (
                          <td key={c.id} className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              aria-label={`${c.label} score for ${regName(r)}`}
                              disabled={!edit}
                              defaultValue={cur ?? ""}
                              key={`${scoreRound}-${scoreJudge}-${cur ?? "x"}`}
                              onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== cur && adminSetScore(r.id, scoreRound, scoreJudge, c.id, Number(e.target.value))}
                              className="h-8 w-16 rounded-sm border border-line-strong px-2 text-meta tabular-nums focus:border-ink focus:outline-none"
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-meta tabular-nums text-sub">{weightedScore(r, o, scoreRound) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-meta text-sub">Add at least one round, one criterion and one judge to start scoring.</p>
        )}
      </Block>

      <div className="grid gap-8 lg:grid-cols-2">
        <Block title="Results and winners" description={o.resultsPublished ? "Results are published. The listing shows as completed." : "Choose winners, then publish results."}>
          <ul className="mb-3">
            {regs
              .slice()
              .sort((a, b) => (weightedScore(b, o) ?? -1) - (weightedScore(a, o) ?? -1))
              .map((r) => {
                const w = h.winners.find((x) => x.registrationId === r.id);
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 border-b border-line py-2 last:border-b-0">
                    <span className="min-w-0 flex-1 text-ui">
                      {regName(r)} <span className="text-meta text-sub">· score {weightedScore(r, o) ?? "—"}</span>
                    </span>
                    <InlineSelect
                      aria-label={`Placement for ${regName(r)}`}
                      className="h-8"
                      disabled={!edit || o.resultsPublished}
                      value={w?.place ?? ""}
                      onChange={(e) => adminUpdateHackathon(o.id, { winners: [...h.winners.filter((x) => x.registrationId !== r.id), ...(e.target.value ? [{ registrationId: r.id, place: e.target.value }] : [])] }, "Updated winners")}
                      options={[{ value: "", label: "No placement" }, { value: "First place", label: "First place" }, { value: "Second place", label: "Second place" }, { value: "Third place", label: "Third place" }, { value: "Special mention", label: "Special mention" }]}
                    />
                  </li>
                );
              })}
            {!regs.length && <li className="text-meta text-sub">No eligible applications.</li>}
          </ul>
          {can("opportunities", "publish") && (
            <Button
              size="sm"
              variant={o.resultsPublished ? "secondary" : "primary"}
              disabled={!o.resultsPublished && !h.winners.length}
              onClick={() =>
                confirm.ask({
                  title: o.resultsPublished ? "Withdraw published results?" : "Publish results?",
                  consequences: [o.resultsPublished ? "The listing returns to its date-based status." : "The listing is marked completed and winners are shown on it. Participants are notified in-app; no email is sent."],
                  confirmLabel: o.resultsPublished ? "Withdraw results" : "Publish results",
                  reason: "optional",
                  onConfirm: (reason) => {
                    adminPatchOpportunity(o.id, { resultsPublished: !o.resultsPublished }, o.resultsPublished ? "Withdrew results" : "Published results", reason);
                    toast(o.resultsPublished ? "Results withdrawn" : "Results published");
                  },
                })
              }
            >
              {o.resultsPublished ? "Withdraw results" : "Publish results"}
            </Button>
          )}
        </Block>

        <Block title="Certificates" description="Certificate records only. No certificate files are generated or emailed.">
          <AdminFileField
            kind="image"
            slot={`opp:${o.id}:certificate`}
            label="Certificate template"
            value={h.certificates.template ? [h.certificates.template] : []}
            onChange={(files: FileMeta[]) => adminUpdateHackathon(o.id, { certificates: { ...h.certificates, template: files[0] } }, files[0] ? "Attached certificate template" : "Removed certificate template")}
          />
          <p className="mt-3 text-meta text-sub">Recorded as issued to {h.certificates.issuedTo.length} applicants.</p>
          {edit && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={!regs.some((r) => r.status === "selected" || h.winners.some((w) => w.registrationId === r.id))}
              onClick={() => {
                const ids = regs.filter((r) => r.status === "selected" || h.winners.some((w) => w.registrationId === r.id)).map((r) => r.id);
                adminUpdateHackathon(o.id, { certificates: { ...h.certificates, issuedTo: Array.from(new Set([...h.certificates.issuedTo, ...ids])) } }, "Recorded certificates as issued");
                toast(`Recorded certificates for ${ids.length} applicants`);
              }}
            >
              Record certificates for winners and selected
            </Button>
          )}
        </Block>
      </div>

      <Block title="Participant communications" description="Messages are recorded here and delivered to participants as in-app notifications. No email or SMS is sent.">
        {edit && (
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_12rem]">
            <TextField label="Subject" value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} maxLength={120} error={err.msg} />
            <SelectField label="Audience" value={msg.audience} onChange={(e) => setMsg({ ...msg, audience: e.target.value as typeof msg.audience })} options={[{ value: "all", label: "All registrants" }, { value: "shortlisted", label: "Shortlisted" }, { value: "selected", label: "Selected" }]} />
            <div className="md:col-span-2">
              <TextArea label="Message" rows={3} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} maxLength={1200} />
            </div>
            <div>
              <Button
                size="sm"
                onClick={() => {
                  if (msg.subject.trim().length < 3 || msg.body.trim().length < 5) return setErr({ msg: "Add a subject and a message." });
                  adminUpdateHackathon(o.id, { communications: [{ id: uid("com"), at: new Date().toISOString(), subject: msg.subject.trim(), body: msg.body.trim(), audience: msg.audience }, ...h.communications] }, "Recorded participant message");
                  setMsg({ subject: "", body: "", audience: "all" });
                  setErr({});
                  toast("Message recorded", { body: "Shown in-app only. Nothing was emailed." });
                }}
              >
                Record message
              </Button>
            </div>
          </div>
        )}
        <Timeline events={h.communications.map((c) => ({ id: c.id, at: c.at, text: `${c.subject} — to ${c.audience === "all" ? "all registrants" : c.audience}. ${c.body}` }))} empty="No messages yet." />
      </Block>
      {confirm.dialog}
    </div>
  );
}

/* ---------------- Detail ---------------- */

type OppTab = "overview" | "applications" | "hackathon" | "activity";

export function OpportunityAdminDetail({ id }: { id: string }) {
  const s = useAppState();
  const can = useCan();
  const pub = usePublication();
  const router = useRouter();
  const o = s.platform.opportunities.find((x) => x.id === id);
  const [tab, setTab] = useTabParam<OppTab>(["overview", "applications", "hackathon", "activity"], "overview");
  if (!o) return <EmptyState title="Opportunity not found" body="It may have been removed." action={<ButtonLink href="/admin/opportunities">All opportunities</ButtonLink>} />;
  const life = opportunityLifecycle(o);
  const publication = o.publication ?? "published";
  const apps = s.platform.registrations.filter((r) => r.opportunityId === o.id);
  const label = `“${o.title}”`;
  const audit = s.admin.audit.filter((e) => e.targetId === o.id);
  const competitive = ["hackathon", "competition", "challenge"].includes(o.kind) || !!o.hackathon;

  return (
    <>
      <AdminHeader
        title={o.title}
        flags={
          <>
            <AdminStatus value={life} />
            {o.featured && <Flag tone="accent">Featured</Flag>}
            {o.demo && <Flag>Sample</Flag>}
          </>
        }
        meta={
          <>
            <span>{OPPORTUNITY_KIND_LABEL[o.kind]}</span>
            <span>{o.organisation}</span>
            <span>{SOURCE_LABEL(o)}</span>
            <span>Deadline {formatDate(o.deadline)}</span>
          </>
        }
        actions={
          <>
            {publication === "published" && (
              <ButtonLink href={`/opportunities/${o.id}`} variant="ghost" size="sm">
                Public page
              </ButtonLink>
            )}
            <PermButton module="opportunities" perm="edit" variant="secondary" size="sm" onClick={() => router.push(`/admin/opportunities/${o.id}/edit`)}>
              <Pencil size={14} aria-hidden /> Edit
            </PermButton>
            <PermButton module="opportunities" perm="publish" variant="secondary" size="sm" onClick={() => (adminPatchOpportunity(o.id, { featured: !o.featured }, o.featured ? "Removed from featured" : "Featured opportunity"), toast(o.featured ? "Removed from featured" : "Featured"))}>
              {o.featured ? "Unfeature" : "Feature"}
            </PermButton>
            {can("opportunities", "publish") && (publication === "draft" || publication === "unpublished") && (
              <Button size="sm" variant="accent" onClick={() => pub.ask([o.id], label, "published")}>
                Publish
              </Button>
            )}
            {can("opportunities", "publish") && publication === "published" && (
              <Button size="sm" variant="secondary" onClick={() => pub.ask([o.id], label, "unpublished")}>
                Unpublish
              </Button>
            )}
            {can("opportunities", "archive") && publication !== "archived" && (
              <Button size="sm" variant="ghost" onClick={() => pub.ask([o.id], label, "archived")}>
                Archive
              </Button>
            )}
            {can("opportunities", "archive") && publication === "archived" && (
              <Button size="sm" variant="secondary" onClick={() => pub.ask([o.id], label, "draft")}>
                Restore
              </Button>
            )}
          </>
        }
      />

      <RecordTabs
        label="Opportunity record"
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "applications", label: "Applications", count: apps.length },
          ...(competitive ? [{ value: "hackathon" as const, label: "Rounds and judging" }] : []),
          { value: "activity", label: "Activity" },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-8">
            <Block title="Listing">
              <Details
                items={[
                  { label: "Description", value: o.description, wide: true },
                  { label: "Eligibility", value: o.eligibility, wide: true },
                  { label: "Education requirements", value: o.education },
                  { label: "Industries", value: o.industries.map(industryLabel).join(", ") },
                  { label: "Stages", value: o.stage.map(stageLabel).join(", ") },
                  { label: "Prizes or benefits", value: o.prizes, wide: true },
                  { label: "How to apply", value: o.instructions, wide: true },
                ]}
              />
            </Block>
            <Block title="Media and documents">
              <Details
                items={[
                  { label: "Banner", value: o.banner?.name },
                  { label: "Supporting documents", value: o.documents?.map((d) => d.name).join(", ") },
                ]}
              />
              <p className="mt-2 text-micro text-mute">File names are stored with the record; the files themselves stay in the browser tab where they were attached.</p>
            </Block>
          </div>
          <div className="flex min-w-0 flex-col gap-8">
            <Block title="Dates and format">
              <Details
                items={[
                  { label: "Registration opens", value: o.registrationOpens ? formatDate(o.registrationOpens) : undefined },
                  { label: "Registration deadline", value: formatDate(o.deadline) },
                  { label: "Event", value: o.eventStart ? `${formatDate(o.eventStart)}${o.eventEnd ? ` – ${formatDate(o.eventEnd)}` : ""}` : undefined },
                  { label: "Format", value: o.format ? o.format[0].toUpperCase() + o.format.slice(1) : undefined },
                  { label: "Location", value: o.location },
                  { label: "Team size", value: o.teamMin || o.teamMax ? `${o.teamMin ?? 1}–${o.teamMax ?? "any"}` : undefined },
                  { label: "Registration", value: o.registrationMode === "on_platform" ? "On TRUEVIX" : o.registrationMode === "external" ? "On the organiser’s site" : "None" },
                  { label: "Contact", value: o.contact },
                ]}
              />
            </Block>
            <Block title="Source">
              <Details
                items={[
                  { label: "Source", value: SOURCE_LABEL(o) },
                  ...(o.source === "external"
                    ? [
                        { label: "Original organiser", value: o.organisation },
                        { label: "Source URL", value: o.sourceUrl ? <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">{o.sourceUrl}</a> : "None recorded (sample listing)" },
                        { label: "Source check", value: <AdminStatus value={o.sourceVerification === "verified" ? "verified" : o.sourceVerification === "needs_recheck" ? "pending" : "draft"} label={o.sourceVerification === "verified" ? "Checked against the source" : o.sourceVerification === "needs_recheck" ? "Needs re-checking" : "Not checked"} /> },
                        { label: "Last checked", value: o.lastCheckedAt ? formatDate(o.lastCheckedAt) : "Never" },
                      ]
                    : []),
                  { label: "Partnership", value: "None implied. Listing does not mean TRUEVIX or Weblaze Technologies partners with the organiser." },
                ]}
              />
              {o.source === "external" && can("opportunities", "edit") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => (adminPatchOpportunity(o.id, { sourceVerification: "verified", lastCheckedAt: new Date().toISOString().slice(0, 10) }, "Checked listing against its source"), toast("Marked as checked today"))}>
                    Mark checked today
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => (adminPatchOpportunity(o.id, { sourceVerification: "needs_recheck" }, "Flagged listing for re-check"), toast("Flagged for re-check"))}>
                    Flag for re-check
                  </Button>
                </div>
              )}
            </Block>
          </div>
        </div>
      )}

      {tab === "applications" && <ApplicationsTable o={o} />}
      {tab === "hackathon" && competitive && <HackathonPanel o={o} />}
      {tab === "activity" && (
        <Block title="History">
          <Timeline
            events={[
              ...(o.history ?? []),
              ...audit.filter((e) => !(o.history ?? []).some((h) => Math.abs(new Date(h.at).getTime() - new Date(e.createdAt).getTime()) < 1000)).map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `${e.action}${e.reason ? ` — ${e.reason}` : ""}` })),
              ...(o.createdAt ? [{ id: "created", at: o.createdAt, text: "Created" }] : []),
            ].sort((a, b) => b.at.localeCompare(a.at))}
          />
          {o.updatedAt && <p className="mt-3 text-micro text-mute">Last updated {timeAgo(o.updatedAt)}</p>}
        </Block>
      )}
      {pub.dialog}
    </>
  );
}
