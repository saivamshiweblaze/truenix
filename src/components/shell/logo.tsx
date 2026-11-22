import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * TRUEVIX mark: a crossbar (the T) over a V that narrows to a single node —
 * many observations converging on one validated point. Original artwork; the
 * node is the only chromatic detail: a petrol tint that reads on the ink tile
 * (and full petrol on the inverted, white tile).
 */
export function LogoMark({ size = 24, inverted = false, className }: { size?: number; inverted?: boolean; className?: string }) {
  const bg = inverted ? "#ffffff" : "var(--color-ink)";
  const fg = inverted ? "var(--color-ink)" : "#ffffff";
  return (
    <svg aria-hidden viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect width="32" height="32" rx="8" fill={bg} />
      <path d="M8 9.5h16" stroke={fg} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11.2 13.6 16 21.2l4.8-7.6" fill="none" stroke={fg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="25" r="2.3" fill={inverted ? "var(--color-accent)" : "var(--color-accent-on-dark)"} />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display text-[1rem] font-extrabold tracking-[0.16em] text-ink", className)}>{brand.productName}</span>;
}

/**
 * Product logo. Links to the product home only — the Weblaze attribution is a
 * separate, explicit link (see WeblazeAttribution) so the two identities stay distinct.
 */
export function Logo({ href = "/", showSignature = false, className }: { href?: string; showSignature?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${brand.productName} home`}>
      <LogoMark size={26} className="transition-transform duration-300 ease-out group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <Wordmark />
        {showSignature && <span className="mt-1 hidden whitespace-nowrap font-mono sm:block text-[0.59rem] uppercase tracking-[0.08em] text-mute">by {brand.parentCompany}</span>}
      </span>
    </Link>
  );
}

/**
 * "Powered by Weblaze Technologies" — only the company name is a link, and it
 * opens the official Weblaze website in a new tab.
 */
export function WeblazeAttribution({ prefix = brand.poweredByPrefix, className, linkClassName }: { prefix?: string; className?: string; linkClassName?: string }) {
  return (
    <span className={className}>
      {prefix}{" "}
      <a
        href={brand.parentCompanyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink", linkClassName)}
      >
        {brand.parentCompany}
        <span className="sr-only"> (opens weblaze.in in a new tab)</span>
      </a>
    </span>
  );
}
