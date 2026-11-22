import { statusMeta, type StatusTone } from "@/lib/admin/lifecycle";
import { cn } from "@/lib/utils";

const TEXT: Record<StatusTone, string> = {
  ink: "text-charcoal",
  mute: "text-mute",
  positive: "text-positive-ink",
  attention: "text-caution",
  danger: "text-danger",
  accent: "text-accent-text",
};
const DOT: Record<StatusTone, string> = {
  ink: "bg-ink",
  mute: "border border-line-strong bg-paper",
  positive: "bg-positive",
  attention: "bg-caution",
  danger: "bg-danger",
  accent: "bg-accent",
};

/** One status vocabulary for every admin table (see lib/admin/lifecycle.ts). */
export function AdminStatus({ value, label, className }: { value: string; label?: string; className?: string }) {
  const m = statusMeta(value);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-meta", TEXT[m.tone], className)}>
      <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", DOT[m.tone])} />
      {label ?? m.label}
    </span>
  );
}

/** Small square-cornered marker for flags such as "Featured", "Sample" or "Private". */
export function Flag({ children, tone = "neutral", title }: { children: React.ReactNode; tone?: "neutral" | "accent" | "caution"; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-xs border px-1.5 text-[0.6875rem] font-medium",
        tone === "accent" ? "border-accent/40 text-accent-text" : tone === "caution" ? "border-caution/40 text-caution" : "border-line-strong text-sub",
      )}
    >
      {children}
    </span>
  );
}
