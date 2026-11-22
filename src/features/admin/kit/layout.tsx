"use client";

import { useState, type ReactNode } from "react";
import { Eye, Lock } from "lucide-react";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { adminRecordSensitiveAccess } from "@/lib/store/admin-actions";

/** Page header for admin screens: title, one-line purpose, page-specific actions and a quiet meta line. */
export function AdminHeader({ title, description, actions, meta, flags }: { title: string; description?: ReactNode; actions?: ReactNode; meta?: ReactNode; flags?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-title font-bold text-ink">{title}</h1>
          {flags}
        </div>
        {description && <p className="mt-1 max-w-[70ch] text-meta text-sub md:text-ui">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-sub">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A titled block within a page. Not a card: a heading, an optional action and a rule. */
export function Block({ title, action, children, className, description, id }: { title: string; action?: ReactNode; children: ReactNode; className?: string; description?: ReactNode; id?: string }) {
  return (
    <section className={cn("min-w-0", className)} aria-labelledby={id}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <div>
          <h2 id={id} className="text-section font-bold text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-meta text-sub">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Marks private account information (not shown on the member's public profile). */
  private?: boolean;
  wide?: boolean;
}

/** Definition list in a responsive grid. Private fields carry a lock marker. */
export function Details({ items, cols = 2 }: { items: DetailItem[]; cols?: 2 | 3 }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2", cols === 3 && "lg:grid-cols-3")}>
      {items.map((it) => (
        <div key={it.label} className={cn("min-w-0", it.wide && "sm:col-span-2 lg:col-span-full")}>
          <dt className="flex items-center gap-1 text-micro text-mute">
            {it.label}
            {it.private && (
              <span className="inline-flex items-center gap-0.5 text-caution" title="Private account information. Not shown on the public profile.">
                <Lock size={11} aria-hidden /> Private
              </span>
            )}
          </dt>
          <dd className="mt-0.5 min-w-0 break-words text-ui text-ink">{it.value === undefined || it.value === null || it.value === "" ? <span className="text-mute">Not provided</span> : it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function mask(v: string) {
  if (v.includes("@")) {
    const [u, d] = v.split("@");
    return `${u.slice(0, 1)}•••@${d}`;
  }
  return v.length > 4 ? `${"•".repeat(Math.min(8, Math.max(3, v.length - 4)))}${v.slice(-2)}` : "•••";
}

/**
 * Masked private value. Revealing it is recorded in the audit log. The mask is a UI safeguard
 * only: in Phase 2 the server must return private fields solely to roles allowed to see them.
 */
export function PrivateValue({ value, entity, targetId, target, field }: { value?: string; entity: string; targetId: string; target: string; field: string }) {
  const [shown, setShown] = useState(false);
  if (!value) return <span className="text-mute">Not provided</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={shown ? "break-all" : "break-all font-mono text-meta text-sub"}>{shown ? value : mask(value)}</span>
      {!shown && (
        <button
          type="button"
          onClick={() => {
            adminRecordSensitiveAccess(entity, targetId, `${target} — ${field}`, "Revealed in admin portal");
            setShown(true);
          }}
          className="inline-flex items-center gap-1 rounded-xs text-meta text-sub underline underline-offset-4 hover:text-ink"
          aria-label={`Reveal ${field}`}
        >
          <Eye size={13} aria-hidden /> Reveal
        </button>
      )}
    </span>
  );
}

export function Timeline({ events, empty = "No activity recorded yet." }: { events: { id: string; at: string; by?: string; text: ReactNode }[]; empty?: string }) {
  if (!events.length) return <p className="text-meta text-sub">{empty}</p>;
  return (
    <ol className="relative ml-1 border-l border-line">
      {events.map((e) => (
        <li key={e.id} className="relative pb-4 pl-4 last:pb-0">
          <span aria-hidden className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full border border-line-strong bg-paper" />
          <p className="text-ui text-ink">{e.text}</p>
          <p className="text-micro text-mute">
            <time dateTime={e.at} title={formatDate(e.at)}>
              {timeAgo(e.at)}
            </time>
            {e.by ? ` · ${e.by}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Two-column form grid that collapses on small screens. */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>.wide]:md:col-span-2">{children}</div>;
}

/** Sticky save/cancel bar for edit forms. */
export function FormActions({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:-mx-0 md:px-0">
      <p className="text-meta text-mute">{note}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Compact metric for dashboards: label, value and an optional note on whether it is measured. */
export function Metric({ label, value, note, href }: { label: string; value: ReactNode; note?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="block text-meta text-sub">{label}</span>
      <span className="mt-1 block font-display text-[1.5rem] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</span>
      {note && <span className="mt-1 block text-micro text-mute">{note}</span>}
    </>
  );
  return href ? (
    <a href={href} className="block min-w-0 rounded-sm px-3 py-3 transition-colors hover:bg-surface">
      {body}
    </a>
  ) : (
    <div className="min-w-0 px-3 py-3">{body}</div>
  );
}

/** A row of metrics separated by hairlines, wrapping on small screens. */
export function MetricStrip({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 5 | 6 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-line overflow-hidden rounded-md border border-line bg-paper sm:divide-x [&>*]:border-b [&>*]:border-line",
        cols === 3 ? "sm:grid-cols-3" : cols === 5 ? "sm:grid-cols-3 lg:grid-cols-5" : cols === 6 ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}
