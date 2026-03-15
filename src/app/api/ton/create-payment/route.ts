import { NextRequest, NextResponse } from 'next/server';
import { beginCell } from '@ton/core';
import { createServiceClient, verifyAuth } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/ratelimit';

import { env } from '@/lib/env';

const MERCHANT_WALLET = env('TON_WALLET_ADDRESS');

const PLAN_USD = {
  monthly:  2.99,
  yearly:   19.99,
  lifetime: 34.99,
} as const;

async function getTonUsdPrice(): Promise<number> {
  try {
    const res = await fetch(
      'https://tonapi.io/v2/rates?tokens=ton&currencies=usd',
      { next: { revalidate: 60 } },
    );
    const data = await res.json();
    const price = data?.rates?.TON?.prices?.USD;
    return typeof price === 'number' && price > 0 ? price : 4.0;
  } catch {
    return 4.0;
  }
}

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await checkRateLimit('ton-create-payment', user.id, 10, 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const plan = body?.plan as keyof typeof PLAN_USD | undefined;
  if (!plan || !PLAN_USD[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const tonPrice = await getTonUsdPrice();
  const usdAmount = PLAN_USD[plan];

  // Add 2% buffer for price fluctuations, round up to nearest 0.01 TON
  const tonAmount = Math.ceil((usdAmount * 1.02) / tonPrice * 100) / 100;
  const nanoAmount = Math.round(tonAmount * 1e9);

  // Unique memo for identifying this payment on-chain
  const memo = `sub-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;

  // Build TON cell comment payload (BOC base64) for the transaction
  const payload = beginCell()
    .storeUint(0, 32)       // text comment opcode
    .storeStringTail(memo)
    .endCell()
    .toBoc()
    .toString('base64');

  const supabase = createServiceClient();
  const { error: dbError } = await supabase.from('ton_payments').insert({
    user_id:     user.id,
    plan,
    amount_ton:  tonAmount,
    amount_nano: nanoAmount,
    memo,
    status:      'pending',
  });

  if (dbError) {
    console.error('[ton/create-payment] DB error:', dbError.message);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }

  return NextResponse.json({
    address:     MERCHANT_WALLET(),
    amount_nano: nanoAmount.toString(),
    payload,
    memo,
    amount_ton:  tonAmount,
    amount_usd:  usdAmount,
  });
}
