
-- Drop all existing restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users manage own meta_connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users manage own ad_accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users manage own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "Users manage own campaign_notes" ON public.campaign_notes;
DROP POLICY IF EXISTS "Users manage own alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Users manage own rule_logs" ON public.rule_logs;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Meta connections
CREATE POLICY "Users select own meta_connections" ON public.meta_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own meta_connections" ON public.meta_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own meta_connections" ON public.meta_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own meta_connections" ON public.meta_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Ad accounts
CREATE POLICY "Users select own ad_accounts" ON public.ad_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ad_accounts" ON public.ad_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ad_accounts" ON public.ad_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ad_accounts" ON public.ad_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Analysis cache
CREATE POLICY "Users select own analysis_cache" ON public.analysis_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own analysis_cache" ON public.analysis_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own analysis_cache" ON public.analysis_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own analysis_cache" ON public.analysis_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Campaign notes
CREATE POLICY "Users select own campaign_notes" ON public.campaign_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own campaign_notes" ON public.campaign_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campaign_notes" ON public.campaign_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own campaign_notes" ON public.campaign_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Alert rules
CREATE POLICY "Users select own alert_rules" ON public.alert_rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own alert_rules" ON public.alert_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own alert_rules" ON public.alert_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own alert_rules" ON public.alert_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Rule logs
CREATE POLICY "Users select own rule_logs" ON public.rule_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rule_logs" ON public.rule_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rule_logs" ON public.rule_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own rule_logs" ON public.rule_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
