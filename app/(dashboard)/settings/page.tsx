'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, User, Mail, Shield } from 'lucide-react';
import { PLAN_LIMITS } from '@/types/database';

export default function SettingsPage() {
  const { profile, plan, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);

    await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const limits = PLAN_LIMITS[plan];

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account</p>
      </div>

      {/* Profile */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" /> Profile
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-400">
            <Mail className="w-4 h-4" />
            {profile?.email}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : null}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Plan details */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-violet-400" /> Plan Details
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {[
            ['Plan', plan.charAt(0).toUpperCase() + plan.slice(1)],
            ['Uploads/day', limits.uploads_per_day === Infinity ? 'Unlimited' : String(limits.uploads_per_day)],
            ['Max file size', `${limits.max_file_size_mb} MB`],
            ['Max rows', limits.max_rows.toLocaleString()],
            ['Exports', limits.exports_enabled ? 'Enabled' : 'Disabled'],
            ['Saved projects', limits.saved_projects === Infinity ? 'Unlimited' : String(limits.saved_projects)],
          ].map(([label, value]) => (
            <div key={label} className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
