import { createClient } from '@supabase/supabase-js';

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
