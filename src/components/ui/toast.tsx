"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";

interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone: "default" | "accent";
}

let items: ToastItem[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());
const EMPTY: ToastItem[] = [];

export function toast(title: string, opts: { body?: string; tone?: ToastItem["tone"]; duration?: number } = {}) {
  const id = ++seq;
  items = [...items, { id, title, body: opts.body, tone: opts.tone ?? "default" }].slice(-3);
  emit();
  setTimeout(() => dismiss(id), opts.duration ?? 3600);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => items,
    () => EMPTY,
  );
  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md bg-ink px-4 py-3 text-white shadow-overlay"
            role="status"
          >
            <span aria-hidden className={t.tone === "accent" ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60"} />
            <div className="flex-1">
              <p className="text-ui font-medium">{t.title}</p>
              {t.body && <p className="mt-0.5 text-meta text-white/70">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="-mr-1 rounded-xs p-0.5 text-white/60 hover:text-white">
              <X size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
