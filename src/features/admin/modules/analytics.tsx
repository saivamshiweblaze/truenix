"use client";

import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnChart, HBarChart } from "@/components/ui/charts";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { EVIDENCE_TYPES, industryLabel, POST_KIND_LABEL, stageLabel, STAGES } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminRecordExport } from "@/lib/store/admin-actions";
import { allIdeasAdmin, allPostsAdmin } from "@/lib/store/selectors";
import { downloadCsv } from "@/lib/admin/csv";
import { computeMetrics, inRange, RANGES, weekly, type RangeId } from "@/lib/admin/metrics";
import { memberRows } from "@/lib/admin/members";
import type { IndustryId, PostKind } from "@/lib/types";
import { AdminHeader, Block, Metric, MetricStrip } from "../kit/layout";
import { useCan } from "../kit/can";

type Row = { label: string; value: number };

function ExportButton({ name, rows }: { name: string; rows: Row[] }) {
  const can = useCan();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={!can("analytics", "export")}
      onClick={() => {
        downloadCsv(`truevix-${name.toLowerCase().replace(/\s+/g, "-")}`, ["Category", "Count"], rows.map((r) => [r.label, r.value]));
        adminRecordExport(`Analytics: ${name}`, rows.length);
        toast("CSV exported");
      }}
    >
      <Download size={14} aria-hidden /> CSV
    </Button>
  );
}

function Chart({ title, rows, unit, description, columns }: { title: string; rows: Row[]; unit: string; description?: ReactNode; columns?: boolean }) {
  return (
    <Block title={title} description={description} action={<ExportButton name={title} rows={rows} />}>
      {rows.length && rows.some((r) => r.value > 0) ? (
        columns ? <ColumnChart caption={title} labels={rows.map((r) => r.label)} values={rows.map((r) => r.value)} unit={unit} /> : <HBarChart caption={title} rows={rows} unit={unit} />
      ) : (
        <p className="text-meta text-sub">No records in this range.</p>
      )}
    </Block>
  );
}

