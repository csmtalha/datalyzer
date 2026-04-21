'use client';

import { useMemo, useState } from 'react';
import { AnalyticsResult } from '@/types/analytics';
import { generateChartConfigs } from '@/lib/chartConfig';
import KPICards from './KPICards';
import InsightsPanel from './InsightsPanel';
import ColumnStats from './ColumnStats';
import DataTable from './DataTable';
import ExportButtons from './ExportButtons';
import CleaningReport from './CleaningReport';
import AIInsightsPanel from './AIInsightsPanel';
import { ChartPanel } from '../charts/ChartPanel';
import { Chart3D } from '../charts/Chart3D';
import { BarChart2, Table, Layers, X, FileText, Wrench, Brain, Box } from 'lucide-react';

interface DashboardProps {
  result: AnalyticsResult;
  onReset: () => void;
}

type Tab = 'overview' | 'data' | 'columns' | 'cleaning' | 'ai' | '3d';

export default function Dashboard({ result, onReset }: DashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const charts = useMemo(() => generateChartConfigs(result.columns, result.rawData), [result]);
  const colNames = Object.keys(result.rawData[0] || {});

  const tabs: { id: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2, show: true },
    { id: '3d', label: '3D Charts', icon: Box, show: !!result.charts3D && result.charts3D.length > 0 },
    { id: 'ai', label: 'AI Analysis', icon: Brain, show: !!result.aiAnalysis },
    { id: 'cleaning', label: 'Cleaning', icon: Wrench, show: !!result.cleaningReport },
    { id: 'data', label: 'Data Table', icon: Table, show: true },
    { id: 'columns', label: 'Columns', icon: Layers, show: true },
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
            {result.aiAnalysis && (
              <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-semibold rounded-full">
                AI Enhanced
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-11">
            Analyzed {new Date(result.processedAt).toLocaleTimeString()}
            {result.cleaningReport && ` · Quality: ${result.cleaningReport.qualityScore}/100`}
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
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.filter(t => t.show).map(t => (
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
          {/* AI Data Story at the top if available */}
          {result.aiAnalysis && (
            <div className="bg-linear-to-br from-violet-500/5 to-cyan-500/5 border border-violet-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">AI Data Story</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{result.aiAnalysis.dataStory}</p>
            </div>
          )}

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

      {tab === '3d' && result.charts3D && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Box className="w-5 h-5 text-cyan-400" />
              3D Visualizations
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Drag to rotate, scroll to zoom, right-click to pan
            </p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {result.charts3D.map((chart, i) => (
              <Chart3D key={i} config={chart} />
            ))}
          </div>
        </div>
      )}

      {tab === 'ai' && result.aiAnalysis && (
        <AIInsightsPanel analysis={result.aiAnalysis} />
      )}

      {tab === 'cleaning' && result.cleaningReport && (
        <CleaningReport report={result.cleaningReport} />
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
