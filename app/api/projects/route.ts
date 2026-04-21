import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { slimAnalyticsForStorage } from '@/lib/slimAnalyticsForStorage';
import type { AnalyticsResult } from '@/types/analytics';
import { PLAN_LIMITS, PlanType } from '@/types/database';
import { effectivePlan } from '@/lib/tempPremium';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, file_name, file_type, row_count, column_count, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Projects list error:', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) console.warn('Profile select:', profileErr.message);
    if (!profile) {
      return NextResponse.json(
        {
          error: 'No profile row for your account.',
          details:
            'Supabase should create this on signup. Add a row in public.profiles with id = your auth user id, or re-run the handle_new_user trigger.',
          code: 'NO_PROFILE',
        },
        { status: 400 }
      );
    }

    const plan = effectivePlan((profile.plan ?? 'free') as PlanType);
    const limits = PLAN_LIMITS[plan];

    if (limits.saved_projects !== Infinity) {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((count ?? 0) >= limits.saved_projects) {
        return NextResponse.json(
          { error: `You've reached your project limit (${limits.saved_projects}). Upgrade to save more.` },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    if (!body?.name || !body?.analyticsData) {
      return NextResponse.json({ error: 'Missing name or analyticsData' }, { status: 400 });
    }

    const analytics = slimAnalyticsForStorage(body.analyticsData as AnalyticsResult);

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: String(body.name).slice(0, 500),
        file_name: String(body.fileName ?? '').slice(0, 500),
        file_type: String(body.fileType ?? '').slice(0, 100),
        row_count: Number(body.rowCount) || 0,
        column_count: Number(body.columnCount) || 0,
        analytics_data: analytics as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (error) {
      console.error('Project insert error:', error.code, error.message, error.details);
      const hint =
        error.code === '23503'
          ? 'Your account profile row is missing in the database (FK). Try re-signing up or run the profiles trigger.'
          : error.code === '42501' || error.message?.includes('permission')
            ? 'Row-level security blocked this insert. Check Supabase policies on public.projects.'
            : error.message;
      return NextResponse.json(
        { error: 'Failed to save project', details: hint, code: error.code },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('Project create error:', err);
    const message = err instanceof Error ? err.message : 'Failed to save project';
    return NextResponse.json({ error: message, details: message }, { status: 500 });
  }
}
