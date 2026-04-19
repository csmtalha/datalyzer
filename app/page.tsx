'use client';

import { useState } from 'react';
import UploadZone from '@/components/upload/UploadZone';
import Dashboard from '@/components/dashboard/Dashboard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { AnalyticsResult } from '@/types/analytics';
import { BarChart2, Sparkles, Zap, Shield } from 'lucide-react';

export default function Home() {
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze file');
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => { setResult(null); setError(null); };

  return (
    <div className="min-h-screen bg-[#080e1a] text-slate-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:60px_60px] opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(6,182,212,0.06)_0%,transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.05)_0%,transparent_60%)] pointer-events-none" />

      <nav className="relative z-10 border-b border-slate-800/60 backdrop-blur-sm bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-linear-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">Datalyze</span>
            <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs rounded-full">Beta</span>
          </div>
          <div className="text-xs text-slate-500">No signup required · No data stored</div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {!result && !isLoading && (
          <div className="space-y-16">
            <div className="text-center space-y-6 pt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400">
                <Sparkles className="w-3 h-3" />
                Instant analytics for any dataset
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                Upload a file.<br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-violet-400">
                  Get instant insights.
                </span>
              </h1>
              <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
                Drop any CSV, Excel, PDF, or Word file. Datalyze auto-detects structure,
                runs statistical analysis, and generates interactive charts — in seconds.
              </p>
            </div>
            <UploadZone onUpload={handleUpload} isLoading={isLoading} error={error} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {[
                { icon: Zap, title: 'Instant Analysis', desc: 'Statistical summaries, correlations, and outlier detection in seconds.' },
                { icon: BarChart2, title: 'Smart Charts', desc: 'Auto-generated bar, line, pie, histogram, and scatter plots.' },
                { icon: Shield, title: 'Private & Secure', desc: 'Files processed in memory only. Nothing stored on our servers.' },
              ].map(f => (
                <div key={f.title} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 text-center space-y-2">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center mx-auto">
                    <f.icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <p className="font-semibold text-slate-200 text-sm">{f.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {isLoading && !result && (
          <div className="pt-8">
            <div className="text-center mb-8"><p className="text-slate-400 text-sm">Running analytics engine...</p></div>
            <LoadingSkeleton />
          </div>
        )}
        {error && !isLoading && !result && (
          <div className="pt-20">
            <UploadZone onUpload={handleUpload} isLoading={isLoading} error={error} />
          </div>
        )}
        {result && <Dashboard result={result} onReset={handleReset} />}
      </main>
    </div>
  );
}
