'use client';

import { useState } from 'react';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { PlanType } from '@/types/database';

interface PlanCard {
  id: PlanType;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  priceEnvKey: string | null;
}

const plans: PlanCard[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Get started with basic analytics',
    features: [
      '1 upload per day',
      'Up to 1,000 rows',
      'Basic charts',
      '1 saved project',
      'Limited insights',
    ],
    priceEnvKey: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    description: 'Full power for professionals',
    features: [
      'Unlimited uploads',
      'Up to 100,000 rows',
      'All chart types',
      'PDF & Excel export',
      'Full AI insights',
      'Unlimited projects',
    ],
    highlighted: true,
    priceEnvKey: 'NEXT_PUBLIC_STRIPE_PRO_PRICE_ID',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$29',
    description: 'Collaborate with your team',
    features: [
      'Everything in Pro',
      'Up to 500,000 rows',
      '10 team members',
      'Shared dashboards',
      'Priority support',
      'Team analytics',
    ],
    priceEnvKey: 'NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID',
  },
];

export default function PricingCards() {
  const { plan: currentPlan } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: PlanType) => {
    if (planId === 'free' || planId === currentPlan) return;
    setLoadingPlan(planId);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: planId === 'team'
            ? process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID
            : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoadingPlan(null);
    }
  };

  const handlePortal = async () => {
    setLoadingPlan('portal');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((p) => {
        const isCurrent = p.id === currentPlan;
        const isHigher = plans.findIndex(x => x.id === p.id) > plans.findIndex(x => x.id === currentPlan);

        return (
          <div
            key={p.id}
            className={`relative rounded-2xl border p-6 transition-all ${
              p.highlighted
                ? 'border-cyan-500/40 bg-linear-to-b from-cyan-500/10 to-transparent'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            {p.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Most Popular
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white">{p.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{p.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">{p.price}</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {p.features.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check className={`w-4 h-4 flex-shrink-0 ${p.highlighted ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>

            {isCurrent ? (
              currentPlan !== 'free' ? (
                <button
                  onClick={handlePortal}
                  disabled={loadingPlan === 'portal'}
                  className="w-full py-2.5 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loadingPlan === 'portal' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Manage Subscription
                </button>
              ) : (
                <div className="w-full py-2.5 border border-slate-700 text-slate-500 rounded-xl text-sm font-medium text-center">
                  Current Plan
                </div>
              )
            ) : isHigher ? (
              <button
                onClick={() => handleSubscribe(p.id)}
                disabled={loadingPlan === p.id}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  p.highlighted
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {loadingPlan === p.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Upgrade
              </button>
            ) : (
              <button
                onClick={handlePortal}
                disabled={loadingPlan === 'portal'}
                className="w-full py-2.5 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loadingPlan === 'portal' && <Loader2 className="w-4 h-4 animate-spin" />}
                Downgrade
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
