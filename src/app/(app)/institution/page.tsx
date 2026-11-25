"use client";

import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HBarChart } from "@/components/ui/charts";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { EmptyState, PageHeader, SectionHeading, Skeleton, Stat, StatusDot } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { RoleGate } from "@/components/shell/role-gate";
import { industryLabel, stageLabel, STAGES } from "@/config/taxonomy";
import { write } from "@/lib/data/remote";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { personById } from "@/lib/store/selectors";
import { useAppState } from "@/lib/store/store";
import { formatDate } from "@/lib/utils";

type Request = { id: string; request_type: string; proposed_name: string | null; status: string; created_at: string; review_note: string | null; institution_id: string | null };

/** Representatives: their institution request and its status. Administrator access is granted by the platform team. */
function RepresentativeView() {
  const s = useAppState();
  const q = useLiveQuery(
    () => supabaseBrowser().from("institution_requests").select("id, request_type, proposed_name, status, created_at, review_note, institution_id").order("created_at", { ascending: false }),
    [],
  );
  const requests = (q.data as Request[] | null) ?? (q.status === "loading" ? null : []);
  const error = q.error;
  const load = q.reload;
  const [form, setForm] = useState({ name: typeof s.user?.profile?.institutionName === "string" ? s.user.profile.institutionName : "", kind: "university", position: "", note: "" });

  const pending = requests?.find((r) => r.status === "pending");
  const membership = s.session?.institutions.find((m) => m.status === "active");

  return (
    <>
      <PageHeader title="Institution" description="Register your university, incubator or organisation. The platform team verifies institutions before granting administrator access." />
      {error && (
        <p role="alert" className="mb-6 text-meta text-danger">
          Couldn’t load your requests: {error}
        </p>
      )}
      {requests === null && !error ? (
        <Skeleton className="h-24 max-w-2xl" />
      ) : (
        <div className="flex max-w-2xl flex-col gap-10">
          {membership && <p className="text-ui text-charcoal">You are an approved representative of your institution. Administrator access is granted separately by the platform team.</p>}
          {requests && requests.length > 0 && (
            <section>
              <SectionHeading title="Your requests" />
              <ul className="divide-y divide-line border-y border-line">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
                    <div>
                      <p className="text-ui font-medium text-ink">{r.proposed_name ?? "Institution"}</p>
                      <p className="text-meta text-sub">
                        {r.request_type === "administrator_access" ? "Administrator access" : r.request_type === "representative_access" ? "Representative access" : "Register institution"} · {formatDate(r.created_at)}
                        {r.review_note ? ` · ${r.review_note}` : ""}
                      </p>
                    </div>
                    <StatusDot tone={r.status === "approved" ? "positive" : r.status === "pending" ? "attention" : "mute"} label={r.status[0].toUpperCase() + r.status.slice(1)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!pending && (
            <section className="flex flex-col gap-4">
              <SectionHeading title={membership ? "Request administrator access" : "Register your institution"} />
              {!membership && <TextField label="Institution name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={160} />}
              {!membership && (
                <SelectField
                  label="Type"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  options={[
                    { value: "university", label: "University" },
                    { value: "college", label: "College" },
                    { value: "incubator", label: "Incubator" },
                    { value: "accelerator", label: "Accelerator" },
                    { value: "company", label: "Company" },
                    { value: "industry_partner", label: "Industry organisation" },
                    { value: "research_org", label: "Research organisation" },
                  ]}
                />
              )}
              <TextField label="Your position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} maxLength={120} />
              <TextArea label="Anything the platform team should know" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={2000} hint="For example, an official email domain or a contact who can confirm your role." />
              <div>
                <Button
                  disabled={!membership && form.name.trim().length < 2}
                  onClick={async () => {
                    const ok = await write("institution request", (sb, uid) =>
                      sb
                        .from("institution_requests")
                        .insert({
                          request_type: membership ? "administrator_access" : "register_institution",
                          institution_id: membership?.institutionId ?? null,
                          proposed_name: membership ? null : form.name.trim(),
                          proposed_kind: membership ? null : form.kind,
                          requested_by: uid,
                          position_title: form.position.trim() || null,
                          note: form.note.trim(),
                        })
                        .then((r) => r),
                    );
                    if (ok) {
                      toast("Request sent", { body: "The platform team will review it. You’ll get a notification." });
                      void load();
                    }
                  }}
                >
                  Send request
                </Button>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

type Member = { user_id: string; member_role: string; status: string; joined_at: string };
type Programme = { id: string; name: string; status: string; participant_count: number; description: string };

/** Institution administrators: real members, programmes and the ideas shared with the institution. */
function AdminDashboard({ institutionId }: { institutionId: string }) {
  const s = useAppState();
  const inst = s.platform.institutions.find((i) => i.id === institutionId);
  const [prog, setProg] = useState({ name: "", description: "" });
  const q = useLiveQuery(async () => {
    const sb = supabaseBrowser();
    const [m, p] = await Promise.all([
      sb.from("institution_members").select("user_id, member_role, status, joined_at").eq("institution_id", institutionId).order("joined_at", { ascending: false }),
      sb.from("institution_programmes").select("id, name, status, participant_count, description").eq("institution_id", institutionId).order("created_at", { ascending: false }),
    ]);
    const error = m.error ?? p.error;
    return { data: error ? null : { members: m.data as Member[], programmes: p.data as Programme[] }, error };
  }, [institutionId]);
  const data = q.data;
  const error = q.error;
  const load = q.reload;

  // Ideas this member can see that were shared with this institution (visibility "institution").
  const ideas = [...s.ideas, ...s.platform.ideas].filter((i) => i.institutionId === institutionId && i.access !== "admin_index");
  const byIndustry = Object.entries(ideas.reduce<Record<string, number>>((acc, i) => ((acc[i.industry] = (acc[i.industry] ?? 0) + 1), acc), {})).map(([k, v]) => ({ label: industryLabel(k as never), value: v }));
  const pipeline = STAGES.map((st) => ({ label: st.label, value: ideas.filter((i) => i.stage === st.id).length }));
  const active = data?.members.filter((m) => m.status === "active") ?? [];
  const pending = data?.members.filter((m) => m.status === "pending") ?? [];

  const exportCsv = () => {
    const rows = [["Stage", "Ideas"], ...pipeline.map((p) => [p.label, String(p.value)])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "innovation-pipeline.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Report exported", { body: "Pipeline as CSV." });
  };

  return (
    <>
      <PageHeader
        title={inst?.name ?? "Your institution"}
        description="Members, programmes and the ideas students and founders have chosen to share with your institution."
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={15} aria-hidden /> Export pipeline report
          </Button>
        }
      />
      {error && (
        <p role="alert" className="mb-6 text-meta text-danger">
          Couldn’t load institution data: {error}
        </p>
      )}
      <section aria-label="Overview" className="grid grid-cols-2 gap-8 border-b border-line pb-10 md:grid-cols-4">
        <Stat label="Active members" value={data ? active.length : "—"} />
        <Stat label="Awaiting approval" value={data ? pending.length : "—"} />
        <Stat label="Ideas shared with you" value={ideas.length} />
        <Stat label="Programmes" value={data ? data.programmes.length : "—"} />
      </section>

      <div className="mt-10 grid gap-14 lg:grid-cols-2">
        <section aria-labelledby="industry">
          <SectionHeading title="Shared ideas by industry" id="industry" />
          {byIndustry.length ? <HBarChart caption="Shared ideas by industry" rows={byIndustry} unit="ideas" /> : <p className="text-meta text-sub">No ideas have been shared with your institution yet.</p>}
        </section>
        <section aria-labelledby="pipeline">
          <SectionHeading title="Pipeline by stage" id="pipeline" />
          <HBarChart caption="Shared ideas at each stage" rows={pipeline} unit="ideas" />
        </section>
        <section aria-labelledby="members">
          <SectionHeading title="Membership requests" id="members" count={pending.length} />
          {pending.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {pending.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-ui">{personById(s, m.user_id === s.authUserId ? "me" : m.user_id)?.name ?? "Member"}</span>
                  <span className="flex gap-2">
                    <Button size="sm" onClick={() => void write("approve member", (sb) => sb.from("institution_members").update({ status: "active" }).eq("institution_id", institutionId).eq("user_id", m.user_id).then((r) => r)).then((ok) => void (ok && load()))}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void write("decline member", (sb) => sb.from("institution_members").update({ status: "removed" }).eq("institution_id", institutionId).eq("user_id", m.user_id).then((r) => r)).then((ok) => void (ok && load()))}>
                      Decline
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-meta text-sub">{data ? "No pending requests." : "Loading…"}</p>
          )}
        </section>
        <section aria-labelledby="programmes">
          <SectionHeading title="Programmes" id="programmes" />
          {data?.programmes.length ? (
            <ul>
              {data.programmes.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                  <div>
                    <p className="text-ui font-medium">{p.name}</p>
                    <p className="text-meta text-sub">{p.status}</p>
                  </div>
                  <span className="shrink-0 text-meta text-sub tabular-nums">{p.participant_count} participants</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-meta text-sub">No programmes yet.</p>
          )}
          <div className="mt-4 flex flex-col gap-3">
            <TextField label="New programme" value={prog.name} onChange={(e) => setProg({ ...prog, name: e.target.value })} maxLength={160} />
            <div>
              <Button
                variant="secondary"
                disabled={prog.name.trim().length < 2}
                onClick={async () => {
                  const ok = await write("programme", (sb) => sb.from("institution_programmes").insert({ institution_id: institutionId, name: prog.name.trim(), description: prog.description }).then((r) => r));
                  if (ok) {
                    setProg({ name: "", description: "" });
                    void load();
                  }
                }}
              >
                Add programme
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="student-ideas" className="mt-14">
        <SectionHeading title="Ideas shared with your institution" id="student-ideas" />
        {ideas.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-ui">
              <thead>
                <tr className="border-b border-line-strong text-meta text-sub">
                  <th scope="col" className="py-2 pr-4 font-normal">Idea</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Owner</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Industry</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Stage</th>
                  <th scope="col" className="py-2 font-normal">Validation</th>
                </tr>
              </thead>
              <tbody>
                {ideas.map((i) => (
                  <tr key={i.id} className="border-b border-line">
                    <td className="py-3 pr-4">
                      <Link href={`/ideas/${i.id}`} className="font-medium hover:underline">
                        {i.title.split(":")[0]}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-sub">{personById(s, i.ownerId)?.name}</td>
                    <td className="py-3 pr-4 text-sub">{industryLabel(i.industry)}</td>
                    <td className="py-3 pr-4 text-sub">{stageLabel(i.stage)}</td>
                    <td className="py-3">
                      <StatusDot tone={i.validationStatus === "not_started" ? "mute" : i.validationStatus === "evidence_collected" ? "positive" : "ink"} label={{ not_started: "Not started", in_progress: "In progress", evidence_collected: "Evidence recorded" }[i.validationStatus]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState compact title="No shared ideas yet" body="Members can share an idea with your institution by choosing “My institution” as its visibility." />
        )}
      </section>
    </>
  );
}

function Institution() {
  const s = useAppState();
  const adminOf = s.session?.roles.find((r) => r.role === "institution_admin")?.institutionId;
  return adminOf ? <AdminDashboard institutionId={adminOf} /> : <RepresentativeView />;
}

export default function InstitutionPage() {
  return (
    <RoleGate roles={["institution_admin", "institution_rep"]}>
      <Institution />
    </RoleGate>
  );
}
