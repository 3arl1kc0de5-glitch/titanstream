import type React from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string;
  hideable?: boolean;
  mobile?: (item: T) => { label: string; value: React.ReactNode };
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  className?: string;
  mobileCard?: boolean;
  mobileCardRender?: (item: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, keyExtractor, onRowClick,
  searchable = false, searchPlaceholder = 'Search...',
  pageSize = 10, className = '',
  mobileCard = false, mobileCardRender,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = data.filter((item) => {
    if (!search) return true;
    return columns.some((col) => {
      const val = item[col.key];
      return val != null && String(val).toLowerCase().includes(search.toLowerCase());
    });
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null || bVal == null) return 0;
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className={`bg-card-bg rounded-xl overflow-hidden ${className}`}>
      {searchable && (
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={searchPlaceholder}
              className="w-full bg-control-bg/50 text-text-primary rounded-lg pl-9 pr-3 py-2.5 sm:py-2 text-sm border border-white/5 focus:border-usdt-green focus:outline-none placeholder:text-text-tertiary"
            />
          </div>
        </div>
      )}

      {/* Mobile card view */}
      {mobileCard && (
        <div className="sm:hidden divide-y divide-border/40">
          {paged.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-text-tertiary">No results found</div>
          ) : (
            paged.map((item) => (
              <div
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`px-4 py-3 ${onRowClick ? 'cursor-pointer active:bg-white/[0.03]' : ''}`}
              >
                {mobileCardRender ? (
                  mobileCardRender(item)
                ) : (
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-sm">
                    {columns.filter(c => c.mobile).map((col) => {
                      const m = col.mobile!(item);
                      return (
                        <div key={col.key}>
                          <span className="text-[10px] font-semibold text-text-tertiary uppercase block">{m.label}</span>
                          <span className="text-text-primary">{m.value}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className={`overflow-x-auto ${mobileCard ? 'hidden sm:block' : ''}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-3 py-3 ${col.sortable ? 'cursor-pointer hover:text-text-primary select-none' : ''} ${col.width || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-text-tertiary">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : <ChevronsUpDown size={14} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paged.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`hover:bg-white/[0.02] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3 text-sm text-text-primary whitespace-nowrap">
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-text-tertiary">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-border">
          <span className="text-xs text-text-tertiary">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 min-h-[32px] text-xs rounded-lg bg-control-bg text-text-primary disabled:opacity-40 hover:bg-white/10 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 min-h-[32px] text-xs rounded-lg bg-control-bg text-text-primary disabled:opacity-40 hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
