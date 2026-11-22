import type { ReactNode } from "react";
import Link from "next/link";
import { Search as SearchIcon, X as XIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/** Monochrome avatar: a photo when one is available, otherwise initials on a tone derived from the name. */
const TONES = ["bg-ink text-white", "bg-charcoal text-white", "bg-sunken text-ink", "bg-line-strong text-ink", "bg-surface text-ink border border-line"];

// `me` is accepted for call-site compatibility; the signed-in person is no longer marked with a colour dot.
export function Avatar({ name, size = 36, className, src }: { name: string; size?: number; className?: string; me?: boolean; src?: string }) {
  const tone = TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  if (src) {
    return (
      <span aria-hidden style={{ width: size, height: size }} className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-sunken", className)}>
        {/* Object URL from a file held in memory; next/image cannot optimise blob: URLs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      className={cn("relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium tracking-tight", tone, className)}
    >
      {initials(name)}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center text-meta text-sub", className)}>{children}</span>;
}

/** Inline list of tags separated by thin rules rather than pills. */
export function TagList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-sub", className)}>
      {items.map((t, i) => (
        <li key={t} className="flex items-center gap-2.5">
          {i > 0 && <span aria-hidden className="h-3 w-px bg-line-strong" />}
          {t}
        </li>
      ))}
    </ul>
  );
}

/**
 * Discreet marker for illustrative sample content. Use only where it changes what the
 * person would do next (e.g. an opportunity they might apply to, a contact they might message) —
 * not on every card.
 */
export function SampleMark({ children = "Sample", className, title = "Illustrative sample content. Not a real person, organisation or result." }: { children?: ReactNode; className?: string; title?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-xs border border-line px-1.5 py-px text-[0.6875rem] text-sub", className)} title={title}>
      {children}
    </span>
  );
}

/**
 * Status with a small marker.
 * - ink: neutral or active
 * - attention: time-sensitive, e.g. a deadline closing soon (caution)
 * - positive: genuinely positive states only (verified, validated, complete) — emerald
 * - mute: inactive, closed, not started
 */
export type StatusTone = "ink" | "attention" | "positive" | "mute";
export function StatusDot({ tone = "ink", label, className }: { tone?: StatusTone; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-meta", tone === "positive" ? "text-positive-ink" : tone === "attention" ? "text-caution" : tone === "mute" ? "text-mute" : "text-sub", className)}>
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          tone === "attention" ? "bg-caution" : tone === "positive" ? "bg-positive" : tone === "mute" ? "border border-line-strong bg-paper" : "bg-ink",
        )}
      />
      {label}
    </span>
  );
}

/**
 * Compact label for a kind or state. Monochrome by default.
 * `accent` marks a personal match (e.g. a skill you have) — use at most a few per screen;
 * `positive` is for verified or validated states only; `strong` for the one kind that matters most in a list.
 */
export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "strong" | "accent" | "positive" | "outline"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-xs px-2 text-micro font-medium",
        tone === "strong" && "border border-ink text-ink",
        tone === "accent" && "bg-accent-wash text-accent-text",
        tone === "positive" && "bg-positive-wash text-positive-ink",
        tone === "outline" && "border border-line-strong text-sub",
        tone === "neutral" && "bg-surface text-charcoal",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Level-1 page header: what the page is for and its main action, on one line on desktop.
 * The description stays short and quiet; `meta` holds a small summary (counts, status) under it.
 */
export function PageHeader({ title, description, actions, children, meta }: { title: string; description?: ReactNode; actions?: ReactNode; children?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-title font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-[62ch] text-meta text-sub md:text-ui">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-sub">{meta}</div>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Search and filter bar that sits directly under a page header or tabs. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2 rounded-md bg-surface p-2 lg:flex-row lg:items-center", className)}>{children}</div>;
}

/**
 * The filter selects inside a Toolbar. On phones they form one row that scrolls sideways
 * (so filters never take half the screen); from `sm` up they sit inline and wrap.
 */
export function ToolbarFilters({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      aria-label="Filters"
      className={cn("scrollbar-none -mx-2 flex gap-2 overflow-x-auto px-2 [&>select]:w-auto [&>select]:shrink-0 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0", className)}
    >
      {children}
    </div>
  );
}

/** Search input for toolbars, with a clear button. */
/** `fluid` makes the input share a row with other controls at every width (instead of stacking on small screens). */
export function SearchInput({ value, onChange, placeholder, label, className, fluid }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; className?: string; fluid?: boolean }) {
  return (
    <div className={cn("flex h-10 min-w-0 items-center gap-2 rounded-sm border border-line-strong bg-paper px-3 transition-colors focus-within:border-ink", fluid ? "flex-1" : "w-full flex-none lg:w-auto lg:min-w-[14rem] lg:flex-1", className)}>
      <SearchIcon size={16} className="shrink-0 text-sub" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className="h-full min-w-0 flex-1 bg-transparent text-ui placeholder:text-mute focus:outline-none" />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="rounded-xs p-1 text-mute hover:text-ink">
          <XIcon size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function SectionHeading({ title, action, className, id, count }: { title: string; action?: ReactNode; className?: string; id?: string; count?: number }) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-4", className)}>
      <h2 id={id} className="text-section font-bold text-ink">
        {title}
        {count !== undefined && <span className="ml-2 text-meta font-normal text-mute tabular-nums">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

/** Quiet "see all" style link used beside section headings. */
export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-meta font-medium text-sub underline-offset-4 transition-colors hover:text-ink hover:underline">
      {children}
    </Link>
  );
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("text-ui text-sub underline-offset-4 transition-colors hover:text-ink hover:underline", className)}>
      {children}
    </Link>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4 py-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="mt-6 flex flex-col gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action, art, compact }: { title: string; body: string; action?: ReactNode; art?: ReactNode; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-md border border-dashed border-line-strong bg-surface/40 px-6 sm:items-center sm:text-center", compact ? "py-6" : "py-10")}>
      {art}
      <h3 className="text-section font-semibold text-ink">{title}</h3>
      <p className="max-w-md text-ui text-sub">{body}</p>
      {action}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-meta text-sub">{label}</span>
      <span className="font-display text-[1.625rem] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</span>
      {note && <span className="text-micro text-mute">{note}</span>}
    </div>
  );
}

/**
 * Progress bar. `ink` for steps and tasks; `positive` only where progress reflects real
 * validation work; `accent` for the person's own journey position.
 */
export function Progress({ value, label, tone = "ink", size = "sm", className }: { value: number; label: string; tone?: "ink" | "positive" | "accent"; size?: "sm" | "md"; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("w-full overflow-hidden rounded-full", size === "md" ? "h-1.5" : "h-1", "bg-sunken", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tone === "positive" ? "bg-positive" : tone === "accent" ? "bg-accent" : "bg-ink")} style={{ width: `${v}%` }} />
    </div>
  );
}
