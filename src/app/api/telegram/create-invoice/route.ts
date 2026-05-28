import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/ratelimit';
import { env, requireEnv } from '@/lib/env';
import { isMonetizationEnabled } from '@/lib/monetization';
import { PRO_PLANS, isPlanKey, type PlanKey } from '@/lib/plans';

const BOT_TOKEN = env('TELEGRAM_BOT_TOKEN');

// Localized invoice copy; prices & payloads come from PRO_PLANS (single source of truth).
const INVOICE_COPY: Record<PlanKey, { title: string; description: string }> = {
  monthly:  { title: 'SubEasy PRO · Месяц',    description: 'Полный PRO-доступ на 30 дней' },
  yearly:   { title: 'SubEasy PRO · Год',      description: 'Полный PRO-доступ на 365 дней — выгода 40%' },
  lifetime: { title: 'SubEasy PRO · Навсегда', description: 'Пожизненный PRO-доступ без ограничений' },
};

export async function POST(req: NextRequest) {
  if (!isMonetizationEnabled()) {
    return NextResponse.json({ error: 'Payments are disabled' }, { status: 404 });
  }

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

  if (!await checkRateLimit('create-invoice', user.id, 20, 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Validate plan
  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  if (!isPlanKey(plan)) {
    return NextResponse.json({ error: 'Invalid plan. Must be: monthly | yearly | lifetime' }, { status: 400 });
  }

  const { stars, payload } = PRO_PLANS[plan];
  const { title, description } = INVOICE_COPY[plan];

  // Create Telegram Stars invoice link
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN()}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description,
      payload,
      currency: 'XTR',
      prices: [{ label: title, amount: stars }],
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error('[create-invoice] Telegram error:', data);
    return NextResponse.json({ error: data.description ?? 'Telegram API error' }, { status: 502 });
  }

  return NextResponse.json({ url: data.result as string });
}
