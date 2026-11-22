"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { InlineSelect } from "@/components/ui/field";
import { EmptyState, SearchInput, ToolbarFilters } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/admin/csv";
import { PAGE_SIZES, queryAll, queryRecords, type QueryRequest, type QuerySpec, type SortDir } from "@/lib/admin/query";
import { adminRecordExport } from "@/lib/store/admin-actions";
import { cn } from "@/lib/utils";
import { useCan } from "./can";
import type { AdminModuleId } from "@/lib/types";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. */
  sort?: (row: T) => string | number;
  /** Value for CSV export. Omit to leave the column out of exports. */
  csv?: (row: T) => unknown;
  className?: string;
  /** The column shown as the card title on small screens. */
  primary?: boolean;
  hideOnMobile?: boolean;
}

export interface FilterDef<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  test: (row: T, value: string) => boolean;
}

export interface DataTableProps<T> {
  label: string;
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  search: (row: T) => (string | undefined | null)[];
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  initialFilters?: Record<string, string>;
  initialSort?: { id: string; dir: SortDir };
  rowHref?: (row: T) => string;
  /** Bulk actions for the selected ids. Return null to hide. */
  bulk?: (ids: string[], clear: () => void) => ReactNode;
  /** CSV export file name; requires the export permission on `module`. */
  exportName?: string;
  module: AdminModuleId;
  emptyTitle?: string;
  emptyBody?: string;
  toolbarExtra?: ReactNode;
  pageSize?: number;
}

