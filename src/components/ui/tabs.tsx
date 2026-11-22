"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

/** Underline tabs with a shared-layout indicator. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  const group = useId();
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = items[(i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    onChange(next.value);
    const el = (e.currentTarget.parentElement?.querySelector(`[data-value="${next.value}"]`) as HTMLElement) ?? null;
    el?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn("scrollbar-none -mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0", className)}>
      {items.map((it, i) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            type="button"
            data-value={it.value}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(it.value)}
            className={cn("relative shrink-0 pb-3 pt-1 text-ui transition-colors", active ? "font-medium text-ink" : "text-sub hover:text-ink")}
          >
            {it.label}
            {it.count !== undefined && <span className="ml-1.5 text-meta text-mute tabular-nums">{it.count}</span>}
            {active && <motion.span layoutId={`tab-${group}`} className="absolute inset-x-0 -bottom-px h-[2px] bg-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control for small mode switches. */
export function Segmented<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[]; label: string }) {
  const group = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-sm bg-surface p-0.5">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(it.value)}
            className={cn("relative h-8 rounded-[5px] px-3 text-meta transition-colors", active ? "text-ink" : "text-sub hover:text-ink")}
          >
            {active && <motion.span layoutId={`seg-${group}`} className="absolute inset-0 rounded-[5px] bg-paper shadow-[0_1px_2px_rgb(0_0_0/0.08)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Accordion({ title, children, open, onToggle, meta }: { title: ReactNode; children: ReactNode; open: boolean; onToggle: () => void; meta?: ReactNode }) {
  const id = useId();
  return (
    <div className="border-b border-line">
      <h3>
        <button type="button" id={`${id}-btn`} aria-expanded={open} aria-controls={id} onClick={onToggle} className="flex w-full items-center gap-3 py-4 text-left">
          <span className="flex-1 text-ui font-medium text-ink">{title}</span>
          {meta}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-sub">
            <ChevronDown size={16} />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            aria-labelledby={`${id}-btn`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
