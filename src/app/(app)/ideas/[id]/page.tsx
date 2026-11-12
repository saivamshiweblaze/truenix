import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/primitives";
import { IdeaDetail } from "@/features/ideas/idea-detail";

export default function IdeaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IdeaDetail />
    </Suspense>
  );
}
