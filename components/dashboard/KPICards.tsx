'use client';

import { AnalyticsResult, ColumnAnalysis } from '@/types/analytics';
import { Database, Columns, AlertTriangle, TrendingUp, Activity, Shield } from 'lucide-react';

interface KPICardsProps {
  result: AnalyticsResult;
  /** When slicing with filters, pass live stats so KPIs match the chart view */
  viewRowCount?: number;
  viewColumns?: ColumnAnalysis[];
  viewCorrelations?: AnalyticsResult['correlations'];
  /** True when any dimension / date slice is applied */
  filteredView?: boolean;
}

export default function KPICards({ result, viewRowCount, viewColumns, viewCorrelations, filteredView }: KPICardsProps) {
  const cols = viewColumns ?? result.columns;
  const rowCount = viewRowCount ?? result.rowCount;
  const corrs = viewCorrelations ?? result.correlations;

  const totalNulls = cols.reduce((sum, c) => sum + c.column.nullCount, 0);
  const denom = rowCount * Math.max(1, cols.length);
  const nullPct = ((totalNulls / denom) * 100).toFixed(1);
  const numericCols = cols.filter(c => c.column.type === 'numeric');
  const strongCorr = corrs.filter(c => c.strength === 'strong');
  const healthScore = result.dataProfile?.healthScore ?? null;
  const anomalyCount = result.dataProfile?.anomalies.length ?? 0;
  const cards = [
    {
      label: 'Total Records',
      value: rowCount.toLocaleString(),
      sub: filteredView
        ? `${cols.length} columns · filtered view`
        : `${result.columnCount} columns · ${result.fileType.toUpperCase()}`,
      icon: Database,
      gradient: 'from-cyan-500/20 to-cyan-600/5',
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
    },
    {
      label: 'Data Health',
      value: healthScore !== null ? `${healthScore}%` : `${(100 - Number(nullPct)).toFixed(0)}%`,
      sub: healthScore !== null
        ? `Grade ${result.dataProfile!.grade} · ${result.dataProfile!.dimensionality} complexity`
        : `${totalNulls.toLocaleString()} null cells`,
      icon: Shield,
      gradient: (healthScore ?? 80) >= 80 ? 'from-emerald-500/20 to-emerald-600/5' : (healthScore ?? 80) >= 60 ? 'from-cyan-500/20 to-cyan-600/5' : 'from-amber-500/20 to-amber-600/5',
      border: (healthScore ?? 80) >= 80 ? 'border-emerald-500/20' : (healthScore ?? 80) >= 60 ? 'border-cyan-500/20' : 'border-amber-500/20',
      iconBg: (healthScore ?? 80) >= 80 ? 'bg-emerald-500/10' : (healthScore ?? 80) >= 60 ? 'bg-cyan-500/10' : 'bg-amber-500/10',
      iconColor: (healthScore ?? 80) >= 80 ? 'text-emerald-400' : (healthScore ?? 80) >= 60 ? 'text-cyan-400' : 'text-amber-400',
    },
    {
      label: 'Numeric Fields',
      value: numericCols.length.toString(),
      sub: `of ${result.columnCount} total · ${strongCorr.length} strong corr.`,
      icon: TrendingUp,
      gradient: 'from-violet-500/20 to-violet-600/5',
      border: 'border-violet-500/20',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-400',
    },
    {
      label: 'Anomalies',
      value: anomalyCount.toString(),
      sub: anomalyCount > 0
        ? `${result.dataProfile?.anomalies.filter(a => a.severity === 'critical').length ?? 0} critical · ${result.dataProfile?.patterns.length ?? 0} patterns`
        : `No outliers detected · ${Number(nullPct)}% missing`,
      icon: anomalyCount > 0 ? AlertTriangle : Activity,
      gradient: anomalyCount > 5 ? 'from-red-500/20 to-red-600/5' : anomalyCount > 0 ? 'from-amber-500/20 to-amber-600/5' : 'from-emerald-500/20 to-emerald-600/5',
      border: anomalyCount > 5 ? 'border-red-500/20' : anomalyCount > 0 ? 'border-amber-500/20' : 'border-emerald-500/20',
      iconBg: anomalyCount > 5 ? 'bg-red-500/10' : anomalyCount > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
      iconColor: anomalyCount > 5 ? 'text-red-400' : anomalyCount > 0 ? 'text-amber-400' : 'text-emerald-400',
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
