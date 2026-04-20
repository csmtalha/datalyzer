import { PlanType } from '@/types/database';

export interface PlanDefinition {
  id: PlanType;
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  stripePriceId: string | null;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic analytics',
    price: 0,
    priceLabel: '$0/mo',
    stripePriceId: null,
    features: [
      '1 file upload per day',
      'Up to 1,000 rows',
      'Basic charts & stats',
      '1 saved project',
      'Limited insights',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Full analytics power for professionals',
    price: 12,
    priceLabel: '$12/mo',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    highlighted: true,
    features: [
      'Unlimited uploads',
      'Up to 100,000 rows',
      'Full analytics & insights',
      'PDF & Excel export',
      'Unlimited saved projects',
      'Priority processing',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    description: 'Collaborate with your entire team',
    price: 29,
    priceLabel: '$29/mo',
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID ?? '',
    features: [
      'Everything in Pro',
      'Up to 500,000 rows',
      'Up to 10 team members',
      'Shared dashboards',
      'Priority support',
      'Team usage analytics',
    ],
  },
];
