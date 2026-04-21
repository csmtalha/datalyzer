'use client';

import { AIAnalysis } from '@/types/analytics';
import {
  Brain, TrendingUp, AlertTriangle, Lightbulb, FileText,
  GitBranch, Sparkles,
} from 'lucide-react';

interface AIInsightsPanelProps {
  analysis: AIAnalysis;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; style: string }> = {
  trend: { icon: TrendingUp, style: 'bg-violet-950/40 border-violet-800/40 text-violet-400' },
  anomaly: { icon: AlertTriangle, style: 'bg-red-950/40 border-red-800/40 text-red-400' },
  recommendation: { icon: Lightbulb, style: 'bg-amber-950/40 border-amber-800/40 text-amber-400' },
  summary: { icon: FileText, style: 'bg-blue-950/40 border-blue-800/40 text-blue-400' },
  pattern: { icon: GitBranch, style: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400' },
};

const CONFIDENCE_BADGE: Record<string, string> = {
  high: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-700 text-slate-400 border-slate-600',
};

export default function AIInsightsPanel({ analysis }: AIInsightsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-linear-to-br from-violet-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            AI Analysis
            <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-semibold rounded-full uppercase">
              GPT-4o
            </span>
          </h2>
          <p className="text-xs text-slate-500">Powered by OpenAI</p>
        </div>
      </div>

      {/* Data Story */}
      <div className="bg-linear-to-br from-violet-500/5 to-cyan-500/5 border border-violet-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Data Story</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{analysis.dataStory}</p>
      </div>

      {/* Executive Summary */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Summary</p>
        <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {analysis.insights.map((insight, i) => {
          const config = CATEGORY_CONFIG[insight.category] || CATEGORY_CONFIG.summary;
          const Icon = config.icon;
          return (
            <div key={i} className={`flex gap-3 p-4 rounded-xl border ${config.style}`}>
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold truncate">{insight.headline}</p>
                  <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full border flex-shrink-0 ${CONFIDENCE_BADGE[insight.confidence]}`}>
                    {insight.confidence}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{insight.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            Recommendations
          </p>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 bg-amber-500/10 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-400 flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-300">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
