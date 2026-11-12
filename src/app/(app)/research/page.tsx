import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/primitives";
import { ResearchWorkspace } from "@/features/research/research-workspace";

export default function ResearchPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResearchWorkspace />
    </Suspense>
  );
}
