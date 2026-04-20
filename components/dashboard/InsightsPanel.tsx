'use client';

import { Insight } from '@/types/analytics';
import { useAuth } from '@/components/auth/AuthProvider';
import UpgradeModal from '@/components/billing/UpgradeModal';
import { useState } from 'react';
import {
  Database, AlertTriangle, CheckCircle, TrendingUp,
  Zap, Layers, Calendar, BarChart2, Info, Lock,
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
  const { limits } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const freeLimit = 4;
  const visibleInsights = limits.insights_full ? insights : insights.slice(0, freeLimit);
  const lockedCount = limits.insights_full ? 0 : Math.max(0, insights.length - freeLimit);

  return (
    <>
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Smart Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleInsights.map((insight, i) => {
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

          {lockedCount > 0 && (
            <button
              onClick={() => setShowUpgrade(true)}
              className="flex items-center justify-center gap-3 p-4 rounded-xl border border-dashed border-slate-700 hover:border-cyan-500/40 text-slate-500 hover:text-cyan-400 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">
                +{lockedCount} more insights — Upgrade to Pro
              </span>
            </button>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="Full insights are available on the Pro plan"
        feature="All Insights"
      />
    </>
  );
}
