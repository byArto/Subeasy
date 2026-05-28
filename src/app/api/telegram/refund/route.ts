import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';
import { env } from '@/lib/env';
import { isMonetizationEnabled } from '@/lib/monetization';

const BOT_TOKEN = env('TELEGRAM_BOT_TOKEN');
// Dedicated admin secret if set, otherwise falls back to the webhook secret.
const ADMIN_SECRET = env('ADMIN_API_SECRET' in process.env ? 'ADMIN_API_SECRET' : 'TELEGRAM_WEBHOOK_SECRET');

export async function POST(req: NextRequest) {
  if (!isMonetizationEnabled()) {
    return NextResponse.json({ error: 'Payments are disabled' }, { status: 404 });
  }

  // Admin-only (constant-time secret comparison)
  const secret = req.headers.get('x-admin-secret') ?? '';
  const secretBuf = Buffer.from(secret);
  const expectedBuf = Buffer.from(ADMIN_SECRET());
  if (secretBuf.length !== expectedBuf.length || !timingSafeEqual(secretBuf, expectedBuf)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { charge_id, telegram_user_id } = body ?? {};

  if (!charge_id || !telegram_user_id) {
    return NextResponse.json(
      { error: 'charge_id and telegram_user_id are required' },
      { status: 400 },
    );
  }

  // Refund Stars via Telegram API
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN()}/refundStarPayment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: telegram_user_id,
      telegram_payment_charge_id: charge_id,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error('[refund] Telegram error:', data);
    return NextResponse.json({ error: data.description ?? 'Telegram API error' }, { status: 502 });
  }

  // Revoke PRO access in Supabase
  const supabase = createServiceClient();
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_pro: false, pro_until: null })
    .eq('telegram_chat_id', telegram_user_id);

  if (updateError) {
    console.error('[refund] profile update error:', updateError.message);
    return NextResponse.json({
      ok: true,
      warning: 'Stars refunded but PRO revocation failed — fix manually in Supabase.',
    });
  }

  return NextResponse.json({ ok: true, message: 'Stars refunded and PRO revoked' });
}
