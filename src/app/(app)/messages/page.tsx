import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/primitives";
import { Inbox } from "@/features/messages/inbox";

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inbox />
    </Suspense>
  );
}
