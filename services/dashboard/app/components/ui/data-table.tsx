"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { SearchInput } from "./search-input";

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  emptyMessage?: string;
}

type SortDir = "asc" | "desc" | null;

function toString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  return String(val);
}

export function DataTable<T extends object>({
  columns,
  data,
  searchable = false,
  searchKeys,
  pageSize = 10,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  /* ---- search ---- */
  const filtered = useMemo(() => {
    if (!query || !searchable) return data;
    const keys = searchKeys ?? columns.map((c) => c.key);
    const lower = query.toLowerCase();
    return data.filter((row) =>
      keys.some((k) => toString(row[k]).toLowerCase().includes(lower)),
    );
  }, [data, query, searchable, searchKeys, columns]);

  /* ---- sort ---- */
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = toString(a[sortKey]);
      const bVal = toString(b[sortKey]);
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  /* ---- pagination ---- */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = useCallback(
    (key: keyof T) => {
      setSortKey((prev) => {
        if (prev !== key) {
          setSortDir("asc");
          setPage(0);
          return key;
        }
        setSortDir((d) => {
          if (d === "asc") return "desc";
          if (d === "desc") return null;
          return "asc";
        });
        setPage(0);
        return key;
      });
    },
    [],
  );

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setPage(0);
  }, []);

  const SortIcon = ({ col }: { col: DataTableColumn<T> }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key || sortDir === null)
      return <ChevronsUpDown size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />;
    return sortDir === "asc" ? (
      <ArrowUp size={14} strokeWidth={1.5} className="text-[var(--accent)]" />
    ) : (
      <ArrowDown size={14} strokeWidth={1.5} className="text-[var(--accent)]" />
    );
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      {searchable && (
        <div className="p-[var(--space-md)] pb-0">
          <SearchInput onSearch={handleSearch} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-[var(--space-md)] py-[var(--space-sm)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] ${
                    col.sortable
                      ? "cursor-pointer select-none transition-colors hover:text-[var(--text-secondary)]"
                      : ""
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-[var(--space-md)] py-[var(--space-2xl)] text-center text-sm text-[var(--text-tertiary)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  className={`group border-b border-[var(--border-subtle)] transition-colors duration-[var(--duration-fast)] last:border-b-0 hover:bg-[var(--deep)] ${
                    i % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--elevated)]/40"
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-[var(--space-md)] py-[var(--space-sm)] text-[var(--text-primary)]"
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : toString(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border)] px-[var(--space-md)] py-[var(--space-sm)] text-sm text-[var(--text-secondary)]">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="carbon-button-secondary carbon-button text-xs disabled:cursor-not-allowed disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-xs text-[var(--text-tertiary)]">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="carbon-button-secondary carbon-button text-xs disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
