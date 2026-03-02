import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';
import { createHmac, timingSafeEqual } from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
// Reject initData older than 24 hours
const MAX_AGE_SECONDS = 86_400;

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * Returns the verified Telegram user id, or null if invalid/expired.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateInitData(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const authDate = Number(params.get('auth_date'));
    if (!authDate || Math.floor(Date.now() / 1000) - authDate > MAX_AGE_SECONDS) {
      return null;
    }

    const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Constant-time comparison to prevent timing attacks
    const hashBuf     = Buffer.from(hash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (hashBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(hashBuf, expectedBuf)) return null;

    const userStr = params.get('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr) as { id?: unknown };
    if (typeof user?.id !== 'number') return null;

    return user.id;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Verify Supabase JWT from Authorization header
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

  // Validate Telegram initData signature — never trust client-supplied chat_id directly
  const body = await req.json().catch(() => null);
  const initData = body?.initData;
  if (!initData || typeof initData !== 'string') {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const chatId = validateInitData(initData);
  if (!chatId) {
    return NextResponse.json({ error: 'Invalid or expired Telegram data' }, { status: 403 });
  }

  // Save with service client — bypasses RLS
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, telegram_chat_id: chatId }, { onConflict: 'id' });

  if (error) {
    console.error('[telegram/connect] upsert failed');
    return NextResponse.json({ error: 'Failed to save Telegram account' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
