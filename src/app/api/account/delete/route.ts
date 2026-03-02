import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, verifyAuth } from '@/lib/supabase-server';

/**
 * DELETE /api/account/delete
 * Permanently deletes all user data + auth account.
 * GDPR compliance: responds to user's right to erasure.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authUser.id;
    const supabase = createServiceClient();

    // 1. Remove from workspace memberships (leave all workspaces as member)
    await supabase
      .from('workspace_members')
      .delete()
      .eq('user_id', userId);

    // 2. For workspaces where user is owner — unlink subs and delete workspace
    const { data: ownedWorkspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId);

    for (const ws of ownedWorkspaces ?? []) {
      await supabase
        .from('subscriptions')
        .update({ workspace_id: null })
        .eq('workspace_id', ws.id);

      await supabase
        .from('workspaces')
        .delete()
        .eq('id', ws.id);
    }

    // 3. Delete all personal subscriptions
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    // 4. Delete the auth user (this also removes their profile row if cascade is set)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('[account/delete] auth.admin.deleteUser error:', deleteUserError);
      return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[account/delete] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
