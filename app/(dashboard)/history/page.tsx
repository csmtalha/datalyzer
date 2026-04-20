'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FileText, Trash2, Clock, FolderOpen } from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  file_name: string;
  file_type: string;
  row_count: number;
  column_count: number;
  created_at: string;
  updated_at: string;
}

interface UploadItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  row_count: number;
  created_at: string;
}

type TabType = 'projects' | 'uploads';

export default function HistoryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('projects');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [p, u] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('uploads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      ]);
      setProjects((p.data ?? []) as ProjectItem[]);
      setUploads((u.data ?? []) as UploadItem[]);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDeleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-slate-400 text-sm mt-1">Your saved projects and upload history</p>
      </div>

      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
        {(['projects', 'uploads'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'projects' ? <FolderOpen className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {t === 'projects' ? 'Saved Projects' : 'Upload Log'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tab === 'projects' ? (
        projects.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No saved projects</p>
            <p className="text-sm text-slate-500 mt-1">Upload a file and save it as a project</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-4 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl group"
              >
                <Link href={`/project/${project.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{project.name}</p>
                    <p className="text-xs text-slate-500">
                      {project.file_name} &middot; {project.row_count.toLocaleString()} rows &middot; {project.column_count} columns
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </Link>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : uploads.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No uploads yet</p>
          <p className="text-sm text-slate-500 mt-1">Your upload history will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-4 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl"
            >
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-200 truncate">{upload.file_name}</p>
                <p className="text-xs text-slate-500">
                  {formatSize(upload.file_size)} &middot; {upload.row_count.toLocaleString()} rows
                </p>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">
                {new Date(upload.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
