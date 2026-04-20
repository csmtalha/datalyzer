'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  BarChart2, Upload, Clock, Settings, CreditCard,
  LayoutDashboard, LogOut, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/billing', label: 'Billing', icon: CreditCard },
];

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-slate-700 text-slate-300',
  pro: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  team: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, plan } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <aside
      className={`flex flex-col h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-800 flex-shrink-0">
        <div className="w-7 h-7 bg-linear-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white tracking-tight">Datalyze</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade card */}
      {plan === 'free' && !collapsed && (
        <div className="mx-3 mb-3 p-3 bg-linear-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-300">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">Unlock unlimited uploads, exports & insights</p>
          <Link
            href="/billing"
            className="block w-full text-center px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            View Plans
          </Link>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-slate-800 px-3 py-3 flex-shrink-0">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-slate-300">
              {(profile?.full_name?.[0] || profile?.email?.[0] || '?').toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {profile?.full_name || 'User'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${PLAN_BADGE[plan]}`}>
                  {plan}
                </span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
