"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

/**
 * Tabs for record pages (Overview, Details, Activity, Related…). The active tab lives in the
 * URL (?tab=) so it can be linked to and survives reloads.
 */
export function useTabParam<T extends string>(values: readonly T[], fallback: T): [T, (v: T) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("tab") as T | null;
  const value = raw && values.includes(raw) ? raw : fallback;
  const set = (v: T) => {
    const next = new URLSearchParams(params.toString());
    if (v === fallback) next.delete("tab");
    else next.set("tab", v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return [value, set];
}

export function RecordTabs<T extends string>({ items, value, onChange, label }: { items: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return <Tabs label={label} value={value} onChange={onChange} items={items} className="mb-6" />;
}
