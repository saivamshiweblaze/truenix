"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Single-series monochrome charts. One hue (ink), no legend (the heading names the series),
 * values in text tokens, a hover tooltip on every mark, and a table view for screen readers.
 */

function SrTable({ caption, rows, unit }: { caption: string; rows: { label: string; value: number }[]; unit: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col">{unit}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HBarChart({ caption, rows, unit }: { caption: string; rows: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <figure>
      <SrTable caption={caption} rows={rows} unit={unit} />
      <ul aria-hidden className="flex flex-col gap-[2px]">
        {rows.map((r) => (
          <li key={r.label} className="group grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_40px] items-center gap-3 py-1.5" title={`${r.label}: ${r.value} ${unit}`}>
            <span className="truncate text-meta text-sub group-hover:text-ink">{r.label}</span>
            <span className="relative h-2.5">
              <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-ink transition-opacity group-hover:opacity-80" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="text-right text-meta text-charcoal tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function ColumnChart({ caption, labels, values, unit }: { caption: string; labels: string[]; values: number[]; unit: string }) {
  const max = Math.max(...values, 1);
  const [hover, setHover] = useState<number | null>(null);
  const rows = labels.map((label, i) => ({ label, value: values[i] }));
  return (
    <figure>
      <SrTable caption={caption} rows={rows} unit={unit} />
      <div aria-hidden className="relative">
        <div className="flex h-36 items-end gap-[2px] border-b border-line-strong">
          {values.map((v, i) => (
            <div key={labels[i]} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div
                className={cn("w-full max-w-7 rounded-t-[4px] transition-colors", i === values.length - 1 ? "bg-ink" : hover === i ? "bg-charcoal" : "bg-line-strong")}
                style={{ height: `${(v / max) * 100}%` }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-micro text-white shadow-overlay">
                  {labels[i]}: {v} {unit}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-[2px]">
          {labels.map((l, i) => (
            <span
              key={l}
              className={cn(
                "flex-1 text-center text-micro text-mute",
                // Many columns on a phone: label every other one (always the latest) on one line, so they don't wrap and crowd.
                labels.length > 6 && "max-sm:whitespace-nowrap",
                labels.length > 6 && (labels.length - 1 - i) % 2 === 1 && "max-sm:invisible",
              )}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
