'use client';

import { useState, useMemo } from 'react';
import { ColumnAnalysis, ColumnMappingEntry } from '@/types/analytics';
import { ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  numeric: 'bg-cyan-900/50 text-cyan-300 border-cyan-800',
  categorical: 'bg-violet-900/50 text-violet-300 border-violet-800',
  date: 'bg-emerald-900/50 text-emerald-300 border-emerald-800',
  text: 'bg-slate-800 text-slate-400 border-slate-700',
  boolean: 'bg-amber-900/50 text-amber-300 border-amber-800',
};

interface ColStatsProps {
  columns: ColumnAnalysis[];
  rowCount: number;
  columnMapping?: ColumnMappingEntry[];
}

export default function ColumnStats({ columns, rowCount, columnMapping }: ColStatsProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? columns : columns.slice(0, 8);

  const renamedMap = useMemo(() => {
    if (!columnMapping) return new Map<string, string>();
    return new Map(columnMapping.filter(m => m.wasRenamed).map(m => [m.display, m.original]));
  }, [columnMapping]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-white">Column Analysis</h2>
        {renamedMap.size > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-[10px] text-cyan-400 font-medium">
            <ArrowRightLeft className="w-3 h-3" />
            {renamedMap.size} auto-renamed
          </span>
        )}
      </div>
      <div className="space-y-2">
        {display.map(col => {
          const isOpen = expanded === col.column.name;
          const nullPct = ((col.column.nullCount / rowCount) * 100).toFixed(1);
          const originalName = renamedMap.get(col.column.name);
          return (
            <div key={col.column.name} className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : col.column.name)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800/50 transition-colors text-left"
              >
                <span className={`px-2 py-0.5 text-xs rounded-full border ${TYPE_COLORS[col.column.type]}`}>
                  {col.column.type}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-200 truncate block">{col.column.name}</span>
                  {originalName && (
                    <span className="text-[10px] text-slate-600 truncate block">was: {originalName}</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{col.column.uniqueCount} unique</span>
                <span className={`text-xs ${Number(nullPct) > 20 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {nullPct}% null
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-800">
                  {col.numeric && (
                    <div className="mt-3 grid grid-cols-4 gap-3">
                      {[
                        ['Mean', col.numeric.mean],
                        ['Median', col.numeric.median],
                        ['Min', col.numeric.min],
                        ['Max', col.numeric.max],
                        ['Std Dev', col.numeric.stdDev],
                        ['Q1', col.numeric.q1],
                        ['Q3', col.numeric.q3],
                        ['Outliers', col.numeric.outliers.length],
                      ].map(([label, val]) => (
                        <div key={label as string} className="bg-slate-800 rounded-lg p-2.5">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="text-sm font-semibold text-slate-200 mt-0.5">{Number(val).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {col.category && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">Top values</p>
                      <div className="space-y-1.5">
                        {col.category.topN.slice(0, 8).map(item => {
                          const pct = ((item.count / rowCount) * 100).toFixed(1);
                          return (
                            <div key={item.label} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-28 truncate">{item.label}</span>
                              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-violet-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-12 text-right">{item.count.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {col.date && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="bg-slate-800 rounded-lg p-2.5">
                        <p className="text-xs text-slate-500">Start</p>
                        <p className="text-sm text-slate-200">{col.date.min}</p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2.5">
                        <p className="text-xs text-slate-500">End</p>
                        <p className="text-sm text-slate-200">{col.date.max}</p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2.5">
                        <p className="text-xs text-slate-500">Span</p>
                        <p className="text-sm text-slate-200">{col.date.range}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {columns.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full py-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${columns.length} columns`}
        </button>
      )}
    </div>
  );
}