/**
 * Admin data table: search, filters, sortable columns, paging, selection with bulk actions
 * and CSV export. Rows go through `queryRecords` (the future server-query boundary), so only
 * one page is ever rendered. Below the md breakpoint each row becomes a compact card.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const { label, rows, columns, getId, filters = [], rowHref, bulk, exportName, module } = props;
  const can = useCan();
  const [req, setReq] = useState<QueryRequest>({
    q: "",
    filters: { ...Object.fromEntries(filters.map((f) => [f.id, "all"])), ...props.initialFilters },
    sort: props.initialSort?.id ?? null,
    dir: props.initialSort?.dir ?? "desc",
    page: 1,
    pageSize: props.pageSize ?? 10,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const spec: QuerySpec<T> = useMemo(
    () => ({
      search: props.search,
      filters: Object.fromEntries(filters.map((f) => [f.id, f.test])),
      sorters: Object.fromEntries(columns.filter((c) => c.sort).map((c) => [c.id, c.sort!])),
    }),
    [props.search, filters, columns],
  );
  const result = queryRecords(rows, spec, req);
  const set = (patch: Partial<QueryRequest>) => setReq((r) => ({ ...r, page: 1, ...patch }));
  const clear = () => setSelected(new Set());
  const pageIds = result.rows.map(getId);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const matchingIds = () => queryAll(rows, spec, req).map(getId);
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const filtered = req.q || Object.values(req.filters).some((v) => v && v !== "all");

  const toggleSort = (id: string) =>
    setReq((r) => (r.sort === id ? { ...r, dir: r.dir === "asc" ? "desc" : "asc" } : { ...r, sort: id, dir: "asc" }));

  const exportCsv = () => {
    const data = queryAll(rows, spec, req);
    const cols = columns.filter((c) => c.csv);
    downloadCsv(`${exportName}-${new Date().toISOString().slice(0, 10)}`, cols.map((c) => c.header), data.map((r) => cols.map((c) => c.csv!(r))));
    adminRecordExport(`${label} (CSV)`, data.length);
    toast(`Exported ${data.length} ${data.length === 1 ? "row" : "rows"}`, { body: "The file was created in your browser. The export is recorded in the audit log." });
  };

  const check = (id: string) =>
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const cellLink = (row: T, content: ReactNode) => (rowHref ? <Link href={rowHref(row)} className="font-medium text-ink underline-offset-4 hover:underline">{content}</Link> : content);

  return (
    <section aria-label={label}>
      <div className="flex flex-col gap-2 rounded-md bg-surface p-2">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput fluid className="min-w-[12rem]" value={req.q} onChange={(q) => set({ q })} placeholder={props.searchPlaceholder ?? "Search"} label={`Search ${label.toLowerCase()}`} />
          {(props.toolbarExtra || exportName) && (
            <div className="flex shrink-0 items-center gap-2">
              {props.toolbarExtra}
              {exportName && (
                <Button variant="secondary" size="sm" className="h-10" onClick={exportCsv} disabled={!can(module, "export") || result.total === 0} title={can(module, "export") ? undefined : "Your role cannot export"}>
                  <Download size={15} aria-hidden /> Export CSV
                </Button>
              )}
            </div>
          )}
        </div>
        {filters.length > 0 && (
          <ToolbarFilters>
            {filters.map((f) => (
              <InlineSelect
                key={f.id}
                aria-label={f.label}
                value={req.filters[f.id] ?? "all"}
                onChange={(e) => set({ filters: { ...req.filters, [f.id]: e.target.value } })}
                options={[{ value: "all", label: `${f.label}: all` }, ...f.options]}
              />
            ))}
          </ToolbarFilters>
        )}
      </div>

      <div className="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <p className="text-meta text-sub" aria-live="polite">
          {result.total} {result.total === 1 ? "record" : "records"}
          {filtered ? " match" : ""}
          {filtered && (
            <button type="button" className="ml-2 text-sub underline underline-offset-4 hover:text-ink" onClick={() => set({ q: "", filters: Object.fromEntries(filters.map((f) => [f.id, "all"])) })}>
              Clear filters
            </button>
          )}
        </p>
        {bulk && selected.size > 0 && (
          <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 rounded-sm bg-accent-wash px-2 py-1">
            <span className="px-1 text-meta font-medium text-ink">{selected.size} selected</span>
            {selected.size < result.total && (
              <button type="button" className="text-meta text-sub underline underline-offset-4 hover:text-ink" onClick={() => setSelected(new Set(matchingIds()))}>
                Select all {result.total}
              </button>
            )}
            {bulk([...selected], clear)}
            <button type="button" className="text-meta text-sub hover:text-ink" onClick={clear}>
              Clear
            </button>
          </div>
        )}
      </div>

      {result.total === 0 ? (
        <div className="mt-2">
          <EmptyState compact title={props.emptyTitle ?? (filtered ? "No records match" : "Nothing here yet")} body={props.emptyBody ?? (filtered ? "Try a broader search or clear the filters." : "Records you create will appear here.")} />
        </div>
      ) : (
        <>
          {/* Table from md up */}
          <div className="mt-1 hidden overflow-x-auto rounded-md border border-line md:block">
            <table className="w-full text-left text-ui">
              <caption className="sr-only">{label}</caption>
              <thead className="bg-surface">
                <tr className="border-b border-line">
                  {bulk && (
                    <th scope="col" className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label="Select all rows on this page"
                        checked={allOnPage}
                        onChange={() => setSelected((cur) => (allOnPage ? new Set([...cur].filter((id) => !pageIds.includes(id))) : new Set([...cur, ...pageIds])))}
                        className="h-4 w-4 accent-[var(--color-ink)]"
                      />
                    </th>
                  )}
                  {columns.map((c) => {
                    const active = req.sort === c.id;
                    return (
                      <th key={c.id} scope="col" aria-sort={active ? (req.dir === "asc" ? "ascending" : "descending") : undefined} className={cn("whitespace-nowrap px-3 py-2 text-meta font-medium text-sub", c.className)}>
                        {c.sort ? (
                          <button type="button" onClick={() => toggleSort(c.id)} className="inline-flex items-center gap-1 hover:text-ink">
                            {c.header}
                            {active ? req.dir === "asc" ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden /> : <ArrowUpDown size={13} aria-hidden className="text-mute" />}
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => {
                  const id = getId(row);
                  return (
                    <tr key={id} className={cn("border-b border-line last:border-b-0 hover:bg-canvas", selected.has(id) && "bg-accent-wash/60")}>
                      {bulk && (
                        <td className="px-3 py-2.5 align-top">
                          <input type="checkbox" aria-label={`Select row ${id}`} checked={selected.has(id)} onChange={() => check(id)} className="mt-0.5 h-4 w-4 accent-[var(--color-ink)]" />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td key={c.id} className={cn("px-3 py-2.5 align-top", c.className)}>
                          {c === primary ? cellLink(row, c.cell(row)) : c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards below md */}
          <ul className="mt-1 flex flex-col gap-2 md:hidden">
            {result.rows.map((row) => {
              const id = getId(row);
              return (
                <li key={id} className={cn("rounded-md border border-line p-3", selected.has(id) && "border-accent bg-accent-wash/40")}>
                  <div className="flex items-start gap-3">
                    {bulk && <input type="checkbox" aria-label={`Select row ${id}`} checked={selected.has(id)} onChange={() => check(id)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-ink)]" />}
                    <div className="min-w-0 flex-1 text-ui">{cellLink(row, primary.cell(row))}</div>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {columns
                      .filter((c) => c !== primary && !c.hideOnMobile)
                      .map((c) => (
                        <div key={c.id} className="min-w-0">
                          <dt className="text-micro text-mute">{c.header}</dt>
                          <dd className="min-w-0 break-words text-meta text-charcoal">{c.cell(row)}</dd>
                        </div>
                      ))}
                  </dl>
                </li>
              );
            })}
          </ul>

          <nav aria-label={`${label} pages`} className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-meta text-sub">
              Showing {(result.page - 1) * req.pageSize + 1}–{Math.min(result.page * req.pageSize, result.total)} of {result.total}
            </p>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-meta text-sub">
                Rows
                <select aria-label="Rows per page" value={String(req.pageSize)} onChange={(e) => set({ pageSize: Number(e.target.value) })} className="h-8 rounded-sm border border-line-strong bg-paper px-2 text-meta text-ink focus:border-ink">
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="secondary" size="sm" aria-label="Previous page" disabled={result.page <= 1} onClick={() => setReq((r) => ({ ...r, page: result.page - 1 }))}>
                <ChevronLeft size={15} aria-hidden />
              </Button>
              <span className="text-meta tabular-nums text-sub">
                {result.page} / {result.pageCount}
              </span>
              <Button variant="secondary" size="sm" aria-label="Next page" disabled={result.page >= result.pageCount} onClick={() => setReq((r) => ({ ...r, page: result.page + 1 }))}>
                <ChevronRight size={15} aria-hidden />
              </Button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
