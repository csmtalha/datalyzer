import type { PlanType } from '@/types/database';

/** Server-side price IDs (prefer STRIPE_*; fall back to NEXT_PUBLIC_* for Vercel parity). */
export function teamPriceId(): string {
  return (
    process.env.STRIPE_TEAM_PRICE_ID ||
    process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID ||
    ''
  ).trim();
}

export function proPriceId(): string {
  return (
    process.env.STRIPE_PRO_PRICE_ID ||
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ||
    ''
  ).trim();
}

/** Map Stripe Price ID → plan. Unknown paid prices default to `pro` so limits unlock. */
export function resolvePaidPlanFromPriceId(priceId: string | undefined): PlanType {
  if (!priceId) return 'free';
  const team = teamPriceId();
  const pro = proPriceId();
  if (team && priceId === team) return 'team';
  if (pro && priceId === pro) return 'pro';
  // Active subscription but env mismatch — still grant Pro so billing isn’t silently broken
  return 'pro';
}
