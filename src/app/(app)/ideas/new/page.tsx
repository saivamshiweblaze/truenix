"use client";

import { PageHeader } from "@/components/ui/primitives";
import { IdeaForm } from "@/features/ideas/idea-form";

export default function NewIdeaPage() {
  return (
    <>
      <PageHeader title="Submit an idea" description="Four short steps. Save a draft at any point and come back later. You choose who can see it." />
      <IdeaForm />
    </>
  );
}
