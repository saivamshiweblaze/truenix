"use client";

import Link from "next/link";
import { useAppSnapshot } from "@/lib/store/store";
import { siteBanner } from "@/lib/store/selectors";

/** Renders an admin-managed link safely: same-site paths via Link, https links in a new tab, anything else as text. */
export function ManagedLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  if (/^https:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={className}>
        {children}
      </a>
    );
  }
  return <span className={className}>{children}</span>;
}

/**
 * Maintenance notice and the site announcement banner, both managed in the admin portal.
 * Text is rendered as plain text; nothing from the store is injected as HTML.
 */
export function SiteNotices() {
  const { state, hydrated } = useAppSnapshot();
  if (!hydrated) return null;
  const maint = state.platform.config.maintenance;
  const banner = siteBanner(state);
  if (!maint.enabled && !banner) return null;
  return (
    <div className="flex flex-col">
      {maint.enabled && (
        <p role="status" className="bg-surface px-4 py-2 text-center text-meta text-caution">
          {maint.message}
        </p>
      )}
      {banner && (
        <p className="bg-ink px-4 py-2 text-center text-meta text-white">
          {banner.text}
          {banner.linkHref && banner.linkLabel && (
            <>
              {" "}
              <ManagedLink href={banner.linkHref} className="font-medium underline underline-offset-4">
                {banner.linkLabel}
              </ManagedLink>
            </>
          )}
        </p>
      )}
    </div>
  );
}
