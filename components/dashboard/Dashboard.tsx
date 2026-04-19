'use client';

import { useMemo, useState } from 'react';
import { AnalyticsResult } from '@/types/analytics';
import { generateChartConfigs } from '@/lib/chartConfig';
import KPICards from './KPICards';
import InsightsPanel from './InsightsPanel';
import ColumnStats from './ColumnStats';
import DataTable from './DataTable';
import ExportButtons from './ExportButtons';
import { ChartPanel } from '../charts/ChartPanel';
import { BarChart2, Table, Layers, X, FileText } from 'lucide-react';

interface DashboardProps {
  result: AnalyticsResult;
  onReset: () => void;
}

type Tab = 'overview' | 'data' | 'columns';

export default function Dashboard({ result, onReset }: DashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const charts = useMemo(() => generateChartConfigs(result.columns, result.rawData), [result]);
  const colNames = Object.keys(result.rawData[0] || {});

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'data', label: 'Data Table', icon: Table },
    { id: 'columns', label: 'Columns', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="text-xl font-bold text-white truncate max-w-xs">{result.fileName}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-11">
            Analyzed {new Date(result.processedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButtons result={result} />
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-sm rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
            New File
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards result={result} />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <InsightsPanel insights={result.insights} />
          
          {charts.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Interactive Charts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {charts.map((chart, i) => (
                  <ChartPanel key={i} config={chart} />
                ))}
              </div>
            </div>
          )}

          {result.correlations.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Correlation Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.correlations.slice(0, 6).map((corr, i) => (
                  <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        corr.strength === 'strong' ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-800' :
                        corr.strength === 'moderate' ? 'bg-violet-900/50 text-violet-300 border border-violet-800' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {corr.strength}
                      </span>
                      <span className={`text-lg font-bold ${
                        Math.abs(corr.coefficient) > 0.7 ? 'text-cyan-400' :
                        Math.abs(corr.coefficient) > 0.4 ? 'text-violet-400' : 'text-slate-400'
                      }`}>
                        {corr.coefficient > 0 ? '+' : ''}{corr.coefficient}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{corr.col1}</p>
                    <p className="text-xs text-slate-600 my-0.5">↔</p>
                    <p className="text-xs text-slate-400">{corr.col2}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'data' && (
        <DataTable data={result.rawData} columns={colNames} />
      )}

      {tab === 'columns' && (
        <ColumnStats columns={result.columns} rowCount={result.rowCount} />
      )}
    </div>
  );
}
