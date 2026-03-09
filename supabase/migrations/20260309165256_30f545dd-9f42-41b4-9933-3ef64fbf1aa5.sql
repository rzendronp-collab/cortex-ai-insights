-- profiles (uses id, not user_id)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
CREATE POLICY "users own profiles" ON public.profiles AS PERMISSIVE FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- meta_connections
DROP POLICY IF EXISTS "Users select own meta_connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users insert own meta_connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users update own meta_connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users delete own meta_connections" ON public.meta_connections;
DROP POLICY IF EXISTS "meta_connections_policy" ON public.meta_connections;
CREATE POLICY "users own meta_connections" ON public.meta_connections AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ad_accounts
DROP POLICY IF EXISTS "Users select own ad_accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users insert own ad_accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users update own ad_accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "Users delete own ad_accounts" ON public.ad_accounts;
DROP POLICY IF EXISTS "ad_accounts_policy" ON public.ad_accounts;
CREATE POLICY "users own ad_accounts" ON public.ad_accounts AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- analysis_cache
DROP POLICY IF EXISTS "Users select own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "Users insert own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "Users update own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "Users delete own analysis_cache" ON public.analysis_cache;
DROP POLICY IF EXISTS "analysis_cache_policy" ON public.analysis_cache;
CREATE POLICY "users own analysis_cache" ON public.analysis_cache AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- campaign_notes
DROP POLICY IF EXISTS "Users select own campaign_notes" ON public.campaign_notes;
DROP POLICY IF EXISTS "Users insert own campaign_notes" ON public.campaign_notes;
DROP POLICY IF EXISTS "Users update own campaign_notes" ON public.campaign_notes;
DROP POLICY IF EXISTS "Users delete own campaign_notes" ON public.campaign_notes;
DROP POLICY IF EXISTS "campaign_notes_policy" ON public.campaign_notes;
CREATE POLICY "users own campaign_notes" ON public.campaign_notes AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- alert_rules
DROP POLICY IF EXISTS "Users select own alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Users insert own alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Users update own alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Users delete own alert_rules" ON public.alert_rules;
DROP POLICY IF EXISTS "alert_rules_policy" ON public.alert_rules;
CREATE POLICY "users own alert_rules" ON public.alert_rules AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- rule_logs
DROP POLICY IF EXISTS "Users select own rule_logs" ON public.rule_logs;
DROP POLICY IF EXISTS "Users insert own rule_logs" ON public.rule_logs;
DROP POLICY IF EXISTS "Users update own rule_logs" ON public.rule_logs;
DROP POLICY IF EXISTS "Users delete own rule_logs" ON public.rule_logs;
DROP POLICY IF EXISTS "rule_logs_policy" ON public.rule_logs;
CREATE POLICY "users own rule_logs" ON public.rule_logs AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- action_plans
DROP POLICY IF EXISTS "users own action_plans" ON public.action_plans;
CREATE POLICY "users own action_plans" ON public.action_plans AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- action_history
DROP POLICY IF EXISTS "users own action_history" ON public.action_history;
CREATE POLICY "users own action_history" ON public.action_history AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- alerts
DROP POLICY IF EXISTS "users own alerts" ON public.alerts;
CREATE POLICY "users own alerts" ON public.alerts AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- error_logs
DROP POLICY IF EXISTS "users own error_logs" ON public.error_logs;
CREATE POLICY "users own error_logs" ON public.error_logs AS PERMISSIVE FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);