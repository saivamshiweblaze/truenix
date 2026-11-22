/**
 * Paging contract for admin tables.
 *
 * Every admin list goes through `queryRecords` with the same request shape a server endpoint
 * would accept (search, filters, sort, page, pageSize) and returns one page plus the total.
 * In Phase 1 it runs over in-memory arrays. In Phase 2, replace the call with
 * `GET /api/admin/<collection>?q=&sort=&dir=&page=&pageSize=&<filter>=` and keep the UI as is;
 * the UI never renders more than one page of rows.
 */

export type SortDir = "asc" | "desc";

export interface QueryRequest {
  q: string;
  filters: Record<string, string>;
  sort: string | null;
  dir: SortDir;
  page: number;
  pageSize: number;
}

export interface QueryResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
}

export interface QuerySpec<T> {
  /** Text fields searched by `q`. */
  search: (row: T) => (string | undefined | null)[];
  /** Filter id → predicate. A filter value of "all" or "" is ignored. */
  filters?: Record<string, (row: T, value: string) => boolean>;
  /** Sort id → comparable value. */
  sorters?: Record<string, (row: T) => string | number>;
}

export const PAGE_SIZES = [10, 25, 50];

export function queryRecords<T>(rows: T[], spec: QuerySpec<T>, req: QueryRequest): QueryResult<T> {
  const q = req.q.trim().toLowerCase();
  let out = rows;
  if (q) out = out.filter((r) => spec.search(r).some((f) => f?.toLowerCase().includes(q)));
  for (const [key, value] of Object.entries(req.filters)) {
    const fn = spec.filters?.[key];
    if (fn && value && value !== "all") out = out.filter((r) => fn(r, value));
  }
  const sorter = req.sort ? spec.sorters?.[req.sort] : undefined;
  if (sorter) {
    const dir = req.dir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const x = sorter(a);
      const y = sorter(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }
  const total = out.length;
  const pageCount = Math.max(1, Math.ceil(total / req.pageSize));
  const page = Math.min(Math.max(1, req.page), pageCount);
  return { rows: out.slice((page - 1) * req.pageSize, page * req.pageSize), total, page, pageCount };
}

/** Every row matching search and filters (unpaged), for exports and bulk selection. */
export function queryAll<T>(rows: T[], spec: QuerySpec<T>, req: QueryRequest): T[] {
  return queryRecords(rows, spec, { ...req, page: 1, pageSize: Number.MAX_SAFE_INTEGER }).rows;
}
