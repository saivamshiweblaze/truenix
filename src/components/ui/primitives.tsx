import type { ReactNode } from "react";
import Link from "next/link";
import { cn, initials } from "@/lib/utils";

/** Monochrome avatar: initials on a tone derived from the name. No photos in Phase 1. */
const TONES = ["bg-ink text-white", "bg-charcoal text-white", "bg-sunken text-ink", "bg-line-strong text-ink", "bg-surface text-ink border border-line"];

export function Avatar({ name, size = 36, className, me }: { name: string; size?: number; className?: string; me?: boolean }) {
  const tone = TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      className={cn("relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium tracking-tight", tone, className)}
    >
      {initials(name)}
      {me && <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full border-2 border-paper bg-accent" />}
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

/** Marks seeded or locally generated demonstration content. */
export function DemoMark({ children = "Demo content", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-xs border border-dashed border-line-strong px-1.5 py-px text-micro text-sub", className)}
      title="Fictional demonstration data. Not a real person, organisation or result."
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = "ink", label }: { tone?: "ink" | "accent" | "mute"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-meta text-sub">
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", tone === "accent" ? "bg-accent" : tone === "mute" ? "bg-line-strong" : "bg-ink")} />
      {label}
    </span>
  );
}

export function PageHeader({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        {description && <p className="mt-2 text-body text-sub">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeading({ title, action, className, id }: { title: string; action?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-4", className)}>
      <h2 id={id} className="text-section font-semibold text-ink">
        {title}
      </h2>
      {action}
    </div>
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

export function EmptyState({ title, body, action, art }: { title: string; body: string; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-line-strong px-6 py-10 sm:items-center sm:text-center">
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
      <span className="text-[1.625rem] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</span>
      {note && <span className="text-micro text-mute">{note}</span>}
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-1 w-full overflow-hidden rounded-full bg-sunken">
      <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${v}%` }} />
    </div>
  );
}
