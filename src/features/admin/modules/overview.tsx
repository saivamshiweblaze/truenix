"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ColumnChart, HBarChart } from "@/components/ui/charts";
import { Avatar } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/tabs";
import { roleLabel } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { computeMetrics, pendingCounts, RANGES, type RangeId } from "@/lib/admin/metrics";
import { memberRows } from "@/lib/admin/members";
import { opportunityLifecycle } from "@/lib/admin/lifecycle";
import { daysUntil, formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Block, Metric, MetricStrip } from "../kit/layout";
import { AdminStatus } from "../kit/status";
import { useCan } from "../kit/can";


export function AdminOverview() {
  const s = useAppState();
  const can = useCan();
  const [range, setRange] = useState<RangeId>("30");
  const m = computeMetrics(s, range);
  const pending = pendingCounts(s);
  const rangeLabel = RANGES.find((r) => r.value === range)!.label.toLowerCase();
  const recent = [...memberRows(s)].sort((a, b) => b.account.registeredAt.localeCompare(a.account.registeredAt)).slice(0, 5);
  const deadlines = s.platform.opportunities
    .filter((o) => ["open", "closing_soon", "upcoming"].includes(opportunityLifecycle(o)))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);
  const queue = s.platform.reports.filter((r) => r.status === "open" || r.status === "in_review").sort((a, b) => (a.severity === "high" ? -1 : b.severity === "high" ? 1 : b.createdAt.localeCompare(a.createdAt))).slice(0, 4);

  const alerts: { text: string; href: string }[] = [];
  if (s.platform.config.maintenance.enabled) alerts.push({ text: "Maintenance mode is on for members.", href: "/admin/settings" });
  s.platform.opportunities.filter((o) => o.source === "external" && o.sourceVerification === "needs_recheck").forEach((o) => alerts.push({ text: `Source for “${o.title}” needs re-checking.`, href: `/admin/opportunities/${o.id}` }));
  if (m.researchFailed) alerts.push({ text: `${m.researchFailed} AI Researcher run failed.`, href: "/admin/research" });
  s.platform.reports.filter((r) => r.severity === "high" && r.status === "open").forEach((r) => alerts.push({ text: `High-severity report: ${r.reason}.`, href: `/admin/moderation/${r.id}` }));
  if (m.restricted + m.suspended) alerts.push({ text: `${m.restricted} restricted and ${m.suspended} suspended accounts.`, href: "/admin/users" });

  return (
    <>
      <AdminHeader
        title="Platform overview"
        description="What needs attention across TRUEVIX. Figures are calculated from the database records your role can view, not from web analytics."
        actions={
          <>
            <Segmented label="Date range" value={range} onChange={setRange} items={RANGES} />
            {can("opportunities", "create") && (
              <ButtonLink href="/admin/opportunities/new" variant="accent" size="sm" className="h-9">
                <Plus size={15} aria-hidden /> New opportunity
              </ButtonLink>
            )}
          </>
        }
      />

      <h2 className="sr-only">Key figures</h2>
      <MetricStrip cols={6}>
        <Metric label="Registered members" value={m.members} note={`${m.newMembers} new in ${rangeLabel}`} href="/admin/users" />
        <Metric label="Onboarding complete" value={`${m.onboarded}/${m.members}`} note={`${m.onboardingIncomplete} incomplete`} href="/admin/onboarding" />
        <Metric label="Active accounts" value={m.active} note={`${m.restricted} restricted · ${m.suspended} suspended`} href="/admin/users" />
        <Metric label="Submitted ideas" value={m.ideas} note={`${m.ideasPending} awaiting review`} href="/admin/ideas" />
        <Metric label="Open reports" value={m.reportsOpen} note="Moderation queue" href="/admin/moderation" />
        <Metric label="Open opportunities" value={m.oppsOpen} note={`${m.hackathons} hackathons · ${m.oppsDraft} drafts`} href="/admin/opportunities" />
      </MetricStrip>
      <div className="mt-2">
        <MetricStrip cols={6}>
          <Metric label="Applications" value={m.registrations} note={`${m.registrationsInRange} in ${rangeLabel}`} href="/admin/opportunities" />
          <Metric label="Organisations" value={m.institutions} note={`${m.institutionsPending} requests pending`} href="/admin/institutions" />
          <Metric label="Research runs" value={m.research} note={`${m.researchInRange} in ${rangeLabel}`} href="/admin/research" />
          <Metric label="Validation workspaces" value={m.validations} note={`${m.evidence} evidence items`} href="/admin/validation" />
          <Metric label="Community posts" value={m.posts} note={`${m.postsInRange} in ${rangeLabel} · ${m.comments} comments`} href="/admin/content" />
          <Metric label="Active mentorships" value={m.mentorsActive} note={`${m.talentApplied} mentor applications`} href="/admin/talent" />
        </MetricStrip>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="New registrations per week" description="Members by registration date, last ten weeks.">
            <ColumnChart caption="New registrations per week" labels={m.regWeekly.labels} values={m.regWeekly.values} unit="registrations" />
          </Block>
          <div className="grid gap-8 md:grid-cols-2">
            <Block title="Members by role">
              <HBarChart caption="Members by role" rows={m.roleCounts} unit="members" />
            </Block>
            <Block title="Recent registrations" action={<Link href="/admin/users" className="text-meta text-sub hover:text-ink">All users</Link>}>
              <ul className="flex flex-col">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
                    <Avatar name={r.person.name} size={28} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/users/${r.id}`} className="block truncate text-ui font-medium hover:underline">
                        {r.person.name}
                      </Link>
                      <span className="block truncate text-micro text-mute">
                        {roleLabel(r.person.role)} · {timeAgo(r.account.registeredAt)}
                      </span>
                    </div>
                    {!r.account.onboarding.completed && <AdminStatus value="pending" label="Onboarding" />}
                  </li>
                ))}
              </ul>
            </Block>
          </div>
          <Block title="Moderation queue" action={<Link href="/admin/moderation" className="text-meta text-sub hover:text-ink">Open queue</Link>}>
            {queue.length ? (
              <ul>
                {queue.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-2.5 last:border-b-0">
                    <AdminStatus value={r.severity === "high" ? "failed" : r.severity === "medium" ? "pending" : "draft"} label={`${r.severity[0].toUpperCase()}${r.severity.slice(1)}`} />
                    <Link href={`/admin/moderation/${r.id}`} className="min-w-0 flex-1 truncate text-ui hover:underline">
                      {r.targetLabel}
                    </Link>
                    <span className="text-meta text-sub">{r.reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-sub">No open reports.</p>
            )}
          </Block>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Pending approvals">
            <ul>
              {[
                { n: pending.ideas, label: "ideas awaiting review", href: "/admin/ideas" },
                { n: pending.institutions, label: "organisation requests", href: "/admin/institutions" },
                { n: pending.talent, label: "mentor and expert applications", href: "/admin/talent" },
                { n: pending.applications, label: "opportunity applications to review", href: "/admin/opportunities" },
                { n: pending.reports, label: "reports to moderate", href: "/admin/moderation" },
              ].map((x) => (
                <li key={x.label} className="border-b border-line last:border-b-0">
                  <Link href={x.href} className="flex items-center gap-3 py-2.5 text-ui hover:underline">
                    <span className="w-6 text-right font-semibold tabular-nums">{x.n}</span> {x.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Operational alerts">
            {alerts.length ? (
              <ul className="flex flex-col gap-2">
                {alerts.map((a) => (
                  <li key={a.text} className="flex gap-2 text-ui">
                    <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-caution" />
                    <Link href={a.href} className="hover:underline">
                      {a.text}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-sub">No alerts.</p>
            )}
          </Block>
          <Block title="Upcoming deadlines">
            <ul>
              {deadlines.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                  <Link href={`/admin/opportunities/${o.id}`} className="min-w-0 truncate text-ui hover:underline">
                    {o.title}
                  </Link>
                  <span className={daysUntil(o.deadline) <= 7 ? "shrink-0 text-meta text-caution" : "shrink-0 text-meta text-sub"}>{formatDate(o.deadline)}</span>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Quick actions">
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/opportunities/new?kind=hackathon" variant="secondary" size="sm">
                Create hackathon
              </ButtonLink>
              <ButtonLink href="/admin/institutions/new" variant="secondary" size="sm">
                Add organisation
              </ButtonLink>
              <ButtonLink href="/admin/communications?new=1" variant="secondary" size="sm">
                Draft announcement
              </ButtonLink>
              <ButtonLink href="/admin/cms" variant="secondary" size="sm">
                Edit site content
              </ButtonLink>
            </div>
          </Block>
          <Block title="Recent admin activity" action={<Link href="/admin/audit" className="text-meta text-sub hover:text-ink">Audit log</Link>}>
            {s.admin.audit.length ? (
              <ul>
                {s.admin.audit.slice(0, 5).map((a) => (
                  <li key={a.id} className="border-b border-line py-2 text-ui last:border-b-0">
                    {a.action} <span className="text-sub">— {a.target}</span>
                    <span className="block text-micro text-mute">
                      {a.actor} · {timeAgo(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-sub">No admin actions yet. Actions you take are recorded here and in the audit log.</p>
            )}
          </Block>
        </div>
      </div>
    </>
  );
}
