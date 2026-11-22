"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { useAppSnapshot } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { cmsFields } from "@/lib/store/selectors";
import { Logo, WeblazeAttribution } from "./logo";
import { ManagedLink, SiteNotices } from "./site-notices";

/** Footer resource links managed in Admin › Site content ("Label | /path" per line). */
function useFooterResources() {
  const { state } = useAppSnapshot();
  const raw = cmsFields(state, "footer-links")?.links ?? "";
  return raw
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter(([label, href]) => label && href)
    .slice(0, 6)
    .map(([label, href]) => ({ label, href }));
}

const PUBLIC_LINKS = [
  { href: "/#journey", label: "How it works" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/about", label: "About" },
];

export function PublicHeader() {
  const { state, hydrated } = useAppSnapshot();
  const pathname = usePathname();
  const signedIn = hydrated && state.signedIn && state.user;
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <SiteNotices />
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-8">
        <Logo showSignature />
        <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((l) => {
            const active = l.href === pathname;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative rounded-sm px-3 py-1.5 text-ui transition-colors", active ? "text-ink" : "text-sub hover:text-ink")}
              >
                {l.label}
                {active && <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-ink" />}
              </Link>
            );
          })}
        </nav>
        <nav aria-label="Account" className="flex items-center gap-1.5">
          {signedIn ? (
            <ButtonLink href="/home" size="sm">
              Open TRUEVIX
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap rounded-sm px-2.5 py-1.5 text-ui text-sub transition-colors hover:text-ink sm:px-3">
                Sign in
              </Link>
              <ButtonLink href="/register" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#journey", label: "How it works" },
      { href: "/#capabilities", label: "Capabilities" },
      { href: "/register", label: "Create an account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About TRUEVIX" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

export function PublicFooter() {
  const resources = useFooterResources();
  return (
    <footer className="border-t border-line bg-surface">
      <div className={cn("mx-auto grid max-w-[1200px] gap-10 px-4 py-14 md:px-8", resources.length ? "md:grid-cols-[1.4fr_1fr_1fr_1fr]" : "md:grid-cols-[1.4fr_1fr_1fr]")}>
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-meta leading-relaxed text-sub">{brand.description}</p>
          <p className="mt-5 text-meta text-sub">
            <WeblazeAttribution prefix={`${brand.productName} is a product of`} />.
          </p>
        </div>
        {FOOTER_COLUMNS.map((c) => (
          <div key={c.title}>
            <p className="eyebrow">{c.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ui text-charcoal transition-colors hover:text-ink hover:underline underline-offset-4">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {resources.length > 0 && (
          <div>
            <p className="eyebrow">Resources</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {resources.map((l) => (
                <li key={l.href + l.label}>
                  <ManagedLink href={l.href} className="text-ui text-charcoal transition-colors hover:text-ink hover:underline underline-offset-4">
                    {l.label}
                  </ManagedLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-5 text-micro text-mute md:flex-row md:justify-between md:px-8">
          <span>
            © {brand.copyrightYear} {brand.parentCompanyLegal}. All rights reserved.
          </span>
          <span>{brand.signature}</span>
        </div>
      </div>
    </footer>
  );
}
