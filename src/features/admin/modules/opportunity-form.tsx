"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChipGroup, SelectField, Switch, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { EmptyState, TagList } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { INDUSTRIES, industryLabel, OPPORTUNITY_KIND_LABEL, stageLabel, STAGES } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminSaveOpportunity, adminSetOpportunityPublication } from "@/lib/store/admin-actions";
import type { FileMeta, IdeaStage, IndustryId, Opportunity, OpportunityKind } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { AdminHeader, Block, FormActions } from "../kit/layout";
import { AdminFileField } from "../kit/upload";
import { useCan } from "../kit/can";

interface FormState {
  title: string;
  organisation: string;
  organiserId: string;
  kind: OpportunityKind;
  description: string;
  industries: string[];
  stage: string[];
  eligibility: string;
  education: string;
  location: string;
  format: "online" | "offline" | "hybrid";
  registrationOpens: string;
  deadline: string;
  eventStart: string;
  eventEnd: string;
  teamMin: string;
  teamMax: string;
  prizes: string;
  instructions: string;
  registrationMode: "on_platform" | "external" | "none";
  officialUrl: string;
  contact: string;
  source: "weblaze" | "external";
  sourceUrl: string;
  sourceVerification: "unverified" | "verified" | "needs_recheck";
  featured: boolean;
  banner: FileMeta[];
  documents: FileMeta[];
}

const fromOpportunity = (o: Opportunity): FormState => ({
  title: o.title,
  organisation: o.organisation,
  organiserId: o.organiserId ?? "",
  kind: o.kind,
  description: o.description,
  industries: o.industries,
  stage: o.stage,
  eligibility: o.eligibility,
  education: o.education ?? "",
  location: o.location,
  format: o.format ?? "online",
  registrationOpens: o.registrationOpens ?? "",
  deadline: o.deadline,
  eventStart: o.eventStart ?? "",
  eventEnd: o.eventEnd ?? "",
  teamMin: o.teamMin ? String(o.teamMin) : "",
  teamMax: o.teamMax ? String(o.teamMax) : "",
  prizes: o.prizes ?? "",
  instructions: o.instructions ?? "",
  registrationMode: o.registrationMode ?? "external",
  officialUrl: o.officialUrl ?? "",
  contact: o.contact ?? "",
  source: o.source ?? "external",
  sourceUrl: o.sourceUrl ?? "",
  sourceVerification: o.sourceVerification ?? "unverified",
  featured: !!o.featured,
  banner: o.banner ? [o.banner] : [],
  documents: o.documents ?? [],
});

const blank = (kind: OpportunityKind): FormState => ({
  title: "",
  organisation: "Weblaze Technologies",
  organiserId: "",
  kind,
  description: "",
  industries: [],
  stage: ["concept"],
  eligibility: "",
  education: "",
  location: "Online",
  format: "online",
  registrationOpens: "",
  deadline: "",
  eventStart: "",
  eventEnd: "",
  teamMin: kind === "hackathon" ? "1" : "",
  teamMax: kind === "hackathon" ? "4" : "",
  prizes: "",
  instructions: "",
  registrationMode: "on_platform",
  officialUrl: "",
  contact: "",
  source: "weblaze",
  sourceUrl: "",
  sourceVerification: "unverified",
  featured: false,
  banner: [],
  documents: [],
});

const https = (v: string) => /^https:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(v.trim());

function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.title.trim().length < 5) e.title = "Give the opportunity a title of at least 5 characters.";
  if (f.organisation.trim().length < 2) e.organisation = "Name the organiser.";
  if (f.description.trim().length < 30) e.description = "Describe the opportunity in at least 30 characters.";
  if (!f.industries.length) e.industries = "Choose at least one industry.";
  if (!f.stage.length) e.stage = "Choose at least one stage.";
  if (f.eligibility.trim().length < 5) e.eligibility = "Say who can apply.";
  if (!f.deadline) e.deadline = "Set a registration deadline.";
  if (f.registrationOpens && f.deadline && f.registrationOpens > f.deadline) e.registrationOpens = "Registration must open before the deadline.";
  if (f.eventStart && f.eventEnd && f.eventEnd < f.eventStart) e.eventEnd = "The event must end after it starts.";
  if (f.eventStart && f.deadline && f.eventStart < f.deadline && f.kind === "hackathon") e.eventStart = "For hackathons the event usually starts after registration closes. Check the dates.";
  const min = Number(f.teamMin || 0);
  const max = Number(f.teamMax || 0);
  if (f.teamMin && (!Number.isInteger(min) || min < 1)) e.teamMin = "Use a whole number of 1 or more.";
  if (f.teamMax && (!Number.isInteger(max) || max < 1 || max > 20)) e.teamMax = "Use a whole number from 1 to 20.";
  if (f.teamMin && f.teamMax && min > max) e.teamMax = "The maximum must be at least the minimum.";
  if (f.registrationMode === "external" && !https(f.officialUrl) && f.officialUrl.trim()) e.officialUrl = "Enter a full https:// address.";
  if (f.source === "external" && f.sourceUrl.trim() && !https(f.sourceUrl)) e.sourceUrl = "Enter a full https:// address.";
  if (f.contact.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact.trim()) && !https(f.contact)) e.contact = "Enter an email address or an https:// link.";
  return e;
}

