export type PlanType = 'free' | 'pro' | 'team';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: PlanType;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  file_name: string;
  file_type: string;
  row_count: number;
  column_count: number;
  analytics_data: string; // JSON stringified AnalyticsResult
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  row_count: number;
  project_id: string | null;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  action: 'upload' | 'export_pdf' | 'export_excel' | 'insight_view';
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PlanLimits {
  uploads_per_day: number;
  max_file_size_mb: number;
  max_rows: number;
  exports_enabled: boolean;
  saved_projects: number;
  insights_full: boolean;
  shared_dashboards: boolean;
  team_members: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    uploads_per_day: 1,
    max_file_size_mb: 5,
    max_rows: 1000,
    exports_enabled: false,
    saved_projects: 1,
    insights_full: false,
    shared_dashboards: false,
    team_members: 1,
  },
  pro: {
    uploads_per_day: Infinity,
    max_file_size_mb: 50,
    max_rows: 100000,
    exports_enabled: true,
    saved_projects: Infinity,
    insights_full: true,
    shared_dashboards: false,
    team_members: 1,
  },
  team: {
    uploads_per_day: Infinity,
    max_file_size_mb: 100,
    max_rows: 500000,
    exports_enabled: true,
    saved_projects: Infinity,
    insights_full: true,
    shared_dashboards: true,
    team_members: 10,
  },
};
