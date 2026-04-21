'use client';

import { CleaningReportSummary } from '@/types/analytics';
import { Sparkles, CheckCircle, AlertTriangle, Trash2, Wrench } from 'lucide-react';

interface CleaningReportProps {
  report: CleaningReportSummary;
}

const SEVERITY_STYLES = {
  high: 'text-red-400 bg-red-950/40 border-red-800/40',
  medium: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  low: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
};

export default function CleaningReport({ report }: CleaningReportProps) {
  const scoreColor =
    report.qualityScore >= 80 ? 'text-emerald-400' :
    report.qualityScore >= 50 ? 'text-amber-400' : 'text-red-400';

  const scoreRingColor =
    report.qualityScore >= 80 ? 'stroke-emerald-400' :
    report.qualityScore >= 50 ? 'stroke-amber-400' : 'stroke-red-400';

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Wrench className="w-5 h-5 text-cyan-400" />
        Data Cleaning Report
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Quality Score */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#1e293b" strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" className={scoreRingColor} strokeWidth="3"
                strokeDasharray={`${report.qualityScore}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${scoreColor}`}>{report.qualityScore}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Quality Score</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {report.qualityScore >= 80 ? 'Excellent data quality' :
               report.qualityScore >= 50 ? 'Some issues found' : 'Needs attention'}
            </p>
          </div>
        </div>

        {/* Rows cleaned */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-500">Rows</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {report.cleanedRows.toLocaleString()}
          </p>
          {report.originalRows !== report.cleanedRows && (
            <p className="text-xs text-slate-500 mt-1">
              {(report.originalRows - report.cleanedRows).toLocaleString()} removed from {report.originalRows.toLocaleString()}
            </p>
          )}
        </div>

        {/* Actions taken */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-500">Cleaning Actions</span>
          </div>
          <p className="text-2xl font-bold text-white">{report.actions.length}</p>
          <p className="text-xs text-slate-500 mt-1">automatic fixes applied</p>
        </div>
      </div>

      {/* Issues */}
      {report.issues.length > 0 && (
        <div className="space-y-2 mb-4">
          {report.issues.map((issue, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${SEVERITY_STYLES[issue.severity]}`}>
              {issue.severity === 'low' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Actions detail */}
      {report.actions.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cleaning Log</p>
          </div>
          <div className="divide-y divide-slate-800/50">
            {report.actions.map((action, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-slate-300">{action.description}</span>
                <span className="text-xs text-cyan-400 font-mono flex-shrink-0 ml-3">{action.affected}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
