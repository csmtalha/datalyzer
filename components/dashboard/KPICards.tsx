'use client';

import { AnalyticsResult } from '@/types/analytics';
import { Database, Columns, AlertTriangle, TrendingUp } from 'lucide-react';

interface KPICardsProps {
  result: AnalyticsResult;
}

export default function KPICards({ result }: KPICardsProps) {
  const totalNulls = result.columns.reduce((sum, c) => sum + c.column.nullCount, 0);
  const nullPct = ((totalNulls / (result.rowCount * result.columnCount)) * 100).toFixed(1);
  const numericCols = result.columns.filter(c => c.column.type === 'numeric');
  const strongCorr = result.correlations.filter(c => c.strength === 'strong');

  const cards = [
    {
      label: 'Total Records',
      value: result.rowCount.toLocaleString(),
      sub: `${result.columnCount} columns`,
      icon: Database,
      color: 'cyan',
      gradient: 'from-cyan-500/20 to-cyan-600/5',
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
    },
    {
      label: 'Numeric Fields',
      value: numericCols.length.toString(),
      sub: `of ${result.columnCount} total columns`,
      icon: TrendingUp,
      color: 'violet',
      gradient: 'from-violet-500/20 to-violet-600/5',
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-400',
    },
    {
      label: 'Missing Values',
      value: `${nullPct}%`,
      sub: `${totalNulls.toLocaleString()} null cells`,
      icon: AlertTriangle,
      color: Number(nullPct) > 20 ? 'amber' : 'emerald',
      gradient: Number(nullPct) > 20 ? 'from-amber-500/20 to-amber-600/5' : 'from-emerald-500/20 to-emerald-600/5',
      border: Number(nullPct) > 20 ? 'border-amber-500/20' : 'border-emerald-500/20',
      iconBg: Number(nullPct) > 20 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
      iconColor: Number(nullPct) > 20 ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: 'Correlations',
      value: strongCorr.length.toString(),
      sub: `strong relationships found`,
      icon: Columns,
      color: 'pink',
      gradient: 'from-pink-500/20 to-pink-600/5',
      border: 'border-pink-500/20',
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-2xl border ${card.border} bg-linear-to-br ${card.gradient} backdrop-blur-sm p-5`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{card.value}</p>
          <p className="text-xs font-medium text-slate-300 mt-1">{card.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
