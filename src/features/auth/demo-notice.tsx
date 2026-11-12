import { Info } from "lucide-react";

export function DemoAuthNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 border-l-2 border-line-strong bg-surface px-3.5 py-3 text-meta text-sub">
      <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
      <p>
        {children ?? "Demonstration sign-in. No server is connected: passwords are not stored or checked, and no email is sent."}
      </p>
    </div>
  );
}
