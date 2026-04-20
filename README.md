# Datalyze — SaaS Data Analytics Dashboard

A production-ready, monetized SaaS analytics platform. Upload CSV, Excel, PDF, or Word files and get instant interactive dashboards with AI-powered insights, team collaboration, and Stripe billing.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your Supabase + Stripe keys (see below)

# 3. Run database migration
# In Supabase SQL Editor, run: supabase/migrations/001_initial.sql

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for Pro plan ($12/mo) |
| `STRIPE_TEAM_PRICE_ID` | Stripe Price ID for Team plan ($29/mo) |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Same Pro price ID (client-side) |
| `NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID` | Same Team price ID (client-side) |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. `http://localhost:3000`) |

## Features

### Analytics Engine
- Drag-and-drop file upload (CSV, XLSX, PDF, DOCX)
- Auto-detects column types (numeric, categorical, date, boolean, text)
- Summary stats: mean, median, min, max, std dev, quartiles
- Correlation analysis and outlier detection
- Auto-generated charts: bar, line, pie, histogram, scatter
- AI-powered smart insights with trend/anomaly detection

### SaaS Platform
- Email/password + Google OAuth authentication (Supabase Auth)
- Three-tier subscription plans (Free / Pro / Team)
- Stripe checkout, subscription management, and billing portal
- Per-user usage tracking and limit enforcement
- Saved projects with rename/delete
- Feature gating with upgrade prompts
- Sidebar navigation (Dashboard, Upload, History, Settings, Billing)

### Plans

| Feature | Free | Pro ($12/mo) | Team ($29/mo) |
|---|---|---|---|
| Uploads/day | 1 | Unlimited | Unlimited |
| Max file size | 5 MB | 50 MB | 100 MB |
| Max rows | 1,000 | 100,000 | 500,000 |
| Export PDF/Excel | No | Yes | Yes |
| Saved projects | 1 | Unlimited | Unlimited |
| Full insights | No | Yes | Yes |
| Team members | 1 | 1 | 10 |

## Project Structure

```
app/
  page.tsx                    → Public landing page with pricing
  layout.tsx                  → Root layout
  (auth)/
    login/page.tsx            → Email/password + Google login
    signup/page.tsx           → Registration with email confirmation
  (dashboard)/
    layout.tsx                → Sidebar layout with auth guard
    dashboard/page.tsx        → Dashboard overview with KPIs
    upload/page.tsx           → File upload + analytics display
    history/page.tsx          → Saved projects & upload log
    settings/page.tsx         → Profile & plan details
    billing/page.tsx          → Pricing cards & subscription management
    project/[id]/page.tsx     → View/rename saved projects
  auth/callback/route.ts      → OAuth callback handler
  api/
    parse/route.ts            → File parsing + analytics (with limits)
    export-excel/route.ts     → Excel export
    billing/
      checkout/route.ts       → Stripe checkout session
      portal/route.ts         → Stripe billing portal
      webhook/route.ts        → Stripe webhook handler
    projects/
      route.ts                → List/create projects
      [id]/route.ts           → Get/update/delete project

components/
  auth/AuthProvider.tsx        → Auth context with user/plan/limits
  billing/
    PricingCards.tsx           → Three-tier pricing UI
    UpgradeModal.tsx           → Feature-gated upgrade prompts
  charts/ChartPanel.tsx        → Recharts visualization
  dashboard/
    Dashboard.tsx              → Tabbed analytics display
    Sidebar.tsx                → App navigation sidebar
    KPICards.tsx, DataTable.tsx, ColumnStats.tsx,
    ExportButtons.tsx, InsightsPanel.tsx
  upload/UploadZone.tsx        → Drag-and-drop upload
  ui/LoadingSkeleton.tsx       → Loading states

lib/
  supabase/
    client.ts                  → Browser Supabase client
    server.ts                  → Server Supabase client + service role
    middleware.ts              → Session refresh logic
  stripe/
    client.ts                  → Stripe SDK instance
    plans.ts                   → Plan definitions
  analytics.ts                 → Stats engine
  chartConfig.ts               → Auto chart generation
  insights.ts                  → Enhanced insights with trend/anomaly detection
  usage.ts                     → Usage tracking and limit checks

types/
  analytics.ts                 → Analytics types
  database.ts                  → DB types + plan limits

supabase/migrations/
  001_initial.sql              → Database schema (profiles, projects, uploads, usage_logs)

proxy.ts                       → Next.js proxy (auth route protection)
```

## Setup Guide

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Copy URL and keys to `.env.local`
3. Run `supabase/migrations/001_initial.sql` in the SQL Editor
4. Enable Google OAuth in Authentication → Providers (optional)

### 2. Stripe
1. Create products/prices in [Stripe Dashboard](https://dashboard.stripe.com)
2. Create a Pro product ($12/mo recurring) and Team product ($29/mo recurring)
3. Copy price IDs to `.env.local`
4. Set up webhook endpoint: `https://your-domain.com/api/billing/webhook`
5. Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 3. Deploy to Vercel
```bash
vercel
```
Add all environment variables in Vercel project settings.

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
```
