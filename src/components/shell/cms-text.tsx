"use client";

import { useAppSnapshot } from "@/lib/store/store";
import { cmsFields } from "@/lib/store/selectors";

/** Plain-text paragraph from published site content (Admin › Site content). Renders nothing when unpublished. */
export function CmsText({ id, field, className }: { id: string; field: string; className?: string }) {
  const { state } = useAppSnapshot();
  const text = cmsFields(state, id)?.[field];
  if (!text?.trim()) return null;
  return <p className={className}>{text}</p>;
}
