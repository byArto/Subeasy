import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, verifyAuth } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const workspaceId: string = body?.workspaceId;
    const userId = authUser.id;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .eq('owner_id', userId)
      .maybeSingle();

    if (!workspace) {
      return NextResponse.json({ error: 'Not found or not owner' }, { status: 403 });
    }

    // Unlink subscriptions (set workspace_id to null instead of deleting)
    await supabase
      .from('subscriptions')
      .update({ workspace_id: null })
      .eq('workspace_id', workspaceId);

    // Delete workspace (cascades to workspace_members via FK)
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      console.error('[workspace/delete] error:', error);
      return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[workspace/delete] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
