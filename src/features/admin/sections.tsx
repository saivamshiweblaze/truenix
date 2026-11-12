"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineSelect, Switch } from "@/components/ui/field";
import { DemoMark, EmptyState, SectionHeading, Stat, StatusDot } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { OPPORTUNITY_KIND_LABEL, roleLabel, ROLES } from "@/config/taxonomy";
import { OTHER_INSTITUTIONS, REPORTED_CONTENT } from "@/lib/demo-data/institution";
import { SEED_OPPORTUNITIES } from "@/lib/demo-data/opportunities";
import { SEED_IDEAS } from "@/lib/demo-data/ideas";
import { SEED_POSTS } from "@/lib/demo-data/feed";
import {
  adminModerate,
  adminSetInstitution,
  adminSetOpportunity,
  adminSetRole,
  adminSetUserStatus,
  adminUpdateSettings,
} from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { allPeople, personById } from "@/lib/store/selectors";
import type { RoleId } from "@/lib/types";
import { formatDate, matches, timeAgo } from "@/lib/utils";

function Title({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6 border-b border-line pb-5">
      <h1 className="text-title font-semibold">{title}</h1>
      <p className="mt-1.5 text-ui text-sub">{description}</p>
    </header>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-ui">
        <thead>
          <tr className="border-b border-line-strong text-meta text-sub">
            {head.map((h) => (
              <th key={h} scope="col" className="py-2 pr-4 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const td = "py-3 pr-4 align-top";

export function AdminOverview() {
  const s = useAppState();
  const pendingReports = REPORTED_CONTENT.filter((r) => !s.admin.moderation[r.id]).length;
  return (
    <>
      <Title title="Platform overview" description="Health of the platform at a glance. Figures are computed from demonstration data in this browser." />
      <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
        <Stat label="Members" value={allPeople(s).length + 1} note="Seeded + you" />
        <Stat label="Ideas" value={SEED_IDEAS.length + s.ideas.length} />
        <Stat label="Posts" value={SEED_POSTS.length + s.posts.length} />
        <Stat label="Open reports" value={pendingReports} />
        <Stat label="Institutions" value={OTHER_INSTITUTIONS.length} />
      </div>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section>
          <SectionHeading title="Needs attention" />
          <ul>
            <li className="border-b border-line py-3">
              <Link href="/admin/reports" className="text-ui hover:underline">
                {pendingReports} reported items awaiting review
              </Link>
            </li>
            <li className="border-b border-line py-3">
              <Link href="/admin/institutions" className="text-ui hover:underline">
                {OTHER_INSTITUTIONS.filter((i) => !s.admin.institutionStatus[i.id]).length} institutions awaiting verification
              </Link>
            </li>
          </ul>
        </section>
        <section>
          <SectionHeading title="Recent admin activity" action={<Link href="/admin/audit" className="text-meta text-sub hover:text-ink">Audit log</Link>} />
          {s.admin.audit.length ? (
            <ul>
              {s.admin.audit.slice(0, 5).map((a) => (
                <li key={a.id} className="border-b border-line py-2.5 text-ui">
                  {a.action} <span className="text-sub">— {a.target}</span>
                  <span className="block text-micro text-mute">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-meta text-sub">No admin actions yet.</p>
          )}
        </section>
      </div>
    </>
  );
}

export function AdminUsers() {
  const s = useAppState();
  const [q, setQ] = useState("");
  const people = allPeople(s).filter((p) => matches(q, p.name, p.organisation, p.headline));
  return (
    <>
      <Title title="User management" description="Search members and suspend or reactivate accounts. Suspended profiles are hidden from Community." />
      <div className="mb-4 flex h-9 max-w-sm items-center gap-2 rounded-sm border border-line-strong px-3 focus-within:border-ink">
        <Search size={15} className="text-sub" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" aria-label="Search users" className="h-full flex-1 bg-transparent text-ui focus:outline-none" />
      </div>
      <Table head={["Name", "Organisation", "Role", "Status", ""]}>
        {people.map((p) => {
          const st = s.admin.userStatus[p.id] ?? "active";
          return (
            <tr key={p.id} className="border-b border-line">
              <td className={td}>
                <Link href={`/people/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>{" "}
                <DemoMark className="ml-1" />
              </td>
              <td className={`${td} text-sub`}>{p.organisation}</td>
              <td className={`${td} text-sub`}>{roleLabel(p.role)}</td>
              <td className={td}>
                <StatusDot tone={st === "active" ? "ink" : "accent"} label={st === "active" ? "Active" : "Suspended"} />
              </td>
              <td className={`${td} text-right`}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    adminSetUserStatus(p.id, p.name, st === "active" ? "suspended" : "active");
                    toast(st === "active" ? `${p.name} suspended` : `${p.name} reactivated`);
                  }}
                >
                  {st === "active" ? "Suspend" : "Reactivate"}
                </Button>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}

export function AdminRoles() {
  const s = useAppState();
  return (
    <>
      <Title title="Role management" description="Assign roles to members. In Phase 1, roles change the interface only; real permission checks arrive with the backend." />
      <Table head={["Name", "Current role", "Change role"]}>
        {allPeople(s).map((p) => (
          <tr key={p.id} className="border-b border-line">
            <td className={`${td} font-medium`}>{p.name}</td>
            <td className={`${td} text-sub`}>{roleLabel(p.role)}</td>
            <td className={td}>
              <InlineSelect
                aria-label={`Role for ${p.name}`}
                value={p.role}
                onChange={(e) => {
                  adminSetRole(p.id, p.name, e.target.value as RoleId);
                  toast(`Role updated for ${p.name}`);
                }}
                options={ROLES.map((r) => ({ value: r.id, label: r.label }))}
              />
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function ModerationButtons({ id, label }: { id: string; label: string }) {
  const s = useAppState();
  const st = s.admin.moderation[id] ?? "pending";
  return (
    <div className="flex justify-end gap-1.5">
      {st !== "approved" && (
        <Button size="sm" variant="secondary" onClick={() => (adminModerate(id, label, "approved"), toast("Approved"))}>
          Approve
        </Button>
      )}
      {st !== "removed" && (
        <Button size="sm" variant="ghost" onClick={() => (adminModerate(id, label, "removed"), toast("Removed", { body: "Hidden from members in this browser." }))}>
          Remove
        </Button>
      )}
      {st !== "pending" && (
        <Button size="sm" variant="ghost" onClick={() => adminModerate(id, label, "pending")}>
          Reopen
        </Button>
      )}
    </div>
  );
}

function ModStatus({ id }: { id: string }) {
  const st = useAppState().admin.moderation[id] ?? "pending";
  return <StatusDot tone={st === "removed" ? "accent" : st === "approved" ? "ink" : "mute"} label={st === "pending" ? "Not reviewed" : st[0].toUpperCase() + st.slice(1)} />;
}

export function AdminIdeas() {
  const s = useAppState();
  const ideas = [...s.ideas.filter((i) => i.status === "submitted"), ...SEED_IDEAS];
  return (
    <>
      <Title title="Idea moderation" description="Review submitted ideas. Removing an idea hides it from Ideas and Discover." />
      <Table head={["Idea", "Owner", "Submitted", "Status", ""]}>
        {ideas.map((i) => (
          <tr key={i.id} className="border-b border-line">
            <td className={td}>
              <Link href={`/ideas/${i.id}`} className="font-medium hover:underline">
                {i.title.split(":")[0]}
              </Link>
            </td>
            <td className={`${td} text-sub`}>{personById(s, i.ownerId)?.name}</td>
            <td className={`${td} text-sub`}>{formatDate(i.createdAt)}</td>
            <td className={td}>
              <ModStatus id={i.id} />
            </td>
            <td className={td}>
              <ModerationButtons id={i.id} label={i.title} />
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

export function AdminContent() {
  const s = useAppState();
  const posts = [...s.posts, ...SEED_POSTS];
  return (
    <>
      <Title title="Content moderation" description="Posts across Discover and Community." />
      <Table head={["Post", "Author", "Posted", "Status", ""]}>
        {posts.map((p) => (
          <tr key={p.id} className="border-b border-line">
            <td className={`${td} max-w-xs`}>
              <span className="line-clamp-2 font-medium">{p.title}</span>
            </td>
            <td className={`${td} text-sub`}>{personById(s, p.authorId)?.name}</td>
            <td className={`${td} text-sub`}>{timeAgo(p.createdAt)}</td>
            <td className={td}>
              <ModStatus id={p.id} />
            </td>
            <td className={td}>
              <ModerationButtons id={p.id} label={p.title} />
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

export function AdminReports() {
  const s = useAppState();
  const open = REPORTED_CONTENT.filter((r) => !s.admin.moderation[r.id]);
  const closed = REPORTED_CONTENT.filter((r) => s.admin.moderation[r.id]);
  return (
    <>
      <Title title="Reported content" description="Reports submitted by members. Dismiss a report to keep the content, or remove the content." />
      {open.length ? (
        <ul>
          {open.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 border-b border-line py-4 md:flex-row md:items-center">
              <div className="flex-1">
                <p className="text-ui font-medium">{r.targetLabel}</p>
                <p className="text-meta text-sub">
                  {r.reason} · reported by {r.reporter} · {timeAgo(r.createdAt)}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => (adminModerate(r.id, r.targetLabel, "approved"), toast("Report dismissed"))}>
                  Dismiss report
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    adminModerate(r.id, r.targetLabel, "removed");
                    adminModerate(r.targetId, r.targetLabel, "removed");
                    toast("Content removed");
                  }}
                >
                  Remove content
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No open reports" body="New reports from members appear here." />
      )}
      {closed.length > 0 && (
        <section className="mt-10">
          <SectionHeading title="Resolved" />
          <ul>
            {closed.map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-line py-3 text-ui">
                <span>{r.targetLabel}</span>
                <span className="flex items-center gap-3">
                  <StatusDot tone="mute" label={s.admin.moderation[r.id] === "removed" ? "Content removed" : "Dismissed"} />
                  <button
                    type="button"
                    className="text-meta text-sub underline-offset-4 hover:text-ink hover:underline"
                    onClick={() => {
                      adminModerate(r.id, r.targetLabel, "pending");
                      adminModerate(r.targetId, r.targetLabel, "pending");
                    }}
                  >
                    Reopen
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function AdminInstitutions() {
  const s = useAppState();
  return (
    <>
      <Title title="Institution management" description="Verify institutions before their administrators can run programmes. All listed institutions are fictional." />
      <Table head={["Institution", "Location", "Students", "Status", ""]}>
        {OTHER_INSTITUTIONS.map((i) => {
          const st = s.admin.institutionStatus[i.id] ?? "pending";
          return (
            <tr key={i.id} className="border-b border-line">
              <td className={`${td} font-medium`}>{i.name}</td>
              <td className={`${td} text-sub`}>{i.location}</td>
              <td className={`${td} tabular-nums text-sub`}>{i.students}</td>
              <td className={td}>
                <StatusDot tone={st === "verified" ? "ink" : st === "rejected" ? "accent" : "mute"} label={st[0].toUpperCase() + st.slice(1)} />
              </td>
              <td className={td}>
                <div className="flex justify-end gap-1.5">
                  {st !== "verified" && (
                    <Button size="sm" variant="secondary" onClick={() => (adminSetInstitution(i.id, i.name, "verified"), toast(`${i.name} verified`))}>
                      Verify
                    </Button>
                  )}
                  {st !== "rejected" && (
                    <Button size="sm" variant="ghost" onClick={() => (adminSetInstitution(i.id, i.name, "rejected"), toast(`${i.name} rejected`))}>
                      Reject
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}

export function AdminOpportunities() {
  const s = useAppState();
  return (
    <>
      <Title title="Opportunity management" description="Publish or hide opportunity listings. Hidden listings disappear from Opportunities." />
      <Table head={["Opportunity", "Type", "Deadline", "Status", ""]}>
        {SEED_OPPORTUNITIES.map((o) => {
          const st = s.admin.opportunityStatus[o.id] ?? "published";
          return (
            <tr key={o.id} className="border-b border-line">
              <td className={`${td} font-medium`}>{o.title}</td>
              <td className={`${td} text-sub`}>{OPPORTUNITY_KIND_LABEL[o.kind]}</td>
              <td className={`${td} text-sub`}>{formatDate(o.deadline)}</td>
              <td className={td}>
                <StatusDot tone={st === "published" ? "ink" : "mute"} label={st === "published" ? "Published" : "Hidden"} />
              </td>
              <td className={`${td} text-right`}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    adminSetOpportunity(o.id, o.title, st === "published" ? "hidden" : "published");
                    toast(st === "published" ? "Listing hidden" : "Listing published");
                  }}
                >
                  {st === "published" ? "Hide" : "Publish"}
                </Button>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}

export function AdminSettings() {
  const st = useAppState().admin.settings;
  return (
    <>
      <Title title="Platform settings" description="Global switches. Stored locally in this demonstration and recorded in the audit log." />
      <div className="max-w-xl divide-y divide-line border-y border-line">
        <Switch label="Open registration" description="Allow anyone to create an account." checked={st.openRegistration} onChange={(v) => (adminUpdateSettings({ openRegistration: v }), toast("Setting saved"))} />
        <Switch label="Review public ideas before listing" description="New public ideas wait for moderation." checked={st.requireIdeaReview} onChange={(v) => (adminUpdateSettings({ requireIdeaReview: v }), toast("Setting saved"))} />
        <Switch label="AI Researcher available" description="Show the research workspace to members." checked={st.researchEnabled} onChange={(v) => (adminUpdateSettings({ researchEnabled: v }), toast("Setting saved"))} />
      </div>
      <p className="mt-4 text-meta text-mute">These switches are not yet wired to enforcement; they demonstrate the settings model for Phase 2.</p>
    </>
  );
}

export function AdminAudit() {
  const audit = useAppState().admin.audit;
  return (
    <>
      <Title title="Audit activity" description="Every admin action, newest first. Stored in this browser for the demonstration." />
      {audit.length ? (
        <Table head={["When", "Actor", "Action", "Target"]}>
          {audit.map((a) => (
            <tr key={a.id} className="border-b border-line">
              <td className={`${td} whitespace-nowrap text-sub`}>{timeAgo(a.createdAt)}</td>
              <td className={td}>{a.actor}</td>
              <td className={td}>{a.action}</td>
              <td className={`${td} text-sub`}>{a.target}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No admin actions yet" body="Moderation, role and settings changes will be logged here." />
      )}
    </>
  );
}
