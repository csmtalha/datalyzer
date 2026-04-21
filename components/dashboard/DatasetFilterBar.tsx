'use client';

import { useMemo } from 'react';
import { Filter, RotateCcw, CalendarRange } from 'lucide-react';
import { uniqueOptionsForColumn } from '@/lib/dashboardFilters';

interface DatasetFilterBarProps {
  dimensions: string[];
  rawData: Record<string, unknown>[];
  filters: Record<string, string | null>;
  onFilterChange: (column: string, value: string | null) => void;
  onReset: () => void;
  dateColumn: string | null;
  dateMin: string | null;
  dateMax: string | null;
  onDateMinChange: (v: string | null) => void;
  onDateMaxChange: (v: string | null) => void;
  filteredCount: number;
  totalCount: number;
}

function formatDimLabel(name: string): string {
  return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

export default function DatasetFilterBar({
  dimensions,
  rawData,
  filters,
  onFilterChange,
  onReset,
  dateColumn,
  dateMin,
  dateMax,
  onDateMinChange,
  onDateMaxChange,
  filteredCount,
  totalCount,
}: DatasetFilterBarProps) {
  const optionLists = useMemo(() => {
    const lists: Record<string, string[]> = {};
    for (const col of dimensions) {
      lists[col] = uniqueOptionsForColumn(rawData, col, filters);
    }
    return lists;
  }, [dimensions, rawData, filters]);

  const activeCount = Object.values(filters).filter(v => v && v !== '__ALL__').length;
  const dateActive = Boolean(dateColumn && (dateMin || dateMax));
  const hasAny = dimensions.length > 0 || dateColumn;

  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 shadow-lg overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4 px-4 py-3.5">
        <div className="flex items-center gap-2 text-slate-400 shrink-0">
          <Filter className="w-4 h-4 text-cyan-500/80" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Slice data</span>
        </div>

        <div className="flex flex-wrap items-end gap-3 flex-1 min-w-0">
          {dimensions.map(col => {
            const options = optionLists[col] ?? [];
            const current = filters[col];
            const selectValue = current && current !== '__ALL__' ? current : '';

            return (
              <div key={col} className="flex flex-col gap-1 min-w-[140px] max-w-[200px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate" title={col}>
                  {formatDimLabel(col)}
                </label>
                <select
                  value={selectValue}
                  onChange={e => {
                    const v = e.target.value;
                    onFilterChange(col, v === '' ? null : v);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-200
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50
                    hover:border-slate-500 cursor-pointer appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-9"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value="">All {formatDimLabel(col).toLowerCase()}</option>
                  {options.map(opt => (
                    <option key={opt} value={opt}>
                      {opt.length > 42 ? `${opt.slice(0, 40)}…` : opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          {dateColumn && (
            <div className="flex flex-wrap items-end gap-2 border-l border-slate-700/80 pl-3 ml-1">
              <div className="flex items-center gap-1.5 text-slate-500 pb-2">
                <CalendarRange className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500">From</label>
                <input
                  type="date"
                  value={dateMin ?? ''}
                  onChange={e => onDateMinChange(e.target.value || null)}
                  className="px-2 py-2 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-200
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500">To</label>
                <input
                  type="date"
                  value={dateMax ?? ''}
                  onChange={e => onDateMaxChange(e.target.value || null)}
                  className="px-2 py-2 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-200
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 lg:border-l lg:border-slate-700/80 lg:pl-4">
          <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-600/60">
            <span className="text-lg font-bold text-white tabular-nums">{filteredCount.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-1.5">records</span>
            {filteredCount !== totalCount && (
              <span className="text-[10px] text-slate-500 block mt-0.5">of {totalCount.toLocaleString()} loaded</span>
            )}
          </div>
          {(activeCount > 0 || dateActive) && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 text-xs font-medium text-slate-300
                hover:bg-slate-800 hover:border-slate-500 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
