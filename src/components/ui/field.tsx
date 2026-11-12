"use client";

import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-sm border border-line-strong bg-paper px-3 text-ui text-ink placeholder:text-mute transition-colors duration-150 hover:border-sub focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ink/10 aria-[invalid=true]:border-accent-ink";

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  id: string;
  optional?: boolean;
  children: ReactNode;
}

export function FieldShell({ label, hint, error, id, optional, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ui font-medium text-charcoal">
        {label}
        {optional && <span className="ml-1.5 font-normal text-mute">optional</span>}
      </label>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="err"
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-meta text-accent-ink"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" id={`${id}-hint`} className="text-meta text-mute" initial={false}>
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string; optional?: boolean };

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField({ label, hint, error, optional, className, id, ...props }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fid} optional={optional}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={!!error}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cn(control, "h-10", className)}
        {...props}
      />
    </FieldShell>
  );
});

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode; error?: string; optional?: boolean };

export const TextArea = forwardRef<HTMLTextAreaElement, AreaProps>(function TextArea({ label, hint, error, optional, className, id, rows = 4, ...props }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fid} optional={optional}>
      <textarea
        ref={ref}
        id={fid}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cn(control, "resize-y py-2.5 leading-relaxed", className)}
        {...props}
      />
    </FieldShell>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: ReactNode; error?: string; options: { value: string; label: string }[] };

export function SelectField({ label, hint, error, options, className, id, ...props }: SelectProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fid}>
      <select id={fid} aria-invalid={!!error} className={cn(control, "h-10 appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8", selectArrow, className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

const selectArrow =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%235c5c5a' stroke-width='1.4'/%3E%3C/svg%3E\")]";

/** Compact select without label chrome, for toolbars. */
export function InlineSelect({ className, options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select className={cn(control, "h-9 w-auto appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8 text-meta", selectArrow, className)} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Multi-select chip. Square-cornered by design to avoid pill overload. */
export function ChoiceChip({ selected, onToggle, children, disabled }: { selected: boolean; onToggle: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-3 text-ui transition-colors duration-150 active:scale-[0.98] disabled:opacity-40",
        selected ? "border-ink bg-ink text-white" : "border-line-strong bg-paper text-charcoal hover:border-ink",
      )}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 14, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="inline-flex overflow-hidden">
            <Check size={14} strokeWidth={2.4} aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <div>
        <label htmlFor={id} className="text-ui font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-meta text-sub">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-ink" : "bg-line-strong")}
      >
        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 36 }} className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm", checked ? "right-0.5" : "left-0.5")} />
      </button>
    </div>
  );
}

export function RadioCard({ name, value, checked, onChange, title, description }: { name: string; value: string; checked: boolean; onChange: (v: string) => void; title: string; description: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-md border p-4 transition-colors duration-150",
        checked ? "border-ink bg-surface" : "border-line hover:border-line-strong",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="peer sr-only" />
      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink", checked ? "border-ink" : "border-line-strong")}>
        {checked && <motion.span layoutId={`radio-${name}`} className="h-2 w-2 rounded-full bg-accent" />}
      </span>
      <span>
        <span className="block text-ui font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-meta text-sub">{description}</span>
      </span>
    </label>
  );
}
