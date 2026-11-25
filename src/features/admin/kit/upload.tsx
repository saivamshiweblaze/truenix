"use client";

import { useId, useRef, useState } from "react";
import { FileText, ImageIcon, RefreshCw, Trash2, Upload } from "lucide-react";
import type { FileMeta } from "@/lib/types";
import { attachTransientFile, removeTransientFile, useTransientFile } from "@/lib/store/transient-files";
import { checkFileSignature, FILE_RULES, formatBytes, validateFileBasics } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * Upload boundary for admin media (logos, banners, briefs, certificate templates).
 *
 * Phase 1 has no storage service, so files are validated (extension, MIME type, size and
 * content signature) and then held in memory for this tab only; records keep metadata alone.
 * Phase 2: implement `uploadAdminFile` against signed-URL object storage with server-side
 * type sniffing and malware scanning, and store the returned object key on the record.
 */
export async function uploadAdminFile(slot: string, file: File): Promise<FileMeta> {
  attachTransientFile(slot, file);
  return { name: file.name, size: file.size, type: file.type, addedAt: new Date().toISOString(), storage: "session" };
}

async function readHead(file: File) {
  const buf = await file.slice(0, 16).arrayBuffer();
  return new Uint8Array(buf);
}

function Preview({ slot, meta, kind }: { slot: string; meta: FileMeta; kind: "image" | "document" }) {
  const held = useTransientFile(slot);
  if (kind === "image" && held) {
    // Object URL from a file held in memory; next/image cannot optimise blob: URLs.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={held.url} alt={`Preview of ${meta.name}`} className="h-12 w-12 shrink-0 rounded-xs border border-line object-cover" />;
  }
  return (
    <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xs border border-line bg-surface text-sub">
      {kind === "image" ? <ImageIcon size={16} aria-hidden /> : <FileText size={16} aria-hidden />}
    </span>
  );
}

export function AdminFileField({
  kind,
  slot,
  label,
  value,
  onChange,
  multiple,
  hint,
}: {
  kind: "image" | "document";
  /** Unique key for the in-memory file, e.g. "opp:o-1:banner". */
  slot: string;
  label: string;
  value: FileMeta[];
  onChange: (files: FileMeta[]) => void;
  multiple?: boolean;
  hint?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rule = FILE_RULES[kind];
  const keyFor = (name: string) => `${slot}:${name}`;

  const accept = async (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []).slice(0, multiple ? 5 : 1);
    if (!files.length) return;
    setError(undefined);
    setBusy(true);
    try {
      const added: FileMeta[] = [];
      for (const file of files) {
        const basic = validateFileBasics(kind, file);
        if (basic) throw new Error(`${file.name}: ${basic}`);
        const sig = checkFileSignature(kind, await readHead(file));
        if (sig) throw new Error(`${file.name}: ${sig}`);
        added.push(await uploadAdminFile(keyFor(file.name), file));
      }
      if (!multiple) value.forEach((v) => removeTransientFile(keyFor(v.name)));
      onChange(multiple ? [...value.filter((v) => !added.some((a) => a.name === v.name)), ...added] : added);
    } catch (e) {
      setError(e instanceof Error ? e.message : "This file couldn’t be read.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = (name: string) => {
    removeTransientFile(keyFor(name));
    onChange(value.filter((v) => v.name !== name));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ui font-medium text-charcoal">
        {label}
        <span className="ml-1.5 font-normal text-mute">optional</span>
      </label>
      <input ref={input} id={id} type="file" multiple={multiple} accept={[...rule.extensions, ...rule.types].join(",")} className="sr-only" aria-describedby={`${id}-hint`} onChange={(e) => accept(e.target.files)} />
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((v) => (
            <li key={v.name} className="flex items-center gap-3 rounded-md border border-line-strong p-2.5">
              <Preview slot={keyFor(v.name)} meta={v} kind={kind} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-ui font-medium" title={v.name}>
                  {v.name}
                </p>
                <p className="text-micro text-mute">
                  {formatBytes(v.size)} · {v.storage === "session" ? "held in this tab only (metadata saved)" : "stored"}
                </p>
              </div>
              {!multiple && (
                <button type="button" onClick={() => input.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-meta text-charcoal hover:bg-surface" aria-label={`Replace ${v.name}`}>
                  <RefreshCw size={14} aria-hidden /> <span className="hidden sm:inline">Replace</span>
                </button>
              )}
              <button type="button" onClick={() => remove(v.name)} className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-meta text-charcoal hover:bg-surface" aria-label={`Remove ${v.name}`}>
                <Trash2 size={14} aria-hidden /> <span className="hidden sm:inline">Remove</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {(multiple || value.length === 0) && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files);
          }}
          disabled={busy}
          className={cn("flex w-full items-center gap-3 rounded-md border border-dashed p-3 text-left transition-colors", dragging ? "border-accent bg-accent-wash" : error ? "border-danger" : "border-line-strong hover:border-ink")}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-sub">
            <Upload size={16} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-ui font-medium text-ink">{busy ? "Checking file…" : "Choose a file or drag it here"}</span>
            <span className="block text-meta text-sub">
              {rule.label} · up to {formatBytes(rule.maxBytes)}
              {multiple ? " · up to 5 at a time" : ""}
            </span>
          </span>
        </button>
      )}
      {error ? (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-meta text-mute">
          {hint ?? "Admin file attachments aren’t stored yet. Only the file name, type and size are recorded."}
        </p>
      )}
    </div>
  );
}
