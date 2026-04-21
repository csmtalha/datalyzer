import { SupabaseClient } from '@supabase/supabase-js';
import { PlanType, PLAN_LIMITS } from '@/types/database';
import { effectivePlan } from '@/lib/tempPremium';

export async function getUploadsToday(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'upload')
    .gte('created_at', todayStart.toISOString());

  return count ?? 0;
}

export async function checkUploadAllowed(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanType,
  fileSizeMb: number
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = PLAN_LIMITS[effectivePlan(plan)];

  if (fileSizeMb > limits.max_file_size_mb) {
    return {
      allowed: false,
      reason: `File exceeds ${limits.max_file_size_mb}MB limit for your ${effectivePlan(plan)} plan. Upgrade to increase your limit.`,
    };
  }

  if (limits.uploads_per_day !== Infinity) {
    const todayCount = await getUploadsToday(supabase, userId);
    if (todayCount >= limits.uploads_per_day) {
      return {
        allowed: false,
        reason: `You've reached your daily upload limit (${limits.uploads_per_day}). Upgrade to Pro for unlimited uploads.`,
      };
    }
  }

  return { allowed: true };
}

export async function logUsage(
  supabase: SupabaseClient,
  userId: string,
  action: 'upload' | 'export_pdf' | 'export_excel' | 'insight_view',
  metadata?: Record<string, unknown>
) {
  await supabase.from('usage_logs').insert({
    user_id: userId,
    action,
    metadata: metadata ?? null,
  });
}

export async function getUsageStats(
  supabase: SupabaseClient,
  userId: string
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [uploadsToday, totalUploads, totalExports, totalProjects] =
    await Promise.all([
      supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action', 'upload')
        .gte('created_at', todayStart.toISOString())
        .then((r) => r.count ?? 0),
      supabase
        .from('uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .then((r) => r.count ?? 0),
      supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('action', ['export_pdf', 'export_excel'])
        .then((r) => r.count ?? 0),
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .then((r) => r.count ?? 0),
    ]);

  return { uploadsToday, totalUploads, totalExports, totalProjects };
}
