import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

/**
 * Service-role Supabase client for server-side API routes and cron jobs.
 * Bypasses Row Level Security — only use in trusted server contexts.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Verifies the Bearer JWT from the Authorization header.
 * Returns { id: string } if valid, null otherwise.
 * Use this in every workspace API route instead of trusting client-supplied userId.
 */
export async function verifyAuth(req: NextRequest): Promise<{ id: string } | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id };
}
