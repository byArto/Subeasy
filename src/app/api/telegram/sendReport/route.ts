import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

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

  // Get HTML from body
  const body = await req.json().catch(() => null);
  const html: string = body?.html;
  if (!html || typeof html !== 'string') {
    return NextResponse.json({ error: 'Missing html' }, { status: 400 });
  }

  // Look up user's Telegram chat_id
  const supabase = createServiceClient();
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

  // Send HTML as a document via Bot API (multipart/form-data)
  const date = new Date().toISOString().split('T')[0];
  const filename = `subeasy-report-${date}.html`;

  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('document', new Blob([html], { type: 'text/html' }), filename);

  const tgRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
    { method: 'POST', body: form },
  );

  const tgJson = await tgRes.json();
  if (!tgJson.ok) {
    console.error('[telegram/sendReport]', tgJson);
    return NextResponse.json({ error: tgJson.description ?? 'Telegram error' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
