import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * GET /api/workspace/subscriptions?workspaceId=...
 * Returns all subscriptions for a workspace using service client (bypasses RLS).
 */
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/workspace/subscriptions
 * Upserts a single subscription into a workspace using service client (bypasses RLS).
 * Body: { subscription: Subscription, workspaceId: string, userId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { subscription: sub, workspaceId, userId } = await req.json();

    if (!sub || !workspaceId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const row = {
      id: sub.id,
      user_id: userId,
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[workspace/subscriptions POST] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspace/subscriptions?id=...
 * Deletes a single workspace subscription by id using service client (bypasses RLS).
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
