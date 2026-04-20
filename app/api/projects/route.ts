import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS, PlanType } from '@/types/database';

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();
    const plan = (profile?.plan ?? 'free') as PlanType;
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
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: body.name,
        file_name: body.fileName,
        file_type: body.fileType,
        row_count: body.rowCount,
        column_count: body.columnCount,
        analytics_data: body.analyticsData,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Project create error:', err);
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}
