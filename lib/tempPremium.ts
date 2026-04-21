import type { PlanType } from '@/types/database';

function envTruthy(v: string | undefined): boolean {
  if (v == null || v === '') return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

/**
 * Temporarily grant Pro-tier limits and UI to every user (promos, staging, incidents).
 *
 * - **Dashboard / client:** set `NEXT_PUBLIC_TEMP_PREMIUM_ALL=true` (inlined at build time).
 * - **Server / API only:** `TEMP_PREMIUM_ALL=true` (not sent to the browser; UI stays on stored plan unless NEXT_PUBLIC is also set).
 */
export function isTempPremiumAllEnabled(): boolean {
  return (
    envTruthy(process.env.TEMP_PREMIUM_ALL) ||
    envTruthy(process.env.NEXT_PUBLIC_TEMP_PREMIUM_ALL)
  );
}

export function effectivePlan(storedPlan: PlanType): PlanType {
  if (!isTempPremiumAllEnabled()) return storedPlan;
  if (storedPlan === 'team') return 'team';
  return 'pro';
}
