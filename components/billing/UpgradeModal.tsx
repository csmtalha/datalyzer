'use client';

import { X, Sparkles, Check } from 'lucide-react';
import { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  feature?: string;
}

export default function UpgradeModal({ isOpen, onClose, reason, feature }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (priceId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  const proFeatures = [
    'Unlimited uploads',
    'Up to 100,000 rows',
    'PDF & Excel export',
    'Full AI insights',
    'Unlimited saved projects',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-linear-to-br from-cyan-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {feature ? `Unlock ${feature}` : 'Upgrade to Pro'}
          </h2>
          {reason && (
            <p className="text-sm text-slate-400 mt-2">{reason}</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {proFeatures.map((f) => (
            <div key={f} className="flex items-center gap-3">
              <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-sm text-slate-300">{f}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '')}
          disabled={loading}
          className="w-full py-3 bg-linear-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-all"
        >
          {loading ? 'Redirecting...' : 'Upgrade to Pro — $12/mo'}
        </button>

        <p className="text-center text-xs text-slate-500 mt-3">
          Cancel anytime. 7-day money back guarantee.
        </p>
      </div>
    </div>
  );
}
