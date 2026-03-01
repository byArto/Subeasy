import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate pro_until based on plan payload.
 * Returns null for lifetime (no expiry).
 */
function calcProUntil(payload: string): string | null {
  const now = new Date();
  if (payload === 'pro_monthly') {
    now.setDate(now.getDate() + 30);
    return now.toISOString();
  }
  if (payload === 'pro_yearly') {
    now.setDate(now.getDate() + 365);
    return now.toISOString();
  }
  // pro_lifetime → no expiry
  return null;
}

async function answerPreCheckout(queryId: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre_checkout_query_id: queryId, ok: true }),
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
  // Verify the request comes from Telegram
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  // ── pre_checkout_query ────────────────────────────────────────────────────
  // Must answer within 10 seconds or Telegram will decline the payment
  if (update.pre_checkout_query) {
    await answerPreCheckout(update.pre_checkout_query.id);
    return NextResponse.json({ ok: true });
  }

  // ── successful_payment ────────────────────────────────────────────────────
  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const telegramUserId: number = update.message.from.id;
    const chatId: number = update.message.chat.id;
    const payload: string = payment.invoice_payload; // 'pro_monthly' | 'pro_yearly' | 'pro_lifetime'

    const supabase = createServiceClient();

    // Find SubEasy user by linked telegram_chat_id
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
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

    const proUntil = calcProUntil(payload);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_pro: true, pro_until: proUntil })
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