const countBy = <T,>(items: T[], key: (x: T) => string): Row[] => {
  const m = new Map<string, number>();
  items.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

export function AnalyticsPage() {
  const s = useAppState();
  const [range, setRange] = useState<RangeId>("all");
  const m = computeMetrics(s, range);
  const members = memberRows(s).filter((r) => inRange(r.account.registeredAt, range));
  const ideas = allIdeasAdmin(s).filter((i) => i.status === "submitted" && inRange(i.createdAt, range));
  const posts = allPostsAdmin(s).filter((p) => inRange(p.createdAt, range));
  const regs = s.platform.registrations.filter((r) => inRange(r.createdAt, range));
  const research = [...s.research, ...s.platform.research].filter((r) => inRange(r.createdAt, range));
  const evidence = Object.values({ ...s.platform.validations, ...s.validations }).flatMap((w) => w.evidence).filter((e) => inRange(e.createdAt, range));
  const reports = s.platform.reports.filter((r) => inRange(r.createdAt, range));
  const resolved = reports.filter((r) => r.reviewedAt && (r.status === "actioned" || r.status === "dismissed"));
  const avgHours = resolved.length ? Math.round(resolved.reduce((a, r) => a + (new Date(r.reviewedAt!).getTime() - new Date(r.createdAt).getTime()), 0) / resolved.length / 3_600_000) : null;
  const hackathons = s.platform.opportunities.filter((o) => o.kind === "hackathon");
  const hackRegs = regs.filter((r) => hackathons.some((h) => h.id === r.opportunityId));
  const reg = weekly(members.map((x) => x.account.registeredAt));
  const ideaWeeks = weekly(ideas.map((i) => i.createdAt));
  const postWeeks = weekly(posts.map((p) => p.createdAt));

  return (
    <>
      <AdminHeader
        title="Analytics"
        description="Measured figures calculated from the records your role can view in the TRUEVIX database. Anything TRUEVIX does not record yet (page views, opportunity views, active users) is marked as not measured rather than estimated."
        actions={<Segmented label="Date range" value={range} onChange={setRange} items={RANGES} />}
      />
      <MetricStrip cols={6}>
        <Metric label="New members" value={members.length} note="Measured" />
        <Metric label="Onboarding completion" value={`${Math.round((members.filter((x) => x.account.onboarding.completed).length / Math.max(1, members.length)) * 100)}%`} note="Of members registered in range" />
        <Metric label="Ideas submitted" value={ideas.length} note="Measured" />
        <Metric label="Applications" value={regs.length} note="Measured" />
        <Metric label="Opportunity views" value="—" note="Not measured yet" />
        <Metric label="Active members" value="—" note="Not measured: no server sessions" />
      </MetricStrip>

      <h2 className="mb-4 mt-10 text-section font-bold">Members</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        <Chart title="Registrations by week" rows={reg.labels.map((label, i) => ({ label, value: reg.values[i] }))} unit="registrations" columns />
        <Chart title="Members by role" rows={m.roleCounts} unit="members" description="All members, regardless of range." />
        <Chart title="Onboarding" rows={[{ label: "Complete", value: members.filter((x) => x.account.onboarding.completed).length }, { label: "Incomplete", value: members.filter((x) => !x.account.onboarding.completed).length }]} unit="members" />
        <Chart title="Institution participation" rows={countBy(members.filter((x) => x.institutionName), (x) => x.institutionName!)} unit="members" description="Members linked to an organisation." />
      </div>

      <h2 className="mb-4 mt-10 text-section font-bold">Ideas and projects</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        <Chart title="Idea submissions by week" rows={ideaWeeks.labels.map((label, i) => ({ label, value: ideaWeeks.values[i] }))} unit="ideas" columns />
        <Chart title="Projects by stage" rows={STAGES.map((st) => ({ label: stageLabel(st.id), value: ideas.filter((i) => i.stage === st.id).length }))} unit="ideas" />
        <Chart title="Ideas by industry" rows={countBy(ideas, (i) => industryLabel(i.industry as IndustryId))} unit="ideas" />
        <Chart title="Research runs by depth" rows={countBy(research, (r) => (r.runStatus === "failed" ? "Failed" : r.depth === "scan" ? "Quick scan" : r.depth === "deep" ? "Deep" : "Standard"))} unit="runs" description="Template plans; no provider usage exists to report." />
        <Chart title="Validation evidence by type" rows={EVIDENCE_TYPES.map((t) => ({ label: t.label, value: evidence.filter((e) => e.type === t.id).length }))} unit="items" description="Counts only. There is no validation score." />
      </div>

      <h2 className="mb-4 mt-10 text-section font-bold">Community</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        <Chart title="Posts by week" rows={postWeeks.labels.map((label, i) => ({ label, value: postWeeks.values[i] }))} unit="posts" columns />
        <Chart title="Posts by type" rows={countBy(posts, (p) => POST_KIND_LABEL[p.kind as PostKind])} unit="posts" />
      </div>

      <h2 className="mb-4 mt-10 text-section font-bold">Opportunities and programmes</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        <Chart title="Applications by opportunity" rows={countBy(regs, (r) => s.platform.opportunities.find((o) => o.id === r.opportunityId)?.title ?? r.opportunityId)} unit="applications" />
        <Chart title="Application status" rows={countBy(regs, (r) => r.status.replace("_", " "))} unit="applications" />
        <Block title="Hackathon participation" action={<ExportButton name="Hackathon participation" rows={[{ label: "Registrations", value: hackRegs.length }, { label: "Teams", value: hackRegs.filter((r) => r.mode === "team").length }, { label: "Participants", value: hackRegs.reduce((a, r) => a + r.members.length, 0) }]} />}>
          <MetricStrip cols={3}>
            <Metric label="Registrations" value={hackRegs.length} />
            <Metric label="Teams" value={hackRegs.filter((r) => r.mode === "team").length} />
            <Metric label="Participants" value={hackRegs.reduce((a, r) => a + r.members.length, 0)} />
          </MetricStrip>
        </Block>
        <Block title="Mentor activity" action={<ExportButton name="Mentor activity" rows={countBy(s.platform.mentorships, (x) => x.status)} />}>
          <MetricStrip cols={3}>
            <Metric label="Active mentorships" value={s.platform.mentorships.filter((x) => x.status === "active").length} />
            <Metric label="Proposed" value={s.platform.mentorships.filter((x) => x.status === "proposed").length} />
            <Metric label="Mentor sessions" value="—" note="Not measured" />
          </MetricStrip>
        </Block>
      </div>

      <h2 className="mb-4 mt-10 text-section font-bold">Moderation</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        <Chart title="Reports by reason" rows={countBy(reports, (r) => r.reason)} unit="reports" />
        <Block title="Moderation statistics" action={<ExportButton name="Moderation statistics" rows={countBy(reports, (r) => r.status)} />}>
          <MetricStrip cols={3}>
            <Metric label="Reports" value={reports.length} />
            <Metric label="Resolved" value={resolved.length} />
            <Metric label="Average time to resolve" value={avgHours === null ? "—" : `${avgHours} h`} note={avgHours === null ? "No resolved reports" : "Measured"} />
          </MetricStrip>
        </Block>
      </div>
    </>
  );
}
