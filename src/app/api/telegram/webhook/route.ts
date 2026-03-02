import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;

const VALID_PLANS = new Set(['pro_monthly', 'pro_yearly', 'pro_lifetime']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate pro_until based on plan payload, extending from `base` if still active.
 * Returns null for lifetime (no expiry).
 */
function calcProUntil(payload: string, currentProUntil: string | null): string | null {
  if (payload === 'pro_lifetime') return null;

  // Start from the later of: now OR current expiry (so early renewal doesn't lose days)
  const now = new Date();
  const base = currentProUntil && new Date(currentProUntil) > now
    ? new Date(currentProUntil)
    : now;

  if (payload === 'pro_monthly') {
    base.setDate(base.getDate() + 30);
    return base.toISOString();
  }
  if (payload === 'pro_yearly') {
    base.setDate(base.getDate() + 365);
    return base.toISOString();
  }
  return null;
}

async function answerPreCheckout(queryId: string, ok: boolean, errorMessage?: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pre_checkout_query_id: queryId,
      ok,
      ...(ok ? {} : { error_message: errorMessage ?? 'Invalid request' }),
    }),
  });
}

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Verify the request comes from Telegram (timing-safe comparison)
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  const secretValid = (() => {
    try {
      if (!WEBHOOK_SECRET || !secret) return false;
      const a = Buffer.from(secret);
      const b = Buffer.from(WEBHOOK_SECRET);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch { return false; }
  })();
  if (!secretValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  // ── /paysupport command ───────────────────────────────────────────────────
  if (update.message?.text?.startsWith('/paysupport')) {
    const chatId: number = update.message.chat.id;
    await sendMessage(
      chatId,
      '💬 <b>Поддержка по оплате SubEasy PRO</b>\n\nЕсли возникли проблемы с оплатой или активацией — напишите нам: @by_arto\n\nОтвечаем в течение 24 часов.',
    );
    return NextResponse.json({ ok: true });
  }

  // ── pre_checkout_query ────────────────────────────────────────────────────
  // Must answer within 10 seconds or Telegram will decline the payment
  if (update.pre_checkout_query) {
    const pcqPayload: string = update.pre_checkout_query.invoice_payload;
    if (!VALID_PLANS.has(pcqPayload)) {
      console.warn('[webhook/pre_checkout] unknown payload:', pcqPayload);
      await answerPreCheckout(update.pre_checkout_query.id, false, 'Unknown plan');
      return NextResponse.json({ ok: true });
    }
    await answerPreCheckout(update.pre_checkout_query.id, true);
    return NextResponse.json({ ok: true });
  }

  // ── successful_payment ────────────────────────────────────────────────────
  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const telegramUserId: number = update.message.from.id;
    const chatId: number = update.message.chat.id;
    const payload: string = payment.invoice_payload; // 'pro_monthly' | 'pro_yearly' | 'pro_lifetime'

    if (!VALID_PLANS.has(payload)) {
      console.error('[webhook/payment] unknown invoice_payload, ignoring:', payload);
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceClient();

    // Find SubEasy user by linked telegram_chat_id
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id, pro_until')
      .eq('telegram_chat_id', telegramUserId)
      .maybeSingle();

    if (lookupError) {
      console.error('[webhook/payment] profile lookup error:', lookupError.message);
    }

    if (!profile) {
      await sendMessage(
        chatId,
        '❌ <b>Аккаунт не найден.</b>\n\nОткройте SubEasy через Telegram-бота, чтобы привязать аккаунт, и обратитесь в поддержку.',
      );
      return NextResponse.json({ ok: true });
    }

    const proUntil = calcProUntil(payload, profile.pro_until ?? null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_pro: true, pro_until: proUntil, last_stars_charge_id: payment.telegram_payment_charge_id })
      .eq('id', profile.id);

    if (updateError) {
      console.error('[webhook/payment] profile update error:', updateError.message);
      await sendMessage(chatId, '⚠️ Оплата получена, но произошла ошибка активации. Напишите в поддержку — всё решим.');
      return NextResponse.json({ ok: true });
    }

    const planLabel: Record<string, string> = {
      pro_monthly:  '🗓 Месячный план (30 дней)',
      pro_yearly:   '📅 Годовой план (365 дней)',
      pro_lifetime: '♾ Пожизненный доступ',
    };

    await sendMessage(
      chatId,
      `✅ <b>SubEasy PRO активирован!</b>\n\n${planLabel[payload] ?? 'PRO'}\n\nОткройте приложение — все функции уже доступны 🚀`,
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