function toOpportunity(f: FormState, base?: Opportunity): Opportunity {
  return {
    ...(base ?? { id: "", demo: false }),
    kind: f.kind,
    title: f.title.trim(),
    organisation: f.organisation.trim(),
    organiserId: f.organiserId || undefined,
    description: f.description.trim(),
    eligibility: f.eligibility.trim(),
    education: f.education.trim() || undefined,
    industries: f.industries as IndustryId[],
    stage: f.stage as IdeaStage[],
    location: f.location.trim() || (f.format === "online" ? "Online" : ""),
    format: f.format,
    deadline: f.deadline,
    registrationOpens: f.registrationOpens || undefined,
    eventStart: f.eventStart || undefined,
    eventEnd: f.eventEnd || undefined,
    teamMin: f.teamMin ? Number(f.teamMin) : undefined,
    teamMax: f.teamMax ? Number(f.teamMax) : undefined,
    prizes: f.prizes.trim() || undefined,
    instructions: f.instructions.trim() || undefined,
    registrationMode: f.registrationMode,
    officialUrl: f.registrationMode === "external" && f.officialUrl.trim() ? f.officialUrl.trim() : null,
    contact: f.contact.trim() || undefined,
    source: f.source,
    sourceUrl: f.source === "external" ? f.sourceUrl.trim() || null : undefined,
    sourceVerification: f.source === "external" ? f.sourceVerification : undefined,
    lastCheckedAt: f.source === "external" && f.sourceVerification === "verified" ? (base?.lastCheckedAt ?? new Date().toISOString().slice(0, 10)) : base?.lastCheckedAt,
    featured: f.featured,
    banner: f.banner[0],
    documents: f.documents,
    hackathon: base?.hackathon ?? (f.kind === "hackathon" ? { rounds: [], criteria: [], judges: [], winners: [], certificates: { issuedTo: [] }, communications: [] } : undefined),
    publication: base?.publication ?? "draft",
  };
}

