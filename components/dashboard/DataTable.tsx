'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: string[];
}

export default function DataTable({ data, columns }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set(columns.slice(0, 8)));
  const [showColPicker, setShowColPicker] = useState(false);
  const pageSize = 20;

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(v => v !== null && String(v).toLowerCase().includes(q))
    );
  }, [data, search]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const visibleCols = columns.filter(c => selectedCols.has(c));

  const toggleCol = (col: string) => {
    const next = new Set(selectedCols);
    if (next.has(col)) {
      if (next.size > 1) next.delete(col);
    } else {
      next.add(col);
    }
    setSelectedCols(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search all columns..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowColPicker(!showColPicker)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 hover:border-slate-600 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Columns ({selectedCols.size})
          </button>
          {showColPicker && (
            <div className="absolute top-full mt-2 right-0 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 min-w-48 max-h-64 overflow-y-auto">
              {columns.map(col => (
                <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCols.has(col)}
                    onChange={() => toggleCol(col)}
                    className="w-3.5 h-3.5 accent-cyan-500"
                  />
                  <span className="text-xs text-slate-300 truncate">{col}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80">
                {visibleCols.map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, i) => (
                <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/40 transition-colors">
                  {visibleCols.map(col => (
                    <td key={col} className="px-4 py-2.5 text-slate-300 text-xs max-w-[180px] truncate">
                      {row[col] === null || row[col] === undefined ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No matching records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {Math.min(page * pageSize + 1, filtered.length)}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length.toLocaleString()} rows
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-400 text-xs">
            {page + 1} / {pageCount || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
