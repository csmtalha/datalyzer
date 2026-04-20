'use client';

import Link from 'next/link';
import {
  BarChart2, Sparkles, Zap, Shield, ArrowRight,
  Upload, TrendingUp, FileText, Check, CreditCard,
} from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Instant Analysis', desc: 'Statistical summaries, correlations, and outlier detection in seconds.' },
  { icon: BarChart2, title: 'Smart Charts', desc: 'Auto-generated bar, line, pie, histogram, and scatter plots.' },
  { icon: TrendingUp, title: 'AI Insights', desc: 'Automatic trend detection, anomaly alerts, and human-readable summaries.' },
  { icon: FileText, title: 'PDF & Excel Export', desc: 'Download professional reports with one click.' },
  { icon: Upload, title: 'Multi-Format Upload', desc: 'Supports CSV, Excel, PDF, and Word documents.' },
  { icon: Shield, title: 'Secure by Default', desc: 'Data processed server-side. Enterprise-grade security.' },
];

const PLANS = [
  {
    name: 'Free', price: '$0', period: '/mo',
    features: ['1 upload per day', 'Up to 1,000 rows', 'Basic charts', '1 saved project'],
  },
  {
    name: 'Pro', price: '$12', period: '/mo', highlighted: true,
    features: ['Unlimited uploads', '100,000 rows', 'Full AI insights', 'PDF & Excel export', 'Unlimited projects'],
  },
  {
    name: 'Team', price: '$29', period: '/mo',
    features: ['Everything in Pro', '500,000 rows', '10 team members', 'Shared dashboards', 'Priority support'],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080e1a] text-slate-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:60px_60px] opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(6,182,212,0.06)_0%,transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.05)_0%,transparent_60%)] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-slate-800/60 backdrop-blur-sm bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-linear-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">Datalyze</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-400">
              <Sparkles className="w-3 h-3" />
              Now with AI-powered insights engine
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
              Upload a file.<br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-violet-400">
                Get instant insights.
              </span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
              Drop any CSV, Excel, PDF, or Word file. Datalyze auto-detects structure,
              runs statistical analysis, detects trends, and generates interactive charts — in seconds.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-colors"
              >
                Start Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-medium rounded-xl transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">Everything you need to analyze data</h2>
            <p className="text-slate-400 mt-3">Powerful analytics that just works. No setup, no learning curve.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="font-semibold text-slate-200">{f.title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-5xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-400 mb-4">
              <CreditCard className="w-3 h-3" /> Simple Pricing
            </div>
            <h2 className="text-3xl font-bold text-white">Choose your plan</h2>
            <p className="text-slate-400 mt-3">Start free. Upgrade when you need more power.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 ${
                  plan.highlighted
                    ? 'border-cyan-500/40 bg-linear-to-b from-cyan-500/10 to-transparent'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="mt-3 mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.period}</span>
                </div>
                <div className="space-y-3 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                      <Check className={`w-4 h-4 ${plan.highlighted ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="text-sm text-slate-300">{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className={`block w-full text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <div className="text-center bg-linear-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-3xl p-12">
            <h2 className="text-3xl font-bold text-white">Ready to analyze your data?</h2>
            <p className="text-slate-400 mt-3 max-w-lg mx-auto">
              Join thousands of analysts, data scientists, and business teams using Datalyze.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 mt-6 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-colors"
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800 py-8">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-linear-to-br from-cyan-400 to-cyan-600 rounded flex items-center justify-center">
                <BarChart2 className="w-3 h-3 text-white" />
              </div>
              Datalyze
            </div>
            <p>&copy; {new Date().getFullYear()} Datalyze. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
