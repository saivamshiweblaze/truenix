"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnChart, HBarChart } from "@/components/ui/charts";
import { SampleMark, PageHeader, SectionHeading, Stat, StatusDot } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { RoleGate } from "@/components/shell/role-gate";
import { industryLabel, stageLabel } from "@/config/taxonomy";
import { DEMO_INSTITUTION as I } from "@/lib/demo-data/institution";
import { useAppState } from "@/lib/store/store";
import { allPeople, feedPosts, publicIdeas } from "@/lib/store/selectors";

function InstitutionDashboard() {
  const s = useAppState();
  const myInstitution = typeof s.user?.profile?.institutionName === "string" ? s.user.profile.institutionName : "";
  const students = allPeople(s).filter((p) => p.organisation === I.name);
  const ideas = publicIdeas(s).filter((i) => students.some((p) => p.id === i.ownerId));
  const challenges = feedPosts(s).filter((p) => p.kind === "challenge");

  const exportCsv = () => {
    const rows = [["Stage", "Ideas"], ...I.pipeline.map((p) => [p.stage, String(p.count)])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "innovation-pipeline-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Report exported", { body: "Pipeline (sample data) as CSV." });
  };

  return (
    <>
      <PageHeader
        title={myInstitution || I.name}
        description="Student participation, ideas, programmes and the incubation pipeline."
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={15} aria-hidden /> Export pipeline report
          </Button>
        }
      >
        <p className="mt-3 flex flex-wrap items-center gap-2 text-meta text-sub">
          <SampleMark>Sample data</SampleMark> Figures below are illustrative{myInstitution ? ` and are not ${myInstitution}’s records` : ""}. They will be replaced by your institution’s data once records are connected.
        </p>
      </PageHeader>

      <section aria-label="Student overview" className="grid grid-cols-2 gap-8 border-b border-line pb-10 md:grid-cols-5">
        <Stat label="Students registered" value={I.studentsRegistered} />
        <Stat label="Active this month" value={I.activeThisMonth} />
        <Stat label="Ideas submitted" value={I.ideasSubmitted} />
        <Stat label="Active projects" value={I.projectsActive} />
        <Stat label="Mentors engaged" value={I.mentorsEngaged} />
      </section>

      <div className="mt-10 grid gap-14 lg:grid-cols-2">
        <section aria-labelledby="activity">
          <SectionHeading title="Monthly active students" id="activity" />
          <ColumnChart caption="Monthly active students" labels={I.months} values={I.monthlyActivity} unit="students" />
        </section>
        <section aria-labelledby="industry">
          <SectionHeading title="Ideas by industry" id="industry" />
          <HBarChart caption="Ideas submitted by industry" rows={I.participationByIndustry} unit="ideas" />
        </section>
        <section aria-labelledby="pipeline">
          <SectionHeading title="Incubation pipeline" id="pipeline" />
          <HBarChart caption="Ideas at each stage of the incubation pipeline" rows={I.pipeline.map((p) => ({ label: p.stage, value: p.count }))} unit="ideas" />
        </section>
        <section aria-labelledby="programmes">
          <SectionHeading title="Programmes and challenges" id="programmes" />
          <ul>
            {I.programmes.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                <div>
                  <p className="text-ui font-medium">{p.name}</p>
                  <p className="text-meta text-sub">{p.status}</p>
                </div>
                <span className="shrink-0 text-meta text-sub tabular-nums">{p.participants} students</span>
              </li>
            ))}
            {challenges.map((c) => (
              <li key={c.id} className="border-b border-line py-3">
                <Link href={`/discover#${c.id}`} className="text-ui font-medium hover:underline">
                  {c.title}
                </Link>
                <p className="text-meta text-sub">Posted to Discover</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="student-ideas" className="mt-14">
        <SectionHeading title="Recent student ideas" id="student-ideas" action={<Link href="/ideas" className="text-meta text-sub hover:text-ink">All ideas</Link>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-ui">
            <thead>
              <tr className="border-b border-line-strong text-meta text-sub">
                <th scope="col" className="py-2 pr-4 font-normal">Idea</th>
                <th scope="col" className="py-2 pr-4 font-normal">Student</th>
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
                  <td className="py-3 pr-4 text-sub">{students.find((p) => p.id === i.ownerId)?.name}</td>
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
      </section>
    </>
  );
}

export default function InstitutionPage() {
  return (
    <RoleGate roles={["institution_admin"]}>
      <InstitutionDashboard />
    </RoleGate>
  );
}
