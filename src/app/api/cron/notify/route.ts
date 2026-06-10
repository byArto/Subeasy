import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';
import { isPushConfigured, sendPush } from '@/lib/webpush';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { escapeHtml } from '@/lib/utils';
import { env } from '@/lib/env';
import {
  getNotifyCronMaxUsers,
  getNotifyCronTelegramBatchSize,
  shouldIncludeFreeUsersInTelegramCron,
} from '@/lib/monetization';

const BOT_TOKEN = env('TELEGRAM_BOT_TOKEN');
const CRON_SECRET = env('CRON_SECRET');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://subeasy.org';

export const maxDuration = 60;

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
  if (daysUntil === 0) return isRu ? `Сегодня, <b>${formatted}</b>` : `Today, <b>${formatted}</b>`;
  if (daysUntil === 1) return isRu ? `Завтра, <b>${formatted}</b>` : `Tomorrow, <b>${formatted}</b>`;
  if (daysUntil === 2) return isRu ? `Послезавтра, <b>${formatted}</b>` : `Day after tomorrow, <b>${formatted}</b>`;
  return isRu
    ? `Через ${daysUntil} дн., <b>${formatted}</b>`
    : `In ${daysUntil} days, <b>${formatted}</b>`;
}

function buildMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subs: any[],
  todayStr: string,
  displayCurrency: string,
  usdRate: number,
  eurRate: number,
  lang: string,
): string {
  const isRu = lang === 'ru';
  const sym = CURRENCY_SYMBOLS[displayCurrency] ?? displayCurrency;
  const header = isRu ? '🔔 <b>SubEasy · Напоминание</b>' : '🔔 <b>SubEasy · Reminder</b>';

  // Group by next_payment_date (already sorted ascending from DB)
  const groups = new Map<string, typeof subs>();
  for (const sub of subs) {
    const date = sub.next_payment_date as string;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(sub);
  }

  let total = 0;
  const sections: string[] = [];
  const todayMs = new Date(todayStr + 'T00:00:00Z').getTime();

  for (const [dateStr, dateSubs] of groups) {
    const days = Math.round((new Date(dateStr + 'T00:00:00Z').getTime() - todayMs) / 86_400_000);
    const label = dateLabel(days, dateStr, isRu);

    const rows = dateSubs.map((sub) => {
      // sub.name / sub.icon are user-controlled — escape before HTML interpolation.
      const safeName = escapeHtml(String(sub.name ?? ''));
      const safeIcon = escapeHtml(String(sub.icon ?? ''));
      if (sub.cycle === 'trial') {
        const trialLabel = isRu ? 'FREE (пробный заканчивается)' : 'FREE (trial ending)';
        return `⏰ ${safeIcon} ${safeName}  <b>${trialLabel}</b>`;
      }
      const converted = convertPrice(sub.price, sub.currency, displayCurrency, usdRate, eurRate);
      total += converted;
      const approx = sub.currency !== displayCurrency ? '~' : '';
      const amount = converted >= 10 ? Math.round(converted) : converted.toFixed(2);
      const cycle = cycleStr(sub.cycle, isRu);
      return `${safeIcon} ${safeName}  <b>${approx}${amount} ${sym}${cycle}</b>`;
    });

    sections.push(`${label}:\n${rows.join('\n')}`);
  }

  const totalStr = total >= 10 ? Math.round(total) : total.toFixed(2);
  const totalLine = isRu
    ? `💸 Итого: <b>${totalStr} ${sym}</b>`
    : `💸 Total: <b>${totalStr} ${sym}</b>`;

  const lines = [header, ''];
  for (const section of sections) {
    lines.push(section, '');
  }
  lines.push(totalLine);
  return lines.join('\n');
}

