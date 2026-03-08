
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ad_accounts
DROP POLICY IF EXISTS "Users select own ad_accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users insert own ad_accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users update own ad_accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users delete own ad_accounts" ON public.ad_accounts;
CREATE POLICY "Users select own ad_accounts" ON public.ad_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ad_accounts" ON public.ad_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ad_accounts" ON public.ad_accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ad_accounts" ON public.ad_accounts FOR DELETE USING (auth.uid() = user_id);

-- alert_rules
DROP POLICY IF EXISTS "Users select own alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Users insert own alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Users update own alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Users delete own alert_rules" ON public.alert_rules;
CREATE POLICY "Users select own alert_rules" ON public.alert_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own alert_rules" ON public.alert_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own alert_rules" ON public.alert_rules FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own alert_rules" ON public.alert_rules FOR DELETE USING (auth.uid() = user_id);

-- analysis_cache
DROP POLICY IF EXISTS "Users select own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "Users insert own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "Users update own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "Users delete own analysis_cache" ON public.analysis_cache;
CREATE POLICY "Users select own analysis_cache" ON public.analysis_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own analysis_cache" ON public.analysis_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own analysis_cache" ON public.analysis_cache FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own analysis_cache" ON public.analysis_cache FOR DELETE USING (auth.uid() = user_id);

-- campaign_notes
DROP POLICY IF EXISTS "Users select own campaign_notes" ON public.campaign_notes;
DROP POLICY IF EXISTS "Users insert own campaign_notes" ON public.campaign_notes;
DROP POLICY IF EXISTS "Users update own campaign_notes" ON public.campaign_notes;
DROP POLICY IF EXISTS "Users delete own campaign_notes" ON public.campaign_notes;
CREATE POLICY "Users select own campaign_notes" ON public.campaign_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own campaign_notes" ON public.campaign_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campaign_notes" ON public.campaign_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own campaign_notes" ON public.campaign_notes FOR DELETE USING (auth.uid() = user_id);

-- meta_connections
DROP POLICY IF EXISTS "Users select own meta_connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users insert own meta_connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users update own meta_connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users delete own meta_connections" ON public.meta_connections;
CREATE POLICY "Users select own meta_connections" ON public.meta_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own meta_connections" ON public.meta_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own meta_connections" ON public.meta_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own meta_connections" ON public.meta_connections FOR DELETE USING (auth.uid() = user_id);

-- rule_logs
DROP POLICY IF EXISTS "Users select own rule_logs" ON public.rule_logs;
DROP POLICY IF EXISTS "Users insert own rule_logs" ON public.rule_logs;
DROP POLICY IF EXISTS "Users update own rule_logs" ON public.rule_logs;
DROP POLICY IF EXISTS "Users delete own rule_logs" ON public.rule_logs;
CREATE POLICY "Users select own rule_logs" ON public.rule_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rule_logs" ON public.rule_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rule_logs" ON public.rule_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own rule_logs" ON public.rule_logs FOR DELETE USING (auth.uid() = user_id);
