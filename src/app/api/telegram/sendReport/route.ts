import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';
import { generateReportHtml } from '@/lib/reportHtml';
import { checkRateLimit } from '@/lib/ratelimit';
import { dbToSubscription, dbToCategory } from '@/lib/dbMappers';
import type { Subscription, Category, AppSettings } from '@/lib/types';

import { env, requireEnv } from '@/lib/env';

const BOT_TOKEN = env('TELEGRAM_BOT_TOKEN');

export async function POST(req: NextRequest) {
  // Verify Supabase JWT
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAnon = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!await checkRateLimit('sendReport', user.id, 10, 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = createServiceClient();

  // Fetch user's Telegram chat_id and language in one query
  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', user.id)
    .single();

  const chatId = profile?.telegram_chat_id;
  if (!chatId) {
    return NextResponse.json(
      { error: 'Telegram not connected. Open the app via Telegram bot first.' },
      { status: 422 },
    );
  }

  // Fetch subscriptions, categories, settings in parallel
  const [subsResult, catsResult, settingsResult] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).is('workspace_id', null),
    supabase.from('categories').select('*').eq('user_id', user.id),
    supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const subscriptions: Subscription[] = (subsResult.data ?? []).map(dbToSubscription);
  const categories: Category[] = (catsResult.data ?? []).map(dbToCategory);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = settingsResult.data;
  const settings: AppSettings = {
    displayCurrency: s?.display_currency ?? 'RUB',
    exchangeRate: Number(s?.exchange_rate ?? 90),
    eurExchangeRate: s?.eur_exchange_rate ? Number(s.eur_exchange_rate) : 105,
    // Effective RUB-per-unit map; fall back to legacy USD/EUR scalars for old users.
    rates: (s?.rates && Object.keys(s.rates).length > 0)
      ? s.rates
      : { USD: Number(s?.exchange_rate ?? 90), EUR: s?.eur_exchange_rate ? Number(s.eur_exchange_rate) : 105 },
    useManualRate: s?.use_manual_rate ?? false,
    notificationsEnabled: s?.notifications_enabled ?? false,
    notifyDaysBefore: s?.notify_days_before ?? 3,
  };
  const lang: string = s?.lang ?? 'ru';

  // Generate HTML server-side — never trust client-provided HTML
  const html = generateReportHtml(subscriptions, categories, settings, lang);

  // Send HTML as a document via Bot API
  const date = new Date().toISOString().split('T')[0];
  const filename = `subeasy-report-${date}.html`;

  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', new Blob([html], { type: 'text/html' }), filename);

  const tgRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN()}/sendDocument`,
    { method: 'POST', body: form },
  );

  const tgJson = await tgRes.json();
  if (!tgJson.ok) {
    console.error('[telegram/sendReport] Telegram API error');
    return NextResponse.json({ error: tgJson.description ?? 'Telegram error' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
