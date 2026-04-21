import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';
import { resolvePaidPlanFromPriceId } from '@/lib/stripe/resolvePlan';
import type { PlanType } from '@/types/database';

/**
 * Pulls the customer’s subscription from Stripe and updates `profiles.plan`.
 * Call after checkout success when webhooks are slow or misconfigured.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile?.stripe_customer_id) {
      return NextResponse.json({
        plan: 'free' as PlanType,
        synced: false,
        message: 'No Stripe customer linked yet. Finish checkout once.',
      });
    }

    const stripe = getStripe();
    const list = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 15,
    });

    const sub = list.data.find(s => s.status === 'active' || s.status === 'trialing');

    let plan: PlanType = 'free';
    let stripe_subscription_id: string | null = null;

    if (sub) {
      const priceId = sub.items.data[0]?.price?.id;
      plan = resolvePaidPlanFromPriceId(priceId);
      stripe_subscription_id = sub.id;
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        plan,
        stripe_subscription_id,
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('Billing sync profile update:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ plan, synced: true, stripe_subscription_id });
  } catch (err) {
    console.error('Billing sync error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
