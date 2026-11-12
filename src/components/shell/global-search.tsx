"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Lightbulb, Search, Sparkles, UserRound } from "lucide-react";
import { useAppState } from "@/lib/store/store";
import { allPeople, opportunities, publicIdeas } from "@/lib/store/selectors";
import { matches, cn } from "@/lib/utils";
import { useDismiss } from "@/components/ui/overlay";

interface Suggestion {
  id: string;
  kind: "idea" | "person" | "opportunity";
  label: string;
  meta: string;
  href: string;
}

const ICON = { idea: Lightbulb, person: UserRound, opportunity: Sparkles };

export function useSuggestions(q: string, limit = 6): Suggestion[] {
  const s = useAppState();
  return useMemo(() => {
    if (q.trim().length < 2) return [];
    const ideas = publicIdeas(s)
      .filter((i) => matches(q, i.title, i.summary))
      .map<Suggestion>((i) => ({ id: i.id, kind: "idea", label: i.title.split(":")[0], meta: "Idea", href: `/ideas/${i.id}` }));
    const people = allPeople(s)
      .filter((p) => matches(q, p.name, p.headline, p.skills.join(" ")))
      .map<Suggestion>((p) => ({ id: p.id, kind: "person", label: p.name, meta: p.headline, href: `/people/${p.id}` }));
    const opps = opportunities(s)
      .filter((o) => matches(q, o.title, o.organisation))
      .map<Suggestion>((o) => ({ id: o.id, kind: "opportunity", label: o.title, meta: o.organisation, href: `/opportunities/${o.id}` }));
    return [...ideas.slice(0, 3), ...people.slice(0, 2), ...opps.slice(0, 2)].slice(0, limit);
  }, [q, s, limit]);
}

export function GlobalSearch({ className, autoFocus, onNavigate }: { className?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useSuggestions(q);
  useDismiss(open, () => setOpen(false), ref);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !target.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    onNavigate?.();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) go(results[active].href);
      else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="flex h-9 items-center gap-2 rounded-sm border border-line bg-surface px-3 transition-colors focus-within:border-ink focus-within:bg-paper">
        <Search size={15} className="shrink-0 text-sub" aria-hidden />
        <input
          ref={input}
          autoFocus={autoFocus}
          type="search"
          role="combobox"
          aria-expanded={open && q.length > 1}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search ideas, people and opportunities"
          placeholder="Search ideas, people, opportunities"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-ui text-ink placeholder:text-mute focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="hidden rounded-xs border border-line px-1.5 text-micro text-mute lg:inline">/</kbd>
      </div>
      <AnimatePresence>
        {open && q.trim().length > 1 && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-md border border-line bg-paper p-1 shadow-overlay"
          >
            {results.map((r, i) => {
              const Icon = ICON[r.kind];
              return (
                <li key={`${r.kind}-${r.id}`} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.href)}
                    className={cn("flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left", active === i && "bg-surface")}
                  >
                    <Icon size={15} className="shrink-0 text-sub" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ui text-ink">{r.label}</span>
                      <span className="block truncate text-micro text-mute">{r.meta}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            <li role="option" aria-selected={false}>
              <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left text-ui text-sub hover:bg-surface hover:text-ink">
                <Search size={15} aria-hidden /> See all results for “{q.trim()}”
              </button>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
