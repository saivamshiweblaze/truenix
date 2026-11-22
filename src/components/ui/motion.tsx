import type { CSSProperties, ReactNode } from "react";

/**
 * Section wrapper used across the public pages.
 *
 * Phase 1.6: scroll-triggered reveals were removed. Content is always visible; the only
 * orchestrated motion on public pages is the hero's single entrance sequence. The wrapper
 * keeps its API so sections can opt into a purposeful effect later without touching markup.
 */
export function Reveal({ children, className, as = "div", style }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" | "section"; style?: CSSProperties }) {
  const Tag = as;
  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  );
}
