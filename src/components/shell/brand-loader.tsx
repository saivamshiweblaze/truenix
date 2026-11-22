import { cn } from "@/lib/utils";

/**
 * TRUEVIX loading mark: the V strokes draw in and the node settles.
 * Pure CSS (see .loader-stroke / .loader-node in globals.css); static under reduced motion.
 */
export function BrandLoader({ label = "Loading", size = 36, className }: { label?: string; size?: number; className?: string }) {
  return (
    <div role="status" aria-label={label} className={cn("flex flex-col items-center gap-3", className)}>
      <svg aria-hidden viewBox="0 0 32 32" width={size} height={size}>
        <rect width="32" height="32" rx="8" fill="var(--color-ink)" />
        <path d="M8 9.5h16" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <path className="loader-stroke" d="M11.2 13.6 16 21.2l4.8-7.6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle className="loader-node" cx="16" cy="25" r="2.1" fill="var(--color-accent-on-dark)" />
      </svg>
      <span className="eyebrow">{label}</span>
    </div>
  );
}
