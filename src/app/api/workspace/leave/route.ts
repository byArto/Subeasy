import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await req.json();

    if (!workspaceId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify workspace exists and get owner
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Owner cannot leave — they must delete the workspace
    if (workspace.owner_id === userId) {
      return NextResponse.json({ error: 'Owner cannot leave. Delete the workspace instead.' }, { status: 403 });
    }

    // Remove from workspace_members
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[workspace/leave] delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to leave workspace' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[workspace/leave] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
