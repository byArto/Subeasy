import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json();

    if (!userId || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Find workspace by invite token
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('invite_token', token)
      .maybeSingle();

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    // Owner can't join their own workspace (they're already a member)
    if (workspace.owner_id === userId) {
      return NextResponse.json({ error: 'Already owner' }, { status: 409 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspace.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Already a member — return workspace data (idempotent)
      return NextResponse.json({ workspaceId: workspace.id, workspaceName: workspace.name });
    }

    // Check member limit (max 6 total including owner)
    const { count } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id);

    if ((count ?? 0) >= 6) {
      return NextResponse.json({ error: 'Workspace is full (max 6 members)' }, { status: 409 });
    }

    // Insert member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: workspace.id, user_id: userId, role: 'member' });

    if (memberError) {
      console.error('[workspace/join] member insert error:', memberError);
      return NextResponse.json({ error: 'Failed to join workspace' }, { status: 500 });
    }

    return NextResponse.json({ workspaceId: workspace.id, workspaceName: workspace.name });
  } catch (err) {
    console.error('[workspace/join] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
