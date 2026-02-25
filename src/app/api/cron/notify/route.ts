import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://subeasy.org';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function convertPrice(
  price: number,
  from: string,
  to: string,
  usdRate: number,
  eurRate: number,
): number {
  if (from === to) return price;
  const toRub: Record<string, number> = { RUB: 1, USD: usdRate, EUR: eurRate };
  const rub = price * (toRub[from] ?? 1);
  const fromRub: Record<string, number> = { RUB: 1, USD: usdRate, EUR: eurRate };
  return rub / (fromRub[to] ?? 1);
}

function cycleStr(cycle: string, isRu: boolean): string {
  const map: Record<string, [string, string]> = {
    monthly:    ['/мес',    '/mo'],
    yearly:     ['/год',    '/yr'],
    weekly:     ['/нед',    '/wk'],
    'one-time': ['',        ''],
    trial:      [' пробный',' trial'],
  };
  return map[cycle]?.[isRu ? 0 : 1] ?? '';
}

function dateLabel(daysUntil: number, isoDate: string, isRu: boolean): string {
  const locale = isRu ? 'ru-RU' : 'en-US';
  const formatted = new Date(isoDate).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
  });
  if (daysUntil === 1) return isRu ? `Завтра, <b>${formatted}</b>` : `Tomorrow, <b>${formatted}</b>`;
  if (daysUntil === 2) return isRu ? `Послезавтра, <b>${formatted}</b>` : `Day after tomorrow, <b>${formatted}</b>`;
  return isRu
    ? `Через ${daysUntil} дн., <b>${formatted}</b>`
    : `In ${daysUntil} days, <b>${formatted}</b>`;
}

function buildMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subs: any[],
  targetDate: string,
  daysUntil: number,
  displayCurrency: string,
  usdRate: number,
  eurRate: number,
  lang: string,
): string {
  const isRu = lang === 'ru';
  const sym = CURRENCY_SYMBOLS[displayCurrency] ?? displayCurrency;

  const header = isRu ? '🔔 <b>SubEasy · Напоминание</b>' : '🔔 <b>SubEasy · Reminder</b>';
  const when = dateLabel(daysUntil, targetDate, isRu);

  let total = 0;
  const rows = subs.map((sub) => {
    const converted = convertPrice(sub.price, sub.currency, displayCurrency, usdRate, eurRate);
    total += converted;
    const approx = sub.currency !== displayCurrency ? '~' : '';
    const amount = converted >= 10 ? Math.round(converted) : converted.toFixed(2);
    const cycle = cycleStr(sub.cycle, isRu);
    return `${sub.icon} ${sub.name}  <b>${approx}${amount} ${sym}${cycle}</b>`;
  });

  const totalStr = total >= 10 ? Math.round(total) : total.toFixed(2);
  const totalLine = isRu
    ? `💸 Итого: <b>${totalStr} ${sym}</b>`
    : `💸 Total: <b>${totalStr} ${sym}</b>`;

  return [header, '', when + ':', '', ...rows, '', totalLine].join('\n');
}

async function sendTelegramMessage(chatId: number, text: string, lang: string) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          {
            text: lang === 'ru' ? '📱 Открыть SubEasy' : '📱 Open SubEasy',
            web_app: { url: APP_URL },
          },
        ]],
      },
    }),
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Validate Vercel cron secret
  const auth = req.headers.get('authorization');
  const secretSet = !!CRON_SECRET;
  const match = auth === `Bearer ${CRON_SECRET}`;
  if (!secretSet || !match) {
    return NextResponse.json({
      error: 'Unauthorized',
      debug: { secretSet, receivedHeader: auth ?? 'none' },
    }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Today at midnight UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // All PRO users with a linked Telegram chat_id
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)
      .eq('is_pro', true);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No eligible PRO users' });
    }

    await Promise.allSettled(
      profiles.map(async (profile) => {
        try {
          // Load user settings
          const { data: settings } = await supabase
            .from('user_settings')
            .select('notify_days_before, notifications_enabled, display_currency, exchange_rate, eur_exchange_rate, lang')
            .eq('user_id', profile.id)
            .single();

          if (!settings?.notifications_enabled) { skipped++; return; }

          const daysUntil    = settings.notify_days_before ?? 3;
          const displayCur   = settings.display_currency ?? 'RUB';
          const usdRate      = Number(settings.exchange_rate ?? 96);
          const eurRate      = Number(settings.eur_exchange_rate ?? 105);
          const lang         = settings.lang ?? 'ru';

          // Target payment date
          const target = new Date(today);
          target.setUTCDate(today.getUTCDate() + daysUntil);
          const targetDateStr = target.toISOString().split('T')[0];

          // Subscriptions due on that date
          const { data: subs } = await supabase
            .from('subscriptions')
            .select('name, icon, price, currency, cycle')
            .eq('user_id', profile.id)
            .eq('is_active', true)
            .eq('next_payment_date', targetDateStr);

          if (!subs || subs.length === 0) { skipped++; return; }

          const text = buildMessage(subs, targetDateStr, daysUntil, displayCur, usdRate, eurRate, lang);
          const res = await sendTelegramMessage(Number(profile.telegram_chat_id), text, lang);

          if (res.ok) sent++;
          else { failed++; console.warn('[cron/notify] Telegram API error for', profile.id, await res.text()); }
        } catch (err) {
          failed++;
          console.warn('[cron/notify] user error:', profile.id, err);
        }
      }),
    );

    return NextResponse.json({ sent, skipped, failed, total: profiles.length });
  } catch (err) {
    console.error('[cron/notify] fatal:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
