import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/ratelimit';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

const PLANS = {
  monthly: {
    stars: 249,
    payload: 'pro_monthly',
    title: 'SubEasy PRO · Месяц',
    description: 'Полный PRO-доступ на 30 дней',
  },
  yearly: {
    stars: 1799,
    payload: 'pro_yearly',
    title: 'SubEasy PRO · Год',
    description: 'Полный PRO-доступ на 365 дней — выгода 40%',
  },
  lifetime: {
    stars: 2999,
    payload: 'pro_lifetime',
    title: 'SubEasy PRO · Навсегда',
    description: 'Пожизненный PRO-доступ без ограничений',
  },
} as const;

export async function POST(req: NextRequest) {
  // Verify Supabase JWT
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const plan = body?.plan as keyof typeof PLANS | undefined;
  if (!plan || !PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan. Must be: monthly | yearly | lifetime' }, { status: 400 });
  }

  const { stars, payload, title, description } = PLANS[plan];

  // Create Telegram Stars invoice link
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
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
