import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, verifyAuth } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const memo = req.nextUrl.searchParams.get('memo');
  if (!memo) return NextResponse.json({ error: 'Missing memo' }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ton_payments')
    .select('status, paid_at')
    .eq('memo', memo)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ paid: false });

  return NextResponse.json({ paid: data.status === 'paid', paid_at: data.paid_at });
}
