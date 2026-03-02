import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, verifyAuth } from '@/lib/supabase-server';

/**
 * GET /api/workspace/mine
 * Returns the caller's workspace + all members (bypasses RLS via service client).
 * Requires Authorization: Bearer <jwt> header.
 */
export async function GET(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = authUser.id;

  const supabase = createServiceClient();

  // Step 1: find user's membership
  const { data: memberRow, error: mErr } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, joined_at')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (mErr || !memberRow) {
    return NextResponse.json(null);
  }

  // Step 2: fetch workspace
  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, name, owner_id, invite_token, created_at')
    .eq('id', memberRow.workspace_id)
    .single();

  if (wsErr || !ws) {
    return NextResponse.json(null);
  }

  // Step 3: fetch all members
  const { data: allMembers } = await supabase
    .from('workspace_members')
    .select('workspace_id, user_id, role, joined_at')
    .eq('workspace_id', ws.id);

  const isOwner = ws.owner_id === userId;

  return NextResponse.json({
    workspace: {
      id: ws.id,
      name: ws.name,
      ownerId: ws.owner_id,
      // Only expose invite_token to the workspace owner
      inviteToken: isOwner ? ws.invite_token : null,
      createdAt: ws.created_at,
    },
    members: (allMembers ?? []).map((m: { workspace_id: string; user_id: string; role: string; joined_at: string }) => ({
      workspaceId: m.workspace_id,
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
    })),
  });
}
