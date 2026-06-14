-- Multi-currency: store the effective RUB-per-unit rate map on user settings.
-- The client writes settings.rates (e.g. {"USD":71.9,"EUR":83.0,"KZT":0.147,...});
-- the daily reminder cron and the Telegram report read it to convert amounts
-- to the user's display currency. Nullable + additive — safe, no RLS changes.
alter table public.user_settings
  add column if not exists rates jsonb;
