"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminRevealRecord } from "@/lib/store/admin-actions";
import { useConfirm } from "./confirm";

/**
 * Confidential member content (research reports, validation evidence) is not sent to the admin portal until an
 * administrator gives a reason. The database records the access in the audit log and returns the content in the
 * same transaction (public.admin_reveal_*), so the record and the read cannot be separated.
 */
export function RevealGate({ kind, recordId, ideaId, locked, what, children }: { kind: "research" | "validation"; recordId: string; ideaId: string | null; locked: boolean; what: string; children: ReactNode }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  if (!locked) return <>{children}</>;
  return (
    <div className="max-w-xl rounded-md border border-dashed border-line-strong p-6">
      {confirm.dialog}
      <Lock size={20} className="text-sub" aria-hidden />
      <h2 className="mt-3 text-section font-bold">Confidential {what}</h2>
      <p className="mt-1 text-ui text-sub">This belongs to a member’s private work. Open it only when you need it for a review, report or support request. Your name, the time and your reason are recorded in the audit log.</p>
      <Button
        className="mt-4"
        variant="secondary"
        disabled={busy}
        onClick={() =>
          confirm.ask({
            title: `Open this ${what}?`,
            consequences: ["Your name, the time and your reason are recorded in the audit log."],
            confirmLabel: "Open",
            reason: "required",
            reasonLabel: "Why do you need to see it?",
            onConfirm: (reason) => {
              setBusy(true);
              void adminRevealRecord(kind, recordId, ideaId, reason).finally(() => setBusy(false));
            },
          })
        }
      >
        {busy ? "Opening…" : "Open with a reason"}
      </Button>
    </div>
  );
}
