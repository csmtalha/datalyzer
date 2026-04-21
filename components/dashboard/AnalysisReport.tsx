'use client';

import { useState } from 'react';
import {
  DataProfile, ColumnDistribution, AnomalyInfo, PatternInfo, SegmentInfo,
} from '@/types/analytics';
import {
  Activity, Shield, Target, Fingerprint, CheckCircle2,
  AlertOctagon, TrendingUp, TrendingDown, Zap, BarChart3,
  ChevronDown, ChevronUp, Layers, Gauge, BrainCircuit,
  ArrowUpRight, ArrowDownRight, Minus, PieChart,
} from 'lucide-react';

interface AnalysisReportProps {
  profile: DataProfile;
}

const GRADE_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  'A+': { bg: 'from-emerald-500 to-cyan-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' },
  'A':  { bg: 'from-emerald-500 to-teal-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  'B+': { bg: 'from-cyan-500 to-blue-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  'B':  { bg: 'from-blue-500 to-indigo-500', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  'C+': { bg: 'from-amber-500 to-yellow-500', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  'C':  { bg: 'from-amber-500 to-orange-500', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  'D':  { bg: 'from-orange-500 to-red-500', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  'F':  { bg: 'from-red-500 to-rose-600', text: 'text-red-400', glow: 'shadow-red-500/20' },
};

const DIST_SHAPES: Record<string, { label: string; color: string }> = {
  'normal': { label: 'Normal', color: 'text-emerald-400' },
  'uniform': { label: 'Uniform', color: 'text-blue-400' },
  'skewed-right': { label: 'Right-Skewed', color: 'text-amber-400' },
  'skewed-left': { label: 'Left-Skewed', color: 'text-orange-400' },
  'bimodal': { label: 'Bimodal', color: 'text-violet-400' },
  'exponential': { label: 'Exponential', color: 'text-pink-400' },
  'sparse': { label: 'Sparse', color: 'text-slate-400' },
  'unknown': { label: 'Complex', color: 'text-slate-500' },
};

function HealthGauge({ score, grade }: { score: number; grade: string }) {
  const gradeStyle = GRADE_COLORS[grade] || GRADE_COLORS['C'];
  const circumference = 2 * Math.PI * 70;
  const dashOffset = circumference - (score / 100) * circumference * 0.75;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="200" height="160" viewBox="0 0 200 160">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="33%" stopColor="#f59e0b" />
            <stop offset="66%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path
          d="M 30 140 A 70 70 0 1 1 170 140"
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 30 140 A 70 70 0 1 1 170 140"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference * 0.75}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute top-12 flex flex-col items-center">
        <span className={`text-5xl font-black bg-linear-to-r ${gradeStyle.bg} bg-clip-text text-transparent`}>
          {grade}
        </span>
        <span className="text-sm text-slate-400 mt-1">{score}/100</span>
      </div>
    </div>
  );
}

function QualityBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const color =
    value >= 90 ? 'bg-emerald-500' :
    value >= 70 ? 'bg-cyan-500' :
    value >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400">{label}</span>
        </div>
        <span className="text-xs font-semibold text-slate-300">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function DistributionCard({ dist }: { dist: ColumnDistribution }) {
  const shape = DIST_SHAPES[dist.shape] || DIST_SHAPES['unknown'];
  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-300 truncate">{dist.column}</span>
        <span className={`text-[10px] font-bold ${shape.color}`}>{shape.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <span className="text-slate-500 block">Skew</span>
          <span className="text-slate-300 font-mono">{dist.skewness}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Kurtosis</span>
          <span className="text-slate-300 font-mono">{dist.kurtosis}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Normality</span>
          <span className={`font-mono ${dist.normalityScore > 70 ? 'text-emerald-400' : dist.normalityScore > 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {dist.normalityScore}%
          </span>
        </div>
      </div>
    </div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: AnomalyInfo }) {
  const sevStyle = {
    critical: 'bg-red-500/10 border-red-500/30 text-red-400',
    high: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    medium: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  };
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${sevStyle[anomaly.severity]}`}>
      <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">{anomaly.column}</span>
        <span className="text-[10px] text-slate-500 ml-2">row #{anomaly.rowIndex + 1}</span>
      </div>
      <span className="text-xs font-mono">{anomaly.value.toLocaleString()}</span>
      <span className="text-[10px] font-mono text-slate-500">{anomaly.zScore}σ</span>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: PatternInfo }) {
  const icons: Record<string, React.ElementType> = {
    'monotonic-increase': TrendingUp,
    'monotonic-decrease': TrendingDown,
    'spike': Zap,
    'step-change': ArrowUpRight,
    'periodic': Activity,
    'plateau': Minus,
    'trend-reversal': ArrowDownRight,
  };
  const Icon = icons[pattern.type] || Activity;
  const confidencePct = Math.round(pattern.confidence * 100);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200 capitalize">
              {pattern.type.replace(/-/g, ' ')}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              {confidencePct}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{pattern.description}</p>
        </div>
      </div>
    </div>
  );
}

function SegmentPanel({ segment }: { segment: SegmentInfo }) {
  const [expanded, setExpanded] = useState(false);
  const numericKeys = Object.keys(segment.segments[0]?.avgNumeric || {});
  const display = expanded ? segment.segments : segment.segments.slice(0, 5);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800/50 transition-colors text-left"
      >
        <PieChart className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-200 flex-1">
          Segmented by {segment.column}
        </span>
        <span className="text-xs text-slate-500">{segment.segments.length} segments</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800">
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 text-slate-500 font-medium">Segment</th>
                  <th className="text-right py-2 text-slate-500 font-medium">Count</th>
                  {numericKeys.map(k => (
                    <th key={k} className="text-right py-2 text-slate-500 font-medium truncate max-w-[80px]">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {display.map(seg => (
                  <tr key={seg.label} className="border-b border-slate-800/50">
                    <td className="py-1.5 text-slate-300 truncate max-w-[120px]">{seg.label}</td>
                    <td className="py-1.5 text-slate-400 text-right font-mono">{seg.count.toLocaleString()}</td>
                    {numericKeys.map(k => (
                      <td key={k} className="py-1.5 text-slate-400 text-right font-mono">
                        {seg.avgNumeric?.[k]?.toLocaleString() ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalysisReport({ profile }: AnalysisReportProps) {
  const [showAllAnomalies, setShowAllAnomalies] = useState(false);
  const displayAnomalies = showAllAnomalies ? profile.anomalies : profile.anomalies.slice(0, 6);
  const criticalCount = profile.anomalies.filter(a => a.severity === 'critical').length;
  const highCount = profile.anomalies.filter(a => a.severity === 'high').length;

  return (
    <div className="space-y-8">
      {/* Health Score Hero */}
      <div className="bg-linear-to-br from-slate-900 via-slate-900/95 to-slate-800/80 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Gauge */}
          <div className="flex flex-col items-center lg:col-span-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Data Health Score</h3>
            <HealthGauge score={profile.healthScore} grade={profile.grade} />
          </div>

          {/* Quality Dimensions */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Quality Dimensions</h3>
            <QualityBar label="Completeness" value={profile.completeness} icon={CheckCircle2} />
            <QualityBar label="Consistency" value={profile.consistency} icon={Shield} />
            <QualityBar label="Uniqueness" value={profile.uniqueness} icon={Fingerprint} />
            <QualityBar label="Validity" value={profile.validity} icon={Target} />
          </div>

          {/* Meta Stats */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Dataset Profile</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Complexity', value: `${profile.complexityScore}/100`, icon: BrainCircuit },
                { label: 'Dimensionality', value: profile.dimensionality, icon: Layers },
                { label: 'Memory', value: profile.memoryEstimate, icon: Gauge },
                { label: 'Anomalies', value: profile.anomalies.length.toString(), icon: AlertOctagon },
              ].map(stat => (
                <div key={stat.label} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{stat.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-200 capitalize">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Type Breakdown */}
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <span className="text-[10px] text-slate-500 block mb-2">Column Types</span>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(profile.typeBreakdown).map(([type, count]) => {
                  const colors: Record<string, string> = {
                    numeric: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                    categorical: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
                    date: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                    text: 'bg-slate-600/30 text-slate-400 border-slate-500/30',
                    boolean: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                  };
                  return (
                    <span key={type} className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${colors[type] || colors.text}`}>
                      {count} {type}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distributions */}
      {profile.distributions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Distribution Analysis</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {profile.distributions.map(dist => (
              <DistributionCard key={dist.column} dist={dist} />
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {profile.patterns.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-bold text-white">Detected Patterns</h2>
            <span className="ml-auto text-xs text-slate-500">{profile.patterns.length} found</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.patterns.map((pattern, i) => (
              <PatternCard key={i} pattern={pattern} />
            ))}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {profile.anomalies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertOctagon className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">Anomaly Detection</h2>
            <div className="flex gap-2 ml-auto">
              {criticalCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {criticalCount} critical
                </span>
              )}
              {highCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {highCount} high
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            {displayAnomalies.map((anomaly, i) => (
              <AnomalyRow key={i} anomaly={anomaly} />
            ))}
          </div>
          {profile.anomalies.length > 6 && (
            <button
              onClick={() => setShowAllAnomalies(!showAllAnomalies)}
              className="mt-3 w-full py-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {showAllAnomalies ? 'Show less' : `Show all ${profile.anomalies.length} anomalies`}
            </button>
          )}
        </div>
      )}

      {/* Segments */}
      {profile.segments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Segmentation Analysis</h2>
          </div>
          <div className="space-y-3">
            {profile.segments.map((segment, i) => (
              <SegmentPanel key={i} segment={segment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
