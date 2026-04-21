'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Upload, FolderOpen, TrendingUp, Clock,
  ArrowRight, BarChart2, FileText, Sparkles,
} from 'lucide-react';
import { PLAN_LIMITS } from '@/types/database';

interface RecentProject {
  id: string;
  name: string;
  file_name: string;
  row_count: number;
  column_count: number;
  updated_at: string;
}

interface UsageStats {
  uploadsToday: number;
  totalUploads: number;
  totalExports: number;
  totalProjects: number;
}

export default function DashboardPage() {
  const { profile, plan, user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [usage, setUsage] = useState<UsageStats>({ uploadsToday: 0, totalUploads: 0, totalExports: 0, totalProjects: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const limits = PLAN_LIMITS[plan];

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProjects([]);
      setUsage({ uploadsToday: 0, totalUploads: 0, totalExports: 0, totalProjects: 0 });
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [projectsRes, usageRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, name, file_name, row_count, column_count, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(5),
          fetchUsage(),
        ]);
        setProjects((projectsRes.data ?? []) as RecentProject[]);
        setUsage(usageRes);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsage = async (): Promise<UsageStats> => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [uploadsToday, totalUploads, totalExports, totalProjects] = await Promise.all([
        supabase.from('usage_logs').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('action', 'upload')
          .gte('created_at', todayStart.toISOString()).then(r => r.count ?? 0),
        supabase.from('uploads').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).then(r => r.count ?? 0),
        supabase.from('usage_logs').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).in('action', ['export_pdf', 'export_excel']).then(r => r.count ?? 0),
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).then(r => r.count ?? 0),
      ]);

      return { uploadsToday, totalUploads, totalExports, totalProjects };
    };

    load();
    // supabase client is session-scoped; user + auth gate drive refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const kpis = [
    {
      label: 'Uploads Today',
      value: `${usage.uploadsToday}${limits.uploads_per_day !== Infinity ? ` / ${limits.uploads_per_day}` : ''}`,
      icon: Upload,
      color: 'cyan',
    },
    { label: 'Total Uploads', value: usage.totalUploads.toString(), icon: TrendingUp, color: 'violet' },
    { label: 'Exports', value: usage.totalExports.toString(), icon: FileText, color: 'emerald' },
    { label: 'Saved Projects', value: usage.totalProjects.toString(), icon: FolderOpen, color: 'amber' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-slate-400 mt-1">Here&apos;s your analytics overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border border-${kpi.color}-500/20 bg-linear-to-br from-${kpi.color}-500/10 to-transparent p-5`}
          >
            <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-500/10 flex items-center justify-center mb-3`}>
              <kpi.icon className={`w-5 h-5 text-${kpi.color}-400`} />
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '—' : kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/upload"
          className="flex items-center gap-4 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-cyan-500/40 transition-all group"
        >
          <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
            <Upload className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Upload Dataset</p>
            <p className="text-xs text-slate-400 mt-0.5">CSV, Excel, PDF, or Word</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
        </Link>

        <Link
          href="/history"
          className="flex items-center gap-4 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-violet-500/40 transition-all group"
        >
          <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
            <Clock className="w-6 h-6 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">View History</p>
            <p className="text-xs text-slate-400 mt-0.5">Past uploads and exports</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" />
        </Link>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Projects</h2>
          {projects.length > 0 && (
            <Link href="/history" className="text-sm text-cyan-400 hover:text-cyan-300">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart2 className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 font-medium">No projects yet</p>
            <p className="text-sm text-slate-500 mt-1">Upload a dataset to get started</p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Upload First File
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="flex items-center gap-4 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{project.name}</p>
                  <p className="text-xs text-slate-500">
                    {project.row_count.toLocaleString()} rows &middot; {project.column_count} columns
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
