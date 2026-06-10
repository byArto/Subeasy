import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, verifyAuth } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * POST /api/push/subscribe   — save the caller's Web Push subscription.
 * DELETE /api/push/subscribe?endpoint=... — remove one of the caller's subscriptions.
 *
 * Requires Authorization: Bearer <jwt>. Subscriptions are written with the service
 * client; clients never read this table directly (RLS denies them).
 */
export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await checkRateLimit('push-subscribe', user.id, 20, 60))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;

  if (
    typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 1000 ||
    typeof p256dh !== 'string' || typeof auth !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: 'endpoint' });

  if (error) {
    console.error('[push/subscribe] upsert failed');
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const endpoint = req.nextUrl.searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

  const supabase = createServiceClient();
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  return NextResponse.json({ ok: true });
}
