"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const noopSubscribe = () => () => {};
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- Dialog ---------------- */

function useFocusTrap(open: boolean, ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])') ?? []);
    const t = setTimeout(() => (focusables()[0] ?? node)?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, ref, onClose]);
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, ref, onClose);
  const mounted = useIsClient();
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg bg-paper shadow-overlay sm:rounded-lg",
              size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl",
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
              <div>
                <h2 id={titleId} className="text-section font-semibold text-ink">
                  {title}
                </h2>
                {description && <div className="mt-1 text-ui text-sub">{description}</div>}
              </div>
              <button onClick={onClose} aria-label="Close dialog" className="-mr-2 rounded-sm p-1.5 text-sub transition-colors hover:bg-surface hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-6 py-3.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------------- Dropdown menu ---------------- */

export function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

export function Menu({
  trigger,
  children,
  align = "end",
  side = "bottom",
  label,
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? items[(i + 1) % items.length] : items[(i - 1 + items.length) % items.length];
    next?.focus();
  };

  return (
    <div ref={ref} className={cn("relative", className)} onKeyDown={onKeyDown}>
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: side === "bottom" ? -4 : 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "bottom" ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{ transformOrigin: `${side === "bottom" ? "top" : "bottom"} ${align === "end" ? "right" : "left"}` }}
            className={cn(
              "absolute z-50 min-w-56 rounded-md border border-line bg-paper p-1 shadow-overlay",
              align === "end" ? "right-0" : "left-0",
              side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
            )}
          >
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ onSelect, children, active, icon }: { onSelect: () => void; children: ReactNode; active?: boolean; icon?: ReactNode }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-ui text-charcoal outline-none transition-colors hover:bg-surface hover:text-ink focus-visible:bg-surface focus-visible:outline-none",
        active && "font-medium text-ink",
      )}
    >
      {icon && <span className="text-sub">{icon}</span>}
      <span className="flex-1">{children}</span>
      {active && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pb-1 pt-2 text-micro text-mute">{children}</div>;
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-line" />;
}
