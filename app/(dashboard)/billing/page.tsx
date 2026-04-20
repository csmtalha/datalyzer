'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import PricingCards from '@/components/billing/PricingCards';
import { CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { useEffect } from 'react';

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const { plan, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success) refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

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
          <div>
            <p className="font-medium">Subscription activated!</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">Your plan has been upgraded. Enjoy full access.</p>
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
