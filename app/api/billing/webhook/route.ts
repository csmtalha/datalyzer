import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/server';
import { resolvePaidPlanFromPriceId } from '@/lib/stripe/resolvePlan';
import type Stripe from 'stripe';

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

function checkoutUserId(session: Stripe.Checkout.Session): string | undefined {
  const fromMeta = session.metadata?.supabase_user_id;
  if (fromMeta) return fromMeta;
  const ref = session.client_reference_id;
  if (ref && ref.length > 10) return ref;
  return undefined;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const supabase = await createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = checkoutUserId(session);
        const subId = session.subscription;
        if (!userId || !subId) {
          console.warn('checkout.session.completed: missing userId or subscription', {
            hasUser: !!userId,
            hasSub: !!subId,
          });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subId as string);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = resolvePaidPlanFromPriceId(priceId);

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : (subscription.customer as string);

        const { error } = await supabase
          .from('profiles')
          .update({
            plan,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
          })
          .eq('id', userId);

        if (error) {
          console.error('Webhook profiles update failed:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile, error: selErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (selErr) console.error('Webhook profile lookup:', selErr);

        if (profile) {
          const priceId = subscription.items.data[0]?.price.id;
          let plan: 'free' | 'pro' | 'team' = 'free';
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            plan = resolvePaidPlanFromPriceId(priceId);
          }
          const { error } = await supabase
            .from('profiles')
            .update({ plan, stripe_subscription_id: subscription.id })
            .eq('id', profile.id);

          if (error) {
            console.error('Webhook subscription.updated update failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { error } = await supabase
          .from('profiles')
          .update({ plan: 'free', stripe_subscription_id: null })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('Webhook subscription.deleted update failed:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
