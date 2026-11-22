"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollabArt, CompassArt, FlaskArt, LensArt } from "./art";

const EASE = [0.22, 1, 0.36, 1] as const;

const STATIONS = [
  { art: CompassArt, label: "Discover", note: "Problem found in grain stores", state: "done" },
  { art: LensArt, label: "Research", note: "Market and competitor plan", state: "done" },
  { art: FlaskArt, label: "Validate", note: "7 of 12 customer interviews", state: "active" },
  { art: CollabArt, label: "Build", note: "Looking for an embedded engineer", state: "next" },
] as const;

/**
 * Homepage hero: one idea moving along the TRUEVIX journey. The rail on the left shows the
 * stations; the sheet on the right is the idea itself. One orchestrated entrance — the rail
 * draws, then the evidence bar fills — and nothing moves afterwards. Decorative; hidden from
 * assistive technology (the hero copy says the same thing in words).
 */
export function HeroScene({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className={cn("relative w-full select-none", className)}>
      <div className="dot-grid absolute -inset-4 rounded-xl opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]" />
      <div className="relative grid gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-center">
        {/* Journey rail */}
        <ol className="relative flex flex-col gap-3">
          <motion.span
            className="absolute bottom-10 left-[39px] top-10 w-px origin-top bg-ink"
            initial={reduce ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
          />
          {STATIONS.map((st, i) => {
            const Art = st.art;
            return (
              <motion.li
                key={st.label}
                className="relative flex items-center gap-4"
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.25 + i * 0.18 }}
              >
                <span
                  className={cn(
                    "relative flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-paper",
                    st.state === "active" ? "border-ink shadow-lift" : st.state === "next" ? "border-dashed border-line-strong" : "border-line",
                  )}
                >
                  <Art size={58} />
                  {st.state === "done" && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                  {st.state === "active" && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-accent ring-2 ring-paper" />}
                </span>
                <span className="min-w-0">
                  <span className={cn("block font-display text-[1rem] font-bold tracking-tight", st.state === "next" ? "text-sub" : "text-ink")}>{st.label}</span>
                  <span className="block text-meta text-sub">{st.note}</span>
                </span>
              </motion.li>
            );
          })}
        </ol>

        {/* The idea */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          className="rounded-lg border border-line bg-paper p-5 shadow-lift sm:p-6"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-xs bg-ink px-2 py-0.5 text-micro font-medium text-white">Validating</span>
            <span className="text-micro text-sub">Agriculture</span>
          </div>
          <p className="mt-3 font-display text-[1.25rem] font-bold leading-snug tracking-tight text-ink">Moisture alerts for small grain stores</p>
          <dl className="mt-3 flex flex-col gap-1.5 text-meta">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-mute">Problem</dt>
              <dd className="text-charcoal">Stock lost to mould between hand checks</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-mute">Solution</dt>
              <dd className="text-charcoal">A low-cost probe that texts the owner</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-baseline justify-between text-meta">
              <span className="font-medium text-ink">Customer evidence</span>
              <span className="tabular-nums text-positive-ink">7 interviews</span>
            </div>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sunken">
              <motion.span
                className="block h-full rounded-full bg-positive"
                initial={reduce ? false : { width: "0%" }}
                animate={{ width: "58%" }}
                transition={{ duration: 1.2, ease: EASE, delay: 1.1 }}
              />
            </span>
            <ul className="mt-3 flex flex-wrap gap-1.5 text-micro">
              <li className="rounded-xs border border-dashed border-line-strong px-1.5 py-0.5 text-sub">3 assumptions</li>
              <li className="rounded-xs border border-dashed border-ink px-1.5 py-0.5 text-ink">2 AI analyses</li>
              <li className="rounded-xs border border-positive bg-positive-wash px-1.5 py-0.5 text-positive-ink">7 customer responses</li>
            </ul>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-sm bg-surface px-3 py-2.5">
            <span className="flex -space-x-1.5">
              {["bg-ink", "bg-charcoal", "bg-line-strong"].map((c) => (
                <span key={c} className={cn("h-6 w-6 rounded-full border-2 border-surface", c)} />
              ))}
            </span>
            <span className="text-micro text-sub">Team of 3 · needs embedded systems</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
