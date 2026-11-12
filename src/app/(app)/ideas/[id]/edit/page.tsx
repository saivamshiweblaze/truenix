"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { IdeaForm } from "@/features/ideas/idea-form";
import { useAppState } from "@/lib/store/store";

function EditIdea() {
  const { id } = useParams<{ id: string }>();
  const idea = useAppState().ideas.find((i) => i.id === id);
  if (!idea) {
    return <EmptyState title="You can only edit your own ideas" body="This idea does not exist or belongs to someone else." action={<ButtonLink href="/ideas">Back to ideas</ButtonLink>} />;
  }
  return (
    <>
      <PageHeader title="Edit idea" description={idea.title} />
      <IdeaForm existing={idea} />
    </>
  );
}

export default function EditIdeaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditIdea />
    </Suspense>
  );
}
