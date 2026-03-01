import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, verifyAuth } from '@/lib/supabase-server';

/**
 * GET /api/workspace/subscriptions?workspaceId=...
 * Returns all subscriptions for a workspace. Requires auth + workspace membership.
 */
export async function GET(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify caller is a member of this workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/workspace/subscriptions
 * Upserts a single subscription into a workspace. Requires auth + workspace membership.
 * Body: { subscription: Subscription, workspaceId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription: sub, workspaceId } = await req.json();

    if (!sub || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify caller is a member of this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const row = {
      id: sub.id,
      user_id: authUser.id,
      workspace_id: workspaceId,
      name: sub.name,
      price: sub.price,
      currency: sub.currency,
      category: sub.category,
      cycle: sub.cycle,
      next_payment_date: sub.nextPaymentDate,
      start_date: sub.startDate,
      payment_method: sub.paymentMethod ?? '',
      notes: sub.notes ?? '',
      color: sub.color ?? '#00FF41',
      icon: sub.icon ?? '📦',
      management_url: sub.managementUrl ?? '',
      is_active: sub.isActive ?? true,
      created_at: sub.createdAt,
      updated_at: sub.updatedAt,
    };

    const { error } = await supabase
      .from('subscriptions')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[workspace/subscriptions POST] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspace/subscriptions?id=...
 * Deletes a workspace subscription. Requires auth + membership in that subscription's workspace.
 */
export async function DELETE(req: NextRequest) {
  const authUser = await verifyAuth(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch the subscription to verify it belongs to a workspace the caller is a member of
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('workspace_id')
    .eq('id', id)
    .maybeSingle();

  if (!sub?.workspace_id) {
    return NextResponse.json({ error: 'Not found or not a workspace subscription' }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', sub.workspace_id)
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
