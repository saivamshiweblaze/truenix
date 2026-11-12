import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 24, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" width={size} height={size}>
      <rect width="32" height="32" rx="7" fill={inverted ? "#fff" : "#000"} />
      <path d="M8 10h16M16 10v13" stroke={inverted ? "#000" : "#fff"} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="23" r="2.4" fill="var(--color-accent)" />
    </svg>
  );
}

export function Logo({ href = "/", showSignature = false, className }: { href?: string; showSignature?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${brand.productNameDisplay} home`}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[0.95rem] font-semibold tracking-[0.14em] text-ink">{brand.productName}</span>
        {showSignature && <span className="mt-1 text-[0.625rem] tracking-[0.02em] text-mute">{brand.poweredBy}</span>}
      </span>
    </Link>
  );
}
