-- Credits & Mortgages: extend the subscriptions table with an obligation kind
-- discriminator and loan-specific fields. All additive + nullable — existing
-- subscription rows default to kind='subscription'. RLS unchanged (user_id = auth.uid()).
alter table public.subscriptions
  add column if not exists kind text not null default 'subscription',
  add column if not exists cycle_anchor text,
  add column if not exists lender text,
  add column if not exists loan_type text,
  add column if not exists principal_amount numeric,
  add column if not exists outstanding_balance numeric,
  add column if not exists interest_rate numeric,
  add column if not exists term_months integer,
  add column if not exists payment_scheme text,
  add column if not exists property_name text;

-- Which optional sections the user has enabled (credits / mortgages).
alter table public.user_settings
  add column if not exists enabled_sections jsonb;
