import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';

const WEBHOOK_SECRET = process.env.TONCONSOLE_WEBHOOK_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

function calcProUntil(plan: string, currentProUntil: string | null): string | null {
  if (plan === 'lifetime') return null;
  const now = new Date();
  const base = currentProUntil && new Date(currentProUntil) > now
    ? new Date(currentProUntil)
    : now;
  if (plan === 'monthly') base.setDate(base.getDate() + 30);
  if (plan === 'yearly')  base.setDate(base.getDate() + 365);
  return base.toISOString();
}

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export async function POST(req: NextRequest) {
  // Verify webhook secret if configured
  if (WEBHOOK_SECRET) {
    const incoming = req.headers.get('x-webhook-token')
      ?? req.headers.get('authorization')?.replace('Bearer ', '')
      ?? '';
    try {
      const a = Buffer.from(incoming);
      const b = Buffer.from(WEBHOOK_SECRET);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  // Log first 500 chars to debug the exact webhook format on first run
  console.log('[ton/webhook] payload:', JSON.stringify(body).slice(0, 500));

  // TonConsole/TonAPI send account transaction events.
  // Support both single-tx and batch formats.
  const txs: unknown[] = Array.isArray(body.transactions)
    ? body.transactions
    : Array.isArray(body.data?.transactions)
      ? body.data.transactions
      : [body.data ?? body];

  const supabase = createServiceClient();

  for (const tx of txs) {
    const txObj = tx as Record<string, unknown>;

    // Extract incoming message from common field names
    const inMsg = (
      txObj.in_msg ??
      txObj.inMsg ??
      (txObj.data as Record<string, unknown>)?.in_msg
    ) as Record<string, unknown> | undefined;

    if (!inMsg) continue;

    // Extract memo text from decoded body
    const memo: string =
      (inMsg.decoded_body as Record<string, string>)?.text ??
      (inMsg as Record<string, string>).comment ??
      (txObj as Record<string, string>).comment ??
      '';

    if (!memo.startsWith('sub-')) continue;

    const valueNano = Number(inMsg.value ?? inMsg.amount ?? 0);
    const txHash = String(txObj.hash ?? txObj.tx_hash ?? txObj.txHash ?? '');

    // Find the pending non-expired payment by memo
    const { data: payment, error } = await supabase
      .from('ton_payments')
      .select('id, user_id, plan, amount_nano, status, expires_at')
      .eq('memo', memo)
      .eq('status', 'pending')
      .maybeSingle();

    if (error || !payment) {
      console.warn('[ton/webhook] no pending payment for memo:', memo);
      continue;
    }

    // Reject if payment window expired (allow 1h grace period for slow blocks)
    if (payment.expires_at && new Date(payment.expires_at) < new Date(Date.now() - 60 * 60 * 1000)) {
      console.warn('[ton/webhook] payment expired for memo:', memo);
      continue;
    }

    // Verify amount received (allow 2% tolerance for rounding)
    const expectedNano = Number(payment.amount_nano);
    if (valueNano < expectedNano * 0.98) {
      console.warn('[ton/webhook] insufficient amount', { received: valueNano, expected: expectedNano });
      continue;
    }

    // Mark payment paid
    await supabase
      .from('ton_payments')
      .update({ status: 'paid', tx_hash: txHash, paid_at: new Date().toISOString() })
      .eq('id', payment.id);

    // Activate PRO for the user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, pro_until, telegram_chat_id')
      .eq('id', payment.user_id)
      .maybeSingle();

    if (!profile) continue;

    const proUntil = calcProUntil(payment.plan, profile.pro_until ?? null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_pro: true, pro_until: proUntil })
      .eq('id', profile.id);

    if (updateError) {
      console.error('[ton/webhook] CRITICAL: payment paid but PRO activation failed for user:', profile.id, updateError.message);
      continue;
    }

    console.log('[ton/webhook] PRO activated for user:', profile.id, 'plan:', payment.plan);

    const planLabel: Record<string, string> = {
      monthly:  '🗓 Месячный план (30 дней)',
      yearly:   '📅 Годовой план (365 дней)',
      lifetime: '♾ Пожизненный доступ',
    };

    if (profile.telegram_chat_id) {
      await sendTelegramMessage(
        profile.telegram_chat_id,
        `✅ <b>SubEasy PRO активирован!</b>\n\n${planLabel[payment.plan] ?? 'PRO'}\n💎 Оплата через TON\n\nОткройте приложение — все функции уже доступны 🚀`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
