"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  /** What will happen, in plain language. Shown as a list. */
  consequences?: string[];
  confirmLabel: string;
  danger?: boolean;
  /** "required" for sensitive actions: the reason is stored in the audit log. */
  reason?: "required" | "optional";
  reasonLabel?: string;
  /** Word the administrator must type to confirm (for destructive actions). */
  typeToConfirm?: string;
  onConfirm: (reason: string) => void;
}

/**
 * Confirmation for consequential admin actions: states the consequences, optionally requires
 * a reason (recorded in the audit log) and a typed confirmation word.
 */
export function ConfirmDialog({ open, onClose, options }: { open: boolean; onClose: () => void; options: ConfirmOptions | null }) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [prev, setPrev] = useState(options);
  if (prev !== options) {
    setPrev(options);
    setReason("");
    setTyped("");
    setError(undefined);
  }
  if (!options) return null;
  const o = options;
  const submit = () => {
    if (o.reason === "required" && reason.trim().length < 5) {
      setError("Give a reason of at least 5 characters. It is stored in the audit log.");
      return;
    }
    if (o.typeToConfirm && typed.trim() !== o.typeToConfirm) {
      setError(`Type ${o.typeToConfirm} to confirm.`);
      return;
    }
    o.onConfirm(reason.trim());
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={o.title}
      description={o.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={o.danger ? "danger" : "primary"} onClick={submit}>
            {o.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {o.consequences && o.consequences.length > 0 && (
          <div className="flex gap-3 rounded-sm bg-surface p-3">
            <AlertTriangle size={16} className={o.danger ? "mt-0.5 shrink-0 text-danger" : "mt-0.5 shrink-0 text-sub"} aria-hidden />
            <ul className="flex flex-col gap-1 text-meta text-charcoal">
              {o.consequences.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {o.reason && (
          <TextArea
            label={o.reasonLabel ?? "Reason"}
            optional={o.reason === "optional"}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(undefined);
            }}
            hint="Recorded in the audit log with your name."
            error={o.typeToConfirm ? undefined : error}
          />
        )}
        {o.typeToConfirm && <TextField label={`Type ${o.typeToConfirm} to confirm`} value={typed} onChange={(e) => (setTyped(e.target.value), setError(undefined))} error={error} autoComplete="off" />}
      </div>
    </Dialog>
  );
}

/** Small hook pairing state with ConfirmDialog: `ask(options)` opens it. */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  return {
    ask: (o: ConfirmOptions) => setOptions(o),
    dialog: <ConfirmDialog open={!!options} onClose={() => setOptions(null)} options={options} />,
  };
}
