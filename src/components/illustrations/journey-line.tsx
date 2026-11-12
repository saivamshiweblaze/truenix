"use client";

import { motion } from "motion/react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The product's signature element: the Discover → Build journey as one hairline.
 * Used as a position marker (dashboard, onboarding, idea pages).
 */
export function JourneyLine({ current, className, compact = false, animate = true }: { current: number; className?: string; compact?: boolean; animate?: boolean }) {
  const steps = brand.journey;
  const pct = (current / (steps.length - 1)) * 100;
  return (
    <div className={cn("w-full", className)}>
      <p className="sr-only">
        Journey position: {steps[current]}, step {current + 1} of {steps.length}
      </p>
      <div aria-hidden className="relative h-3">
        <div className="absolute inset-x-[6px] top-1/2 h-px -translate-y-1/2 bg-line-strong" />
        <motion.div
          className="absolute left-[6px] top-1/2 h-px -translate-y-1/2 bg-ink"
          initial={animate ? { width: 0 } : false}
          animate={{ width: `calc(${pct}% - ${(pct / 100) * 12}px)` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
        <div className="absolute inset-0 flex items-center justify-between">
          {steps.map((s, i) => (
            <motion.span
              key={s}
              initial={animate ? { scale: 0.4, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.25 }}
              className={cn(
                "block rounded-full",
                i === current ? "h-3 w-3 bg-accent ring-4 ring-accent-wash" : i < current ? "h-2 w-2 bg-ink" : "h-2 w-2 border border-line-strong bg-paper",
              )}
            />
          ))}
        </div>
      </div>
      {!compact && (
        <div aria-hidden className="mt-2.5 hidden justify-between text-micro sm:flex">
          {steps.map((s, i) => (
            <span key={s} className={cn("w-0 whitespace-nowrap", i === 0 ? "flex justify-start" : i === steps.length - 1 ? "flex justify-end" : "flex justify-center", i === current ? "font-medium text-ink" : "text-mute")}>
              {s}
            </span>
          ))}
        </div>
      )}
      {!compact && (
        <p aria-hidden className="mt-2 text-micro text-sub sm:hidden">
          <span className="font-medium text-ink">{steps[current]}</span> · step {current + 1} of {steps.length}
        </p>
      )}
    </div>
  );
}
