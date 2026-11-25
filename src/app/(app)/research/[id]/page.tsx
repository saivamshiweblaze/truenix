"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { LensArt } from "@/components/illustrations/art";
import { deleteResearch } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { ReportView } from "@/features/research/report-view";

function Report() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const report = useAppState().research.find((r) => r.id === id);
  if (!report) {
    return <EmptyState art={<LensArt size={52} />} title="Report not found" body="It may have been deleted, or it isn’t shared with you." action={<ButtonLink href="/research">Open AI Researcher</ButtonLink>} />;
  }
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-between text-meta text-sub">
        <span>
          <Link href="/research" className="hover:text-ink">
            AI Researcher
          </Link>
          <span className="mx-2 text-mute">/</span>
          <span className="text-ink">Report</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            deleteResearch(report.id);
            toast("Report deleted");
            router.push("/research");
          }}
        >
          Delete report
        </Button>
      </nav>
      <ReportView report={report} />
    </>
  );
}

export default function ResearchReportPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Report />
    </Suspense>
  );
}
