-- ============================================================================
-- SubEasy — Web Push subscriptions  (run once in Supabase SQL Editor)
-- ============================================================================
-- Stores browser push subscriptions for background payment reminders (Android /
-- Google Play / Chrome PWA). Written ONLY by the server (/api/push/subscribe via
-- service_role) and read ONLY by the daily cron — clients never touch it directly,
-- so RLS is ON with no policies for `authenticated` (the anon key can't reach it;
-- service_role bypasses RLS as designed). Additive: does not touch existing tables.
-- Rows auto-delete with the user (FK cascade) — covers GDPR account deletion.

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
-- No policies for `authenticated` on purpose: all access is server-side (service_role).
