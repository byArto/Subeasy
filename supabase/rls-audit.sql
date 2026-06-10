-- ============================================================================
-- SubEasy — RLS verification script  (READ-ONLY — changes NOTHING)
-- ============================================================================
-- WHY THIS EXISTS
--   The browser writes/reads user data DIRECTLY to Supabase using the PUBLIC
--   anon key (see src/lib/sync.ts). The ONLY thing that isolates one user's
--   data from another is Row Level Security (RLS). Those policies live in the
--   Supabase project, not in this repo, so they can't be reviewed in code.
--
-- HOW TO USE
--   1. Open Supabase Dashboard → SQL Editor.
--   2. Paste and RUN sections A–C below. They are pure SELECTs against the
--      Postgres catalog — they make NO changes and are safe to run on prod.
--   3. Read the "EXPECTED" notes. If something is wrong, see the REMEDIATION
--      section at the bottom — but apply those ONLY on a Supabase *preview
--      branch* / staging project first, because tightening RLS incorrectly can
--      break the app's direct-from-browser sync.
--
-- Tables the browser touches directly (must all have RLS ON):
--   subscriptions, categories, user_settings, profiles,
--   workspaces, workspace_members
-- Tables only touched by server (service_role) — RLS should still be ON so the
-- anon key can't reach them: ton_payments, affiliate_conversions
-- ============================================================================


-- ── A. Is RLS enabled (and forced) on every table? ─────────────────────────
-- EXPECTED: rls_enabled = true for ALL rows below.
-- If any user-data table shows false → anyone with the public anon key can
-- read/write the whole table. That is the worst case; fix immediately.
SELECT  n.nspname                AS schema,
        c.relname                AS table,
        c.relrowsecurity         AS rls_enabled,
        c.relforcerowsecurity    AS rls_forced
FROM    pg_class c
JOIN    pg_namespace n ON n.oid = c.relnamespace
WHERE   n.nspname = 'public'
  AND   c.relkind = 'r'
  AND   c.relname IN (
          'subscriptions','categories','user_settings','profiles',
          'workspaces','workspace_members','ton_payments','affiliate_conversions'
        )
ORDER BY c.relname;


-- ── B. What policies exist, and what do they actually allow? ───────────────
-- EXPECTED (matching how src/lib/sync.ts queries):
--   subscriptions      : select/insert/update/delete gated by user_id = auth.uid()
--                        (workspace rows are managed via server API with
--                         service_role; a member-based read policy is optional)
--   categories         : all commands gated by user_id = auth.uid()
--   user_settings      : all commands gated by user_id = auth.uid()
--   profiles           : SELECT own row (id = auth.uid()); INSERT/UPDATE must
--                        NOT let the client set is_pro / pro_until / telegram_chat_id
--                        (those are written only by the server / service_role)
--   workspaces         : SELECT for members; INSERT/UPDATE/DELETE only owner
--                        (or, simplest & safest: no client write policy at all —
--                         all writes go through the server API)
--   workspace_members  : SELECT own row (user_id = auth.uid()) — the deliberate
--                        "simplified" policy noted in sync.ts to avoid recursion
SELECT  schemaname AS schema,
        tablename  AS table,
        policyname,
        cmd        AS command,
        roles,
        qual       AS using_expr,        -- row visibility (SELECT/UPDATE/DELETE)
        with_check AS with_check_expr      -- write guard (INSERT/UPDATE)
FROM    pg_policies
WHERE   schemaname = 'public'
ORDER BY tablename, cmd, policyname;


-- ── C. Red-flag finder: tables with RLS ON but NO policies ─────────────────
-- A table with RLS enabled and zero policies denies all anon/auth access — that
-- usually means the feature is silently broken OR is served only via service_role.
-- A user-data table here is suspicious; investigate.
SELECT  c.relname AS table_with_rls_but_no_policies
FROM    pg_class c
JOIN    pg_namespace n ON n.oid = c.relnamespace
WHERE   n.nspname = 'public'
  AND   c.relkind = 'r'
  AND   c.relrowsecurity = true
  AND   NOT EXISTS (
          SELECT 1 FROM pg_policies p
          WHERE p.schemaname = 'public' AND p.tablename = c.relname
        )
  AND   c.relname IN (
          'subscriptions','categories','user_settings','profiles',
          'workspaces','workspace_members'
        );


-- ============================================================================
-- REMEDIATION SNIPPETS  —  DO NOT RUN BLINDLY
-- ============================================================================
-- Apply a snippet ONLY if section A/B/C shows that specific gap, and ALWAYS
-- test on a Supabase preview branch first (these are the patterns that match
-- the app's current direct-from-browser access in src/lib/sync.ts).
--
-- 1) Enable RLS on a table that has it OFF:
--    ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
--
-- 2) Personal-data tables (subscriptions / categories / user_settings):
--    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
--    CREATE POLICY subs_select_own ON public.subscriptions
--      FOR SELECT TO authenticated USING (user_id = auth.uid());
--    CREATE POLICY subs_insert_own ON public.subscriptions
--      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
--    CREATE POLICY subs_update_own ON public.subscriptions
--      FOR UPDATE TO authenticated
--      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
--    CREATE POLICY subs_delete_own ON public.subscriptions
--      FOR DELETE TO authenticated USING (user_id = auth.uid());
--    -- (repeat for categories / user_settings with their own user_id column)
--
-- 3) profiles — let the client read its own row, but NEVER write privileged
--    columns. Simplest safe stance: no client UPDATE policy at all, so every
--    write to is_pro / pro_until / telegram_chat_id must go through the server
--    (service_role) endpoints that already exist:
--    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
--    CREATE POLICY profiles_select_own ON public.profiles
--      FOR SELECT TO authenticated USING (id = auth.uid());
--    -- intentionally NO insert/update/delete policy for `authenticated`.
--
-- 4) workspace_members — keep the simplified, recursion-safe own-row read:
--    ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
--    CREATE POLICY wm_select_own ON public.workspace_members
--      FOR SELECT TO authenticated USING (user_id = auth.uid());
--    -- writes go through the server API; no client insert/update/delete policy.
--
-- 5) Server-only tables (ton_payments, affiliate_conversions): enable RLS and
--    add NO policies for authenticated → the anon key can't touch them, while
--    service_role (used by the API) bypasses RLS as designed.
--    ALTER TABLE public.ton_payments ENABLE ROW LEVEL SECURITY;
--    ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
-- ============================================================================
