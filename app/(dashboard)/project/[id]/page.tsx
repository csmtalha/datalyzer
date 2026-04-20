'use client';

import { useEffect, useState, use } from 'react';
import Dashboard from '@/components/dashboard/Dashboard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { AnalyticsResult } from '@/types/analytics';
import { ArrowLeft, Pencil, Check, X } from 'lucide-react';
import Link from 'next/link';

interface ProjectData {
  id: string;
  name: string;
  file_name: string;
  analytics_data: AnalyticsResult;
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) throw new Error('Project not found');
        const data = await res.json();
        setProject(data);
        setNewName(data.name);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleRename = async () => {
    if (!project || !newName.trim()) return;
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    setProject(prev => prev ? { ...prev, name: newName } : null);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-800/60 rounded animate-pulse" />
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 font-medium">{error || 'Project not found'}</p>
        <Link href="/history" className="text-cyan-400 hover:text-cyan-300 text-sm mt-4 inline-block">
          Back to history
        </Link>
      </div>
    );
  }

  const analyticsData: AnalyticsResult =
    typeof project.analytics_data === 'string'
      ? JSON.parse(project.analytics_data)
      : project.analytics_data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/history"
          className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <button onClick={handleRename} className="p-1.5 text-emerald-400 hover:text-emerald-300">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(false)} className="p-1.5 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <Dashboard result={analyticsData} onReset={() => window.history.back()} />
    </div>
  );
}