/** Public-style preview of the listing, as members will see it. */
function Preview({ f, onClose }: { f: FormState; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} size="lg" title="Preview" description="How the listing will look to members once published.">
      <article className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-meta">
          <span className="font-medium">{OPPORTUNITY_KIND_LABEL[f.kind]}</span>
          {f.deadline && <span className="text-sub">Deadline {formatDate(f.deadline)}</span>}
        </div>
        <h2 className="text-title font-bold">{f.title || "Untitled opportunity"}</h2>
        <p className="text-body text-sub">{f.organisation}</p>
        <p className="whitespace-pre-line text-body text-charcoal">{f.description}</p>
        <div>
          <p className="text-meta font-medium">Eligibility</p>
          <p className="text-ui text-charcoal">{f.eligibility}</p>
        </div>
        {f.prizes && (
          <div>
            <p className="text-meta font-medium">Prizes or benefits</p>
            <p className="text-ui text-charcoal">{f.prizes}</p>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-ui">
          <div>
            <dt className="text-meta text-sub">Format</dt>
            <dd>
              {f.format[0].toUpperCase() + f.format.slice(1)} · {f.location}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-sub">Team size</dt>
            <dd>{f.teamMin || f.teamMax ? `${f.teamMin || 1}–${f.teamMax || "any"}` : "Not set"}</dd>
          </div>
          <div>
            <dt className="text-meta text-sub">Industries</dt>
            <dd>
              <TagList items={f.industries.map((i) => industryLabel(i as IndustryId))} />
            </dd>
          </div>
          <div>
            <dt className="text-meta text-sub">Stages</dt>
            <dd>{f.stage.map((x) => stageLabel(x as IdeaStage)).join(", ")}</dd>
          </div>
        </dl>
        <p className="text-micro text-mute">{f.source === "external" ? "Listed from the organiser’s own channel. No partnership is implied." : "Run on TRUEVIX by Weblaze Technologies."}</p>
      </article>
    </Dialog>
  );
}

export function OpportunityForm({ id }: { id?: string }) {
  const s = useAppState();
  const can = useCan();
  const router = useRouter();
  const params = useSearchParams();
  const existing = id ? s.platform.opportunities.find((o) => o.id === id) : undefined;
  const initialKind = (params.get("kind") as OpportunityKind) in OPPORTUNITY_KIND_LABEL ? (params.get("kind") as OpportunityKind) : "challenge";
  const [f, setF] = useState<FormState>(() => (existing ? fromOpportunity(existing) : blank(initialKind)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [slotId] = useState(() => id ?? `new-${Date.now()}`);
  if (id && !existing) return <EmptyState title="Opportunity not found" body="It may have been removed." action={<ButtonLink href="/admin/opportunities">All opportunities</ButtonLink>} />;
  if (!can("opportunities", existing ? "edit" : "create")) return <EmptyState title="Your role can’t do this" body="Ask a super administrator for opportunity permissions." />;
  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setF((x) => ({ ...x, [k]: v }));
  const text = (k: keyof FormState) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const orgs = s.platform.institutions.filter((i) => i.status === "verified");

  const save = (publish: boolean) => {
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) {
      toast("Check the highlighted fields", { body: `${Object.keys(e).length} field${Object.keys(e).length === 1 ? "" : "s"} need attention.` });
      return;
    }
    const newId = adminSaveOpportunity(toOpportunity(f, existing), !existing);
    if (publish) adminSetOpportunityPublication([newId], "published");
    toast(publish ? "Opportunity published" : existing ? "Changes saved" : "Draft saved", { body: publish ? "It now appears in Opportunities." : undefined });
    router.push(`/admin/opportunities/${newId}`);
  };
  const isPublished = (existing?.publication ?? (existing ? "published" : "draft")) === "published";

  return (
    <>
      <AdminHeader
        title={existing ? `Edit ${existing.title}` : f.kind === "hackathon" ? "New hackathon" : "New opportunity"}
        description="Drafts are visible to administrators only. Publishing makes the listing visible in Opportunities."
      />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="flex max-w-4xl flex-col gap-10"
      >
        <Block title="Basics">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <TextField label="Opportunity title" value={f.title} onChange={text("title")} error={errors.title} maxLength={160} />
            </div>
            <SelectField label="Type" value={f.kind} onChange={(e) => set("kind")(e.target.value as OpportunityKind)} options={Object.entries(OPPORTUNITY_KIND_LABEL).map(([value, label]) => ({ value, label }))} />
            <SelectField
              label="Organiser on TRUEVIX"
              value={f.organiserId}
              onChange={(e) => {
                const org = orgs.find((o) => o.id === e.target.value);
                setF((x) => ({ ...x, organiserId: e.target.value, organisation: org ? org.name : x.organisation }));
              }}
              options={[{ value: "", label: "None — type the organiser’s name" }, ...orgs.map((o) => ({ value: o.id, label: o.name }))]}
              hint="Verified organisations only."
            />
            <div className="md:col-span-2">
              <TextField label="Organiser name" value={f.organisation} onChange={text("organisation")} error={errors.organisation} maxLength={160} />
            </div>
            <div className="md:col-span-2">
              <TextArea label="Description" rows={5} value={f.description} onChange={text("description")} error={errors.description} maxLength={4000} />
            </div>
          </div>
          <div className="mt-4">
            <ChipGroup legend="Industries" options={INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))} value={f.industries} onChange={set("industries")} error={errors.industries} />
          </div>
        </Block>

        <Block title="Eligibility">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <TextArea label="Who can apply" rows={2} value={f.eligibility} onChange={text("eligibility")} error={errors.eligibility} maxLength={600} />
            </div>
            <div className="md:col-span-2">
              <TextField label="Education requirements" value={f.education} onChange={text("education")} optional maxLength={200} />
            </div>
          </div>
          <div className="mt-4">
            <ChipGroup legend="Project stages" options={STAGES.map((x) => ({ value: x.id, label: x.label }))} value={f.stage} onChange={set("stage")} error={errors.stage} />
          </div>
        </Block>

        <Block title="Dates, format and teams">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Registration opens" type="date" value={f.registrationOpens} onChange={text("registrationOpens")} error={errors.registrationOpens} optional />
            <TextField label="Registration deadline" type="date" value={f.deadline} onChange={text("deadline")} error={errors.deadline} />
            <TextField label="Event starts" type="date" value={f.eventStart} onChange={text("eventStart")} error={errors.eventStart} optional />
            <TextField label="Event ends" type="date" value={f.eventEnd} onChange={text("eventEnd")} error={errors.eventEnd} optional />
            <SelectField label="Format" value={f.format} onChange={(e) => set("format")(e.target.value as FormState["format"])} options={[{ value: "online", label: "Online" }, { value: "offline", label: "In person" }, { value: "hybrid", label: "Hybrid" }]} />
            <TextField label="Location" value={f.location} onChange={text("location")} maxLength={120} />
            <TextField label="Minimum team size" inputMode="numeric" value={f.teamMin} onChange={text("teamMin")} error={errors.teamMin} optional />
            <TextField label="Maximum team size" inputMode="numeric" value={f.teamMax} onChange={text("teamMax")} error={errors.teamMax} optional />
            <div className="md:col-span-2">
              <TextArea label="Prizes or benefits" rows={2} value={f.prizes} onChange={text("prizes")} optional maxLength={600} hint="State only what the organiser has committed to." />
            </div>
          </div>
        </Block>

        <Block title="Applications">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Where members register"
              value={f.registrationMode}
              onChange={(e) => set("registrationMode")(e.target.value as FormState["registrationMode"])}
              options={[
                { value: "on_platform", label: "On TRUEVIX" },
                { value: "external", label: "On the organiser’s site" },
                { value: "none", label: "No registration" },
              ]}
            />
            {f.registrationMode === "external" && <TextField label="External registration URL" value={f.officialUrl} onChange={text("officialUrl")} error={errors.officialUrl} optional placeholder="https://" />}
            <div className="md:col-span-2">
              <TextArea label="Application instructions" rows={3} value={f.instructions} onChange={text("instructions")} optional maxLength={1200} />
            </div>
            <TextField label="Contact (email or link)" value={f.contact} onChange={text("contact")} error={errors.contact} optional />
          </div>
        </Block>

        <Block title="Source" description="External listings must name the original organiser and say whether they were checked. No partnership is implied either way.">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Source" value={f.source} onChange={(e) => set("source")(e.target.value as FormState["source"])} options={[{ value: "weblaze", label: "Run on TRUEVIX by Weblaze" }, { value: "external", label: "External organiser" }]} />
            {f.source === "external" && (
              <>
                <TextField label="Source URL" value={f.sourceUrl} onChange={text("sourceUrl")} error={errors.sourceUrl} optional placeholder="https://" />
                <SelectField
                  label="Source check"
                  value={f.sourceVerification}
                  onChange={(e) => set("sourceVerification")(e.target.value as FormState["sourceVerification"])}
                  options={[
                    { value: "unverified", label: "Not checked" },
                    { value: "verified", label: "Checked against the source" },
                    { value: "needs_recheck", label: "Needs re-checking" },
                  ]}
                />
              </>
            )}
          </div>
        </Block>

        <Block title="Media">
          <div className="grid gap-6 md:grid-cols-2">
            <AdminFileField kind="image" slot={`opp:${slotId}:banner`} label="Cover image or banner" value={f.banner} onChange={set("banner")} />
            <AdminFileField kind="document" slot={`opp:${slotId}:docs`} label="Supporting documents" value={f.documents} onChange={set("documents")} multiple hint="Briefs, rules or terms as PDF. Held in this tab only until storage is connected." />
          </div>
        </Block>

        <Block title="Visibility">
          <Switch label="Featured" description="Shown first in Opportunities and on the admin overview." checked={f.featured} onChange={set("featured")} />
        </Block>

        <FormActions note={existing ? (isPublished ? "Saving updates the live listing." : "This opportunity is not published.") : "New opportunities start as drafts."}>
          <Button variant="ghost" onClick={() => router.push(existing ? `/admin/opportunities/${existing.id}` : "/admin/opportunities")}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => setPreview(true)}>
            Preview
          </Button>
          <Button variant={isPublished ? "accent" : "secondary"} type="submit">
            {existing ? "Save changes" : "Save draft"}
          </Button>
          {!isPublished && can("opportunities", "publish") && (
            <Button variant="accent" onClick={() => save(true)}>
              Save and publish
            </Button>
          )}
        </FormActions>
      </form>
      {preview && <Preview f={f} onClose={() => setPreview(false)} />}
    </>
  );
}
