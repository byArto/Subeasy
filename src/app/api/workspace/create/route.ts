import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { name, userId } = await req.json();

    if (!userId || !name?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check PRO status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, pro_until')
      .eq('id', userId)
      .single();

    if (!profile?.is_pro) {
      return NextResponse.json({ error: 'PRO required' }, { status: 403 });
    }

    const proUntil = profile.pro_until ? new Date(profile.pro_until) : null;
    if (proUntil && proUntil < new Date()) {
      return NextResponse.json({ error: 'PRO expired' }, { status: 403 });
    }

    // Check if user already owns a workspace
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already has workspace' }, { status: 409 });
    }

    // Create workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), owner_id: userId })
      .select('id, invite_token')
      .single();

    if (wsError || !workspace) {
      console.error('[workspace/create] error:', wsError);
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }

    // Add owner as member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: workspace.id, user_id: userId, role: 'owner' });

    if (memberError) {
      console.error('[workspace/create] member insert error:', memberError);
      // Rollback workspace
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      return NextResponse.json({ error: 'Failed to add owner as member' }, { status: 500 });
    }

    return NextResponse.json({ id: workspace.id, inviteToken: workspace.invite_token });
  } catch (err) {
    console.error('[workspace/create] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
