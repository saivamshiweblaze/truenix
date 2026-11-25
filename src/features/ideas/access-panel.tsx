"use client";

import { useRef, useState } from "react";
import { FileText, Lock, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextArea } from "@/components/ui/field";
import { EmptyState, SectionHeading, Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { VISIBILITY } from "@/config/taxonomy";
import { openFile, uploadFile } from "@/lib/data/files";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { requestExpertReview, respondToReview, revokeDisclosure, shareIdea } from "@/lib/store/actions";
import { allPeople, personById } from "@/lib/store/selectors";
import { useAppState } from "@/lib/store/store";
import type { Idea } from "@/lib/types";
import { formatBytes } from "@/lib/validation";
import { formatDate } from "@/lib/utils";

type Disclosure = { id: string; grantee_user_id: string | null; grantee_institution_id: string | null; access_level: string; scope: string; granted_at: string; revoked_at: string | null; note: string | null };
type Doc = { id: string; title: string; confidentiality: string; created_at: string; file_id: string; files: { original_name: string; size_bytes: number } | null };

const LEVEL: Record<string, string> = { viewer: "Can view", collaborator: "Collaborator", reviewer: "Reviewer" };
const SCOPE: Record<string, string> = { summary: "Idea record only", full: "Idea, research and validation", documents: "Everything, including shared documents" };

/**
 * Controlled disclosure for the idea's owner: who has access now, granting and revoking it, inviting expert
 * reviewers, and confidential documents. Every list is read live under the owner's session (RLS), and revocation
 * takes effect on the other person's next request.
 */
export function AccessPanel({ idea }: { idea: Idea }) {
  const s = useAppState();

  const [share, setShare] = useState({ person: "", level: "collaborator", scope: "full" });
  const [review, setReview] = useState({ person: "", note: "" });
  const [docConf, setDocConf] = useState<"team" | "shared">("team");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useLiveQuery(async () => {
    const sb = supabaseBrowser();
    const [d, docs] = await Promise.all([
      sb.from("venture_disclosures").select("id, grantee_user_id, grantee_institution_id, access_level, scope, granted_at, revoked_at, note").eq("venture_id", idea.id).order("granted_at", { ascending: false }),
      sb.from("venture_documents").select("id, title, confidentiality, created_at, file_id, files(original_name, size_bytes)").eq("venture_id", idea.id).order("created_at", { ascending: false }),
    ]);
    const error = d.error ?? docs.error;
    return { data: error ? null : { disclosures: d.data as Disclosure[], docs: docs.data as unknown as Doc[] }, error };
  }, [idea.id]);
  const state = { status: q.status, error: q.error, disclosures: q.data?.disclosures ?? [], docs: q.data?.docs ?? [] };
  const load = q.reload;

  const people = allPeople(s).filter((p) => !idea.team.some((t) => t.personId === p.id));
  const reviewers = (s.platform.talent ?? []).filter((t) => t.status === "approved" && t.personId !== "me");
  const reviews = (s.platform.expertReviews ?? []).filter((r) => r.ideaId === idea.id);
  const active = state.disclosures.filter((d) => !d.revoked_at);
  const name = (id: string | null) => (id ? (personById(s, id)?.name ?? "Member") : "Institution");
  const isPrivate = idea.visibility === "private";

  return (
    <div className="flex flex-col gap-10">
      <section>
        <SectionHeading title="Who can see this idea" />
        <p className="text-ui text-sub">
          Visibility: <span className="font-medium text-ink">{VISIBILITY.find((v) => v.id === idea.visibility)?.label}</span>. {VISIBILITY.find((v) => v.id === idea.visibility)?.explanation}
        </p>
        {isPrivate && active.length > 0 && (
          <p role="status" className="mt-3 rounded-sm bg-surface px-3 py-2 text-meta text-charcoal">
            <Lock size={13} className="mr-1 inline" aria-hidden /> Shared access is paused while the idea is private. Change visibility to “Selected collaborators” or “Selected reviewers” to let these people in again.
          </p>
        )}
        {state.status === "loading" ? (
          <div className="mt-4 flex flex-col gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : state.status === "error" ? (
          <p role="alert" className="mt-4 text-meta text-danger">
            Couldn’t load access: {state.error}{" "}
            <button type="button" className="underline" onClick={() => void load()}>
              Try again
            </button>
          </p>
        ) : active.length ? (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {active.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-ui font-medium text-ink">{d.grantee_user_id ? name(d.grantee_user_id) : "Institution members"}</p>
                  <p className="text-meta text-sub">
                    {LEVEL[d.access_level]} · {SCOPE[d.scope]} · since {formatDate(d.granted_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (await revokeDisclosure(d.id)) {
                      toast("Access revoked", { body: "It ends on their next request." });
                      void load();
                    }
                  }}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-meta text-sub">Only you and your team can see the full idea.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Share with a person" />
        {people.length ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField label="Person" value={share.person} onChange={(e) => setShare({ ...share, person: e.target.value })} options={[{ value: "", label: "Choose a member" }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
              <SelectField label="Access" value={share.level} onChange={(e) => setShare({ ...share, level: e.target.value })} options={[{ value: "collaborator", label: "Collaborator" }, { value: "viewer", label: "Can view" }]} />
              <SelectField label="What they see" value={share.scope} onChange={(e) => setShare({ ...share, scope: e.target.value })} options={Object.entries(SCOPE).map(([value, label]) => ({ value, label }))} />
            </div>
            <div>
              <Button
                variant="secondary"
                disabled={!share.person}
                onClick={async () => {
                  if (await shareIdea(idea.id, share.person, share.level as "viewer" | "collaborator", share.scope as "summary" | "full" | "documents")) {
                    toast("Access granted", { body: isPrivate ? "It takes effect when the idea is no longer private." : undefined });
                    setShare({ person: "", level: "collaborator", scope: "full" });
                    void load();
                  }
                }}
              >
                Share
              </Button>
            </div>
          </>
        ) : (
          <p className="text-meta text-sub">No other members are visible to you yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Expert reviews" count={reviews.length} />
        <p className="text-meta text-sub">An invited reviewer can read the idea, research and validation once they accept. Their access ends automatically when they complete or decline the review.</p>
        {reviews.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-ui font-medium text-ink">
                    {name(r.reviewerId)} <span className="font-normal text-sub">· {r.status}</span>
                  </p>
                  {r.feedback && <p className="mt-1 whitespace-pre-line text-ui text-charcoal">{r.feedback}</p>}
                </div>
                {(r.status === "requested" || r.status === "accepted") && (
                  <Button size="sm" variant="ghost" onClick={() => void respondToReview(r.id, "cancelled").then((ok) => ok && toast("Review request cancelled"))}>
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {reviewers.length ? (
          <>
            <SelectField label="Reviewer" value={review.person} onChange={(e) => setReview({ ...review, person: e.target.value })} options={[{ value: "", label: "Choose an approved expert or mentor" }, ...reviewers.map((t) => ({ value: t.personId, label: `${name(t.personId)} · ${t.kind}` }))]} />
            <TextArea label="What would you like reviewed?" value={review.note} onChange={(e) => setReview({ ...review, note: e.target.value })} rows={3} maxLength={1000} />
            <div>
              <Button
                variant="secondary"
                disabled={!review.person || isPrivate}
                onClick={async () => {
                  if (await requestExpertReview(idea.id, review.person, review.note)) {
                    toast("Review requested", { body: "They’ll see it in their reviews." });
                    setReview({ person: "", note: "" });
                  }
                }}
              >
                Request review
              </Button>
              {isPrivate && <p className="mt-2 text-meta text-sub">Set visibility to “Selected reviewers” first, so a reviewer who accepts can open the idea.</p>}
            </div>
          </>
        ) : (
          <p className="text-meta text-sub">No approved experts or mentors are available yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Confidential documents" count={state.docs.length} />
        <p className="text-meta text-sub">
          <ShieldCheck size={13} className="mr-1 inline" aria-hidden /> Stored privately and opened through short-lived links. “Team only” documents are never shared; “Shared” documents are visible to people you gave full access including documents. Never published.
        </p>
        {state.docs.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {state.docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <button type="button" className="flex min-w-0 items-center gap-2 text-left text-ui text-ink hover:underline" onClick={() => void openFile(d.file_id).then((r) => !r.ok && toast("Couldn’t open file", { body: r.error }))}>
                  <FileText size={15} aria-hidden /> <span className="truncate">{d.title}</span>
                </button>
                <span className="text-meta text-sub">
                  {d.confidentiality === "team" ? "Team only" : "Shared"} · {d.files ? formatBytes(d.files.size_bytes) : ""} · {formatDate(d.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          state.status === "ready" && <EmptyState compact title="No documents yet" body="Upload pitch decks, interview notes or prototypes. PDF, Office, images or text up to 20 MB." />
        )}
        <div className="flex flex-wrap items-end gap-3">
          <SelectField label="Who can open it" value={docConf} onChange={(e) => setDocConf(e.target.value as "team" | "shared")} options={[{ value: "team", label: "Team only" }, { value: "shared", label: "Shared with full-access people" }]} />
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            aria-label="Choose a document"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.pptx,.xlsx"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              const res = await uploadFile(file, "venture_document", { targetId: idea.id, title: file.name, confidentiality: docConf });
              setUploading(false);
              if (!res.ok) return toast("Upload failed", { body: res.error });
              toast("Document uploaded");
              void load();
            }}
          />
          <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Upload size={15} aria-hidden /> {uploading ? "Uploading…" : "Upload document"}
          </Button>
        </div>
      </section>
    </div>
  );
}
