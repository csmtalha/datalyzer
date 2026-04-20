'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import UploadZone from '@/components/upload/UploadZone';
import Dashboard from '@/components/dashboard/Dashboard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import UpgradeModal from '@/components/billing/UpgradeModal';
import { AnalyticsResult } from '@/types/analytics';
import { Save, Loader2, CheckCircle } from 'lucide-react';

export default function UploadPage() {
  const { plan, limits } = useAuth();
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          setUpgradeReason(data.error);
          setShowUpgrade(true);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to analyze file');
      }
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!result) return;
    setSaving(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.fileName.replace(/\.[^.]+$/, ''),
          fileName: result.fileName,
          fileType: result.fileType,
          rowCount: result.rowCount,
          columnCount: result.columnCount,
          analyticsData: result,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setUpgradeReason(data.error);
          setShowUpgrade(true);
        }
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Dataset</h1>
          <p className="text-slate-400 text-sm mt-1">
            {plan === 'free'
              ? `${limits.uploads_per_day} upload per day · Max ${(limits.max_file_size_mb)}MB · ${limits.max_rows.toLocaleString()} rows`
              : `Unlimited uploads · Max ${limits.max_file_size_mb}MB · ${limits.max_rows.toLocaleString()} rows`}
          </p>
        </div>

        {result && (
          <button
            onClick={handleSaveProject}
            disabled={saving || saved}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
              saved
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved' : 'Save Project'}
          </button>
        )}
      </div>

      {!result && !isLoading && (
        <UploadZone onUpload={handleUpload} isLoading={isLoading} error={error} />
      )}

      {isLoading && (
        <div>
          <div className="text-center mb-8">
            <p className="text-slate-400 text-sm">Running analytics engine...</p>
          </div>
          <LoadingSkeleton />
        </div>
      )}

      {result && <Dashboard result={result} onReset={handleReset} />}

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={upgradeReason}
        feature="uploads"
      />
    </div>
  );
}
