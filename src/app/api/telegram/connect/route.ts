import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';

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

  // Validate payload
  const body = await req.json().catch(() => null);
  const chatId = body?.telegram_chat_id;
  if (!chatId || typeof chatId !== 'number') {
    return NextResponse.json({ error: 'Invalid telegram_chat_id' }, { status: 400 });
  }

  // Save with service client — bypasses RLS
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, telegram_chat_id: chatId }, { onConflict: 'id' });

  if (error) {
    console.error('[telegram/connect]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
