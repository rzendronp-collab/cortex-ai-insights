
-- Tabela de planos de ação gerados por IA
CREATE TABLE IF NOT EXISTS action_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id text NOT NULL,
  period text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  total_campaigns int DEFAULT 0,
  estimated_roas_gain numeric DEFAULT 0,
  actions jsonb DEFAULT '[]'::jsonb
);

-- Tabela de histórico de ações aplicadas
CREATE TABLE IF NOT EXISTS action_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id text NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text,
  action_type text NOT NULL,
  old_value text,
  new_value text,
  applied_at timestamptz DEFAULT now(),
  success boolean DEFAULT true,
  error_message text
);

-- Tabela de alertas/notificações
CREATE TABLE IF NOT EXISTS alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id text NOT NULL,
  campaign_id text,
  campaign_name text,
  type text NOT NULL,
  severity text DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own action_plans" ON action_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own action_history" ON action_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own alerts" ON alerts FOR ALL USING (auth.uid() = user_id);
