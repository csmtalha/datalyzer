'use client';

import { Insight } from '@/types/analytics';
import {
  Database, AlertTriangle, CheckCircle, TrendingUp,
  Zap, Layers, Calendar, BarChart2, Info
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  database: Database,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  'trending-up': TrendingUp,
  zap: Zap,
  layers: Layers,
  calendar: Calendar,
  'bar-chart-2': BarChart2,
};

const TYPE_STYLES = {
  info: 'bg-blue-950/40 border-blue-800/40 text-blue-400',
  warning: 'bg-amber-950/40 border-amber-800/40 text-amber-400',
  success: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400',
  trend: 'bg-violet-950/40 border-violet-800/40 text-violet-400',
};

interface InsightsPanelProps {
  insights: Insight[];
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Smart Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((insight, i) => {
          const Icon = ICON_MAP[insight.icon] || Info;
          return (
            <div
              key={i}
              className={`flex gap-3 p-4 rounded-xl border ${TYPE_STYLES[insight.type]}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
