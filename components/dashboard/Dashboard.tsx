'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { AnalyticsResult } from '@/types/analytics';
import { analyzeColumns, computeCorrelations } from '@/lib/analytics';
import { generateChartConfigs } from '@/lib/chartConfig';
import { generate3DChartConfigs } from '@/lib/chart3DConfig';
import { generateInsights } from '@/lib/insights';
import { profileData } from '@/lib/dataProfiler';
import { applyFilters, pickFilterDimensions, pickDateColumn } from '@/lib/dashboardFilters';
import KPICards from './KPICards';
import InsightsPanel from './InsightsPanel';
import ColumnStats from './ColumnStats';
import DataTable from './DataTable';
import ExportButtons from './ExportButtons';
import CleaningReport from './CleaningReport';
import AIInsightsPanel from './AIInsightsPanel';
import AnalysisReport from './AnalysisReport';
import DatasetFilterBar from './DatasetFilterBar';
import { ChartPanel } from '../charts/ChartPanel';
import { Chart3D } from '../charts/Chart3D';
import { BarChart2, Table, Layers, X, FileText, Wrench, Brain, Box, Activity } from 'lucide-react';

interface DashboardProps {
  result: AnalyticsResult;
  onReset: () => void;
}

type Tab = 'overview' | 'analysis' | 'data' | 'columns' | 'cleaning' | 'ai' | '3d';

export default function Dashboard({ result, onReset }: DashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [filters, setFilters] = useState<Record<string, string | null>>({});
  const [dateMin, setDateMin] = useState<string | null>(null);
  const [dateMax, setDateMax] = useState<string | null>(null);

  const filterDimensions = useMemo(() => pickFilterDimensions(result.columns), [result.columns]);
  const dateColumn = useMemo(() => pickDateColumn(result.columns), [result.columns]);

  useEffect(() => {
    setFilters({});
    setDateMin(null);
    setDateMax(null);
  }, [result.processedAt, result.fileName]);

  const filteredData = useMemo(
    () => applyFilters(result.rawData, filters, dateColumn, dateMin, dateMax),
    [result.rawData, filters, dateColumn, dateMin, dateMax]
  );

  const filteredKeys = useMemo(() => Object.keys(filteredData[0] || result.rawData[0] || {}), [filteredData, result.rawData]);

  const filteredColumns = useMemo(() => {
    if (filteredData.length === 0) return result.columns;
    return analyzeColumns(filteredData, filteredKeys);
  }, [filteredData, filteredKeys, result.columns]);

  const filteredCorr = useMemo(() => {
    const nums = filteredColumns.filter(c => c.column.type === 'numeric').map(c => c.column.name);
    return computeCorrelations(filteredData, nums);
  }, [filteredData, filteredColumns]);

  const charts = useMemo(
    () => generateChartConfigs(filteredColumns, filteredData),
    [filteredColumns, filteredData]
  );

  const filteredInsights = useMemo(
    () => generateInsights(filteredColumns, filteredCorr, Math.max(1, filteredData.length)),
    [filteredColumns, filteredCorr, filteredData.length]
  );

  const filteredProfile = useMemo(
    () => (filteredData.length > 0 ? profileData(filteredColumns, filteredCorr, filteredData) : null),
    [filteredData, filteredColumns, filteredCorr]
  );

  const charts3DFiltered = useMemo(
    () => generate3DChartConfigs(filteredColumns, filteredData),
    [filteredColumns, filteredData]
  );

  const colNames = filteredKeys;

  const filteredView = useMemo(() => {
    const dimActive = filterDimensions.some(d => {
      const v = filters[d];
      return Boolean(v && v !== '__ALL__');
    });
    return dimActive || Boolean(dateMin || dateMax);
  }, [filterDimensions, filters, dateMin, dateMax]);

  const onFilterChange = useCallback((column: string, value: string | null) => {
    const idx = filterDimensions.indexOf(column);
    setFilters(prev => {
      const next = { ...prev, [column]: value };
      for (let i = idx + 1; i < filterDimensions.length; i++) {
        next[filterDimensions[i]] = null;
      }
      return next;
    });
  }, [filterDimensions]);

  const onResetFilters = useCallback(() => {
    setFilters({});
    setDateMin(null);
    setDateMax(null);
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2, show: true },
    { id: 'analysis', label: 'Deep Analysis', icon: Activity, show: !!(filteredProfile ?? result.dataProfile) },
    { id: '3d', label: '3D Charts', icon: Box, show: charts3DFiltered.length > 0 },
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
            {result.dataProfile && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                result.dataProfile.grade.startsWith('A') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                result.dataProfile.grade.startsWith('B') ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                Grade {result.dataProfile.grade}
              </span>
            )}
            {result.aiAnalysis && (
              <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-semibold rounded-full">
                AI Enhanced
              </span>
            )}
            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono rounded-full uppercase">
              {result.fileType}
            </span>
            {filteredView && (
              <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[10px] font-semibold rounded-full">
                Sliced
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-11">
            Analyzed {new Date(result.processedAt).toLocaleTimeString()}
            {result.dataProfile && ` · Health: ${result.dataProfile.healthScore}/100`}
            {result.sheetInfo && ` · ${result.sheetInfo.length} sheets`}
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

      <DatasetFilterBar
        dimensions={filterDimensions}
        rawData={result.rawData}
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onResetFilters}
        dateColumn={dateColumn}
        dateMin={dateMin}
        dateMax={dateMax}
        onDateMinChange={setDateMin}
        onDateMaxChange={setDateMax}
        filteredCount={filteredData.length}
        totalCount={result.rawData.length}
      />

      <KPICards
        result={result}
        viewRowCount={filteredData.length}
        viewColumns={filteredColumns}
        viewCorrelations={filteredCorr}
        filteredView={filteredView}
      />

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
          {result.aiAnalysis && (
            <div className="bg-linear-to-br from-violet-500/5 to-cyan-500/5 border border-violet-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">AI Data Story</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{result.aiAnalysis.dataStory}</p>
            </div>
          )}

          <InsightsPanel insights={filteredInsights} />

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

          {filteredCorr.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Correlation Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCorr.slice(0, 6).map((corr, i) => (
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

      {tab === 'analysis' && (filteredProfile ?? result.dataProfile) && (
        <AnalysisReport profile={(filteredProfile ?? result.dataProfile)!} />
      )}

      {tab === '3d' && charts3DFiltered.length > 0 && (
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
            {charts3DFiltered.map((chart, i) => (
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
        <DataTable data={filteredData} columns={colNames} columnMapping={result.columnMapping} />
      )}

      {tab === 'columns' && (
        <ColumnStats columns={filteredColumns} rowCount={Math.max(1, filteredData.length)} columnMapping={result.columnMapping} />
      )}
    </div>
  );
}
