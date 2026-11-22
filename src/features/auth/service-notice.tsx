import { Info } from "lucide-react";

/**
 * Contextual disclosure for account features that are not yet connected to a server
 * (password checks, email delivery, verification). Shown only where it affects the action.
 */
export function ServiceNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-sm border border-line bg-surface px-3.5 py-3 text-meta text-sub">
      <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
