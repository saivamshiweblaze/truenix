import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/primitives";
import { ValidationWorkspaceView } from "@/features/validation/validation-workspace";

export default function ValidationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ValidationWorkspaceView />
    </Suspense>
  );
}