async function sendTelegramMessage(chatId: number, text: string, lang: string) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN()}/sendMessage`, {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Web Push helpers ──────────────────────────────────────────────────────────

/** Short plain-text payload for an OS notification (not HTML — no escaping needed). */
function buildPushPayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subs: any[],
  lang: string,
): { title: string; body: string; url: string; tag: string } {
  const isRu = lang === 'ru';
  const names = subs
    .map((s) => `${s.icon ?? ''} ${s.name ?? ''}`.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
  const more = subs.length > 3 ? (isRu ? ` и ещё ${subs.length - 3}` : ` +${subs.length - 3}`) : '';
  return {
    title: isRu ? '🔔 SubEasy — напоминание' : '🔔 SubEasy reminder',
    body: isRu ? `Скоро списания: ${names}${more}` : `Upcoming charges: ${names}${more}`,
    url: APP_URL,
    tag: 'payment-reminder',
  };
}

/** Loads a user's due-soon subscriptions (or null if notifications are off / none due). */
async function loadDueSubsForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  today: Date,
  todayStr: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ subs: any[]; lang: string } | null> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('notify_days_before, notifications_enabled, lang')
    .eq('user_id', userId)
    .single();

  if (!settings?.notifications_enabled) return null;

  const daysUntil = settings.notify_days_before ?? 3;
  const target = new Date(today);
  target.setUTCDate(today.getUTCDate() + daysUntil);
  const targetDateStr = target.toISOString().split('T')[0];

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('name, icon, next_payment_date')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gte('next_payment_date', todayStr)
    .lte('next_payment_date', targetDateStr)
    .order('next_payment_date', { ascending: true });

  if (!subs || subs.length === 0) return null;
  return { subs, lang: settings.lang ?? 'ru' };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Validate Vercel cron secret (constant-time comparison)
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${CRON_SECRET()}`;
  const authBuf = Buffer.from(auth);
  const expBuf = Buffer.from(expected);
  if (authBuf.length !== expBuf.length || !timingSafeEqual(authBuf, expBuf)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Today at midnight UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let pushSent = 0;
  let pushPruned = 0;

  try {
    let profilesQuery = supabase
      .from('profiles')
      .select('id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)
      .order('id', { ascending: true })
      .limit(getNotifyCronMaxUsers());

    if (!shouldIncludeFreeUsersInTelegramCron()) {
      profilesQuery = profilesQuery.eq('is_pro', true);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) throw profilesError;

    // Telegram-linked users (may be empty — Play/PWA users have no chat id; the
    // Web Push pass below still runs for them).
    const eligible = profiles ?? [];
    const batchSize = getNotifyCronTelegramBatchSize();

    for (let start = 0; start < eligible.length; start += batchSize) {
      const batch = eligible.slice(start, start + batchSize);

      await Promise.allSettled(
        batch.map(async (profile) => {
          try {
            // Load user settings
            const { data: settings } = await supabase
              .from('user_settings')
              .select('notify_days_before, notifications_enabled, display_currency, exchange_rate, eur_exchange_rate, lang')
              .eq('user_id', profile.id)
              .single();

            if (!settings?.notifications_enabled) { skipped++; return; }

            const daysUntil  = settings.notify_days_before ?? 3;
            const displayCur = settings.display_currency ?? 'RUB';
            const usdRate    = Number(settings.exchange_rate ?? 96);
            const eurRate    = Number(settings.eur_exchange_rate ?? 105);
            const lang       = settings.lang ?? 'ru';

            // Window end date
            const target = new Date(today);
            target.setUTCDate(today.getUTCDate() + daysUntil);
            const targetDateStr = target.toISOString().split('T')[0];

            // All subscriptions due within [today, today + daysUntil]
            const { data: subs } = await supabase
              .from('subscriptions')
              .select('name, icon, price, currency, cycle, next_payment_date')
              .eq('user_id', profile.id)
              .eq('is_active', true)
              .gte('next_payment_date', todayStr)
              .lte('next_payment_date', targetDateStr)
              .order('next_payment_date', { ascending: true });

            if (!subs || subs.length === 0) { skipped++; return; }

            const text = buildMessage(subs, todayStr, displayCur, usdRate, eurRate, lang);
            const res = await sendTelegramMessage(Number(profile.telegram_chat_id), text, lang);

            if (res.ok) sent++;
            else { failed++; console.error('[cron/notify] Telegram API error for', profile.id, await res.text()); }
          } catch (err) {
            failed++;
            console.error('[cron/notify] user error:', profile.id, err);
          }
        }),
      );

      if (start + batchSize < eligible.length) {
        await sleep(1000);
      }
    }

    // ── Web Push pass: covers anyone with a push subscription (incl. Play /
    //    Android users with no Telegram link). Fully isolated — any failure here
    //    can never affect the Telegram result above. Skips silently if VAPID unset. ──
    if (isPushConfigured()) {
      try {
        const { data: subRows } = await supabase
          .from('push_subscriptions')
          .select('user_id, endpoint, p256dh, auth')
          .limit(2000);

        const byUser = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>();
        for (const r of subRows ?? []) {
          const list = byUser.get(r.user_id) ?? [];
          list.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
          byUser.set(r.user_id, list);
        }

        for (const [userId, deviceSubs] of byUser) {
          try {
            const due = await loadDueSubsForUser(supabase, userId, today, todayStr);
            if (!due) continue;
            const payload = buildPushPayload(due.subs, due.lang);
            for (const d of deviceSubs) {
              const result = await sendPush(d, payload);
              if (result === 'sent') pushSent++;
              else if (result === 'expired') {
                await supabase.from('push_subscriptions').delete().eq('endpoint', d.endpoint);
                pushPruned++;
              }
            }
          } catch (err) {
            console.error('[cron/notify] push user error:', userId, err);
          }
        }
      } catch (err) {
        console.error('[cron/notify] push pass error:', err);
      }
    }

    return NextResponse.json({
      sent,
      skipped,
      failed,
      total: eligible.length,
      maxUsers: getNotifyCronMaxUsers(),
      batchSize,
      pushSent,
      pushPruned,
    });
  } catch (err) {
    console.error('[cron/notify] fatal:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
