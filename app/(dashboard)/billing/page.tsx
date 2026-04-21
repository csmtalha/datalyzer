'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import PricingCards from '@/components/billing/PricingCards';
import { CheckCircle, XCircle, CreditCard, Loader2 } from 'lucide-react';

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 text-sm">Loading…</div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const { plan, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const [syncBusy, setSyncBusy] = useState(() => !!success);

  useEffect(() => {
    if (!success) {
      setSyncBusy(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setSyncBusy(true);

      const syncOnce = async () => {
        try {
          const res = await fetch('/api/billing/sync', { method: 'POST' });
          return (await res.json()) as { plan?: string };
        } catch {
          return {};
        }
      };

      let data = await syncOnce();
      await refreshProfile();
      if (!cancelled && data.plan && data.plan !== 'free') {
        setSyncBusy(false);
        router.replace('/billing');
        return;
      }

      for (let i = 0; i < 10; i++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, i === 0 ? 500 : 1200));
        data = await syncOnce();
        await refreshProfile();
        if (!cancelled && data.plan && data.plan !== 'free') {
          break;
        }
      }

      if (!cancelled) {
        await refreshProfile();
        router.replace('/billing');
      }
      setSyncBusy(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [success, refreshProfile, router]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-cyan-400" />
          Billing & Plans
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Currently on the <strong className="text-white capitalize">{plan}</strong> plan
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Subscription activated!</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">
              Syncing your plan with Stripe… If this stays on Free after a few seconds, check that{' '}
              <code className="text-emerald-300/90">STRIPE_WEBHOOK_SECRET</code> and price IDs match your Stripe Dashboard.
            </p>
            {syncBusy && (
              <p className="text-xs text-emerald-400/60 mt-2 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating account…
              </p>
            )}
          </div>
        </div>
      )}

      {canceled && (
        <div className="flex items-center gap-3 p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-400">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Checkout canceled</p>
            <p className="text-xs text-amber-400/70 mt-0.5">No changes were made to your subscription.</p>
          </div>
        </div>
      )}

      <PricingCards />
    </div>
  );
}
