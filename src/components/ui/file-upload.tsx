"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { FileText, ImageIcon, RefreshCw, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileMeta } from "@/lib/types";
import { attachTransientFile, removeTransientFile, useTransientFile } from "@/lib/store/transient-files";
import { checkFileSignature, FILE_RULES, formatBytes, validateFileBasics, type FileKind } from "@/lib/validation";

type Phase = { name: "idle" } | { name: "checking"; file: File; progress: number } | { name: "error"; message: string };

/** Reads the file locally (with real progress events) and returns its first bytes for signature checking. */
function readLocally(file: File, onProgress: (pct: number) => void): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer, 0, Math.min(16, (reader.result as ArrayBuffer).byteLength)));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Resume / photo picker with validation (type, extension, size and file signature),
 * progress, preview, replace and remove.
 *
 * Files are held in memory for this tab only (lib/store/transient-files.ts). Nothing is
 * uploaded or written to localStorage; the parent receives metadata only.
 */
export function FileUpload({
  kind,
  label,
  optional,
  value,
  onChange,
  error,
}: {
  kind: FileKind;
  label: string;
  optional?: boolean;
  value: FileMeta | undefined;
  onChange: (meta: FileMeta | undefined) => void;
  error?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [dragging, setDragging] = useState(false);
  const held = useTransientFile(kind);
  const rule = FILE_RULES[kind];
  const ready = value && held && phase.name !== "checking";
  const message = phase.name === "error" ? phase.message : error;

  const accept = async (file: File | undefined) => {
    if (!file) return;
    const basic = validateFileBasics(kind, file);
    if (basic) {
      setPhase({ name: "error", message: basic });
      return;
    }
    setPhase({ name: "checking", file, progress: 0 });
    try {
      const head = await readLocally(file, (p) => setPhase((cur) => (cur.name === "checking" ? { ...cur, progress: p } : cur)));
      const sig = checkFileSignature(kind, head);
      if (sig) {
        setPhase({ name: "error", message: sig });
        return;
      }
      // Let the bar finish visibly before swapping to the ready state.
      setPhase({ name: "checking", file, progress: 100 });
      await new Promise((r) => setTimeout(r, 250));
      attachTransientFile(kind, file);
      onChange({ name: file.name, size: file.size, type: file.type || rule.types[0], addedAt: new Date().toISOString(), storage: "session" });
      setPhase({ name: "idle" });
    } catch {
      setPhase({ name: "error", message: "This file couldn’t be read. Try choosing it again." });
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  const remove = () => {
    removeTransientFile(kind);
    onChange(undefined);
    setPhase({ name: "idle" });
  };

  const Icon = kind === "resume" ? FileText : ImageIcon;
  const describedBy = message ? `${id}-error` : `${id}-hint`;

  return (
    <div className="flex flex-col gap-1.5" data-testid={`upload-${kind}`}>
      <label htmlFor={id} className="text-ui font-medium text-charcoal">
        {label}
        {optional && <span className="ml-1.5 font-normal text-mute">optional</span>}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={[...rule.extensions, ...rule.types].join(",")}
        className="sr-only"
        aria-invalid={!!message}
        aria-describedby={describedBy}
        onChange={(e) => accept(e.target.files?.[0])}
      />

      <AnimatePresence mode="wait" initial={false}>
        {ready ? (
          <motion.div key="ready" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="flex items-center gap-3 rounded-md border border-line-strong bg-paper p-3">
            {kind === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={held.url} alt="Selected profile photo" className="h-12 w-12 shrink-0 rounded-full border border-line object-cover" />
            ) : (
              <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xs border border-line bg-surface">
                <span className="font-mono text-[0.6rem] font-medium text-sub">PDF</span>
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-ui font-medium text-ink" title={value.name}>
                {value.name}
              </p>
              <p className="text-meta text-sub">
                {formatBytes(value.size)} · <span className="text-positive-ink">Ready</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => input.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-meta text-charcoal hover:bg-surface" aria-label={`Replace ${label.toLowerCase()}`}>
                <RefreshCw size={14} aria-hidden /> <span className="hidden sm:inline">Replace</span>
              </button>
              <button type="button" onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-meta text-charcoal hover:bg-surface" aria-label={`Remove ${label.toLowerCase()}`}>
                <Trash2 size={14} aria-hidden /> <span className="hidden sm:inline">Remove</span>
              </button>
            </div>
          </motion.div>
        ) : phase.name === "checking" ? (
          <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-md border border-line-strong bg-paper p-3" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-meta">
              <span className="min-w-0 truncate text-charcoal">{phase.file.name}</span>
              <span className="shrink-0 font-mono text-micro text-sub">Checking · {phase.progress}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out" style={{ width: `${Math.max(6, phase.progress)}%` }} />
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="idle"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files?.[0]);
            }}
            aria-describedby={describedBy}
            className={cn(
              "group flex w-full items-center gap-3 rounded-md border border-dashed p-4 text-left transition-colors",
              dragging ? "border-accent bg-accent-wash" : message ? "border-danger" : "border-line-strong hover:border-ink",
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-sub transition-colors group-hover:text-ink">
              {dragging ? <Upload size={18} aria-hidden /> : <Icon size={18} aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block text-ui font-medium text-ink">Choose a file or drag it here</span>
              <span className="block text-meta text-sub">
                {rule.label} · up to {formatBytes(rule.maxBytes)}
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {message ? (
        <p id={`${id}-error`} role="alert" className="text-meta text-danger">
          {message}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-meta text-mute">
          Kept in this browser tab only until secure upload is available — it isn’t saved or sent anywhere.
        </p>
      )}
    </div>
  );
}
