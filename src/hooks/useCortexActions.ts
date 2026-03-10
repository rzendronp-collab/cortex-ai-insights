import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CortexAction {
  id: string;
  priority: 1 | 2 | 3;
  type: 'pause_campaign' | 'scale_budget' | 'pause_ad' | 'change_audience' | 'test_creative';
  accountId: string;
  campaignId?: string;
  adId?: string;
  title: string;
  reasoning: string;
  expectedImpact: string;
  apiCall?: {
    method: 'POST' | 'GET';
    endpoint: string;
    body: Record<string, unknown>;
  };
  status: 'pending' | 'confirmed' | 'executed' | 'rejected';
  executedAt?: string;
  metricsBefore?: Record<string, number>;
}

export interface CortexOptimization {
  id: string;
  account_id: string;
  account_name: string | null;
  action_type: string;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  reasoning: string | null;
  expected_impact: string | null;
  metrics_before: Record<string, number> | null;
  metrics_after: Record<string, number> | null;
  status: string;
  created_at: string;
}

export function useCortexActions() {
  const { callMetaApi } = useMetaConnection();
  const { user } = useAuth();
  const [executing, setExecuting] = useState<string | null>(null);
  const [history, setHistory] = useState<CortexOptimization[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const executeAction = useCallback(async (action: CortexAction): Promise<boolean> => {
    if (!user || !action.apiCall) return false;

    setExecuting(action.id);
    try {
      // Execute via meta-proxy
      const params = { ...action.apiCall.body as Record<string, string>, _method: action.apiCall.method };
      const result = await callMetaApi(action.apiCall.endpoint, params);

      if (!result || result.error) {
        throw new Error(result?.error || 'Meta API error');
      }

      // Save to cortex_optimizations
      await supabase.from('cortex_optimizations').insert({
        user_id: user.id,
        account_id: action.accountId,
        action_type: action.type,
        campaign_id: action.campaignId || null,
        campaign_name: action.title,
        ad_id: action.adId || null,
        reasoning: action.reasoning,
        expected_impact: action.expectedImpact,
        metrics_before: action.metricsBefore || null,
        status: 'executed',
      });

      toast.success(`Ação executada: ${action.title}`);
      return true;
    } catch (err: any) {
      console.error('executeAction error:', err);

      // Save failed attempt
      await supabase.from('cortex_optimizations').insert({
        user_id: user.id,
        account_id: action.accountId,
        action_type: action.type,
        campaign_id: action.campaignId || null,
        campaign_name: action.title,
        reasoning: action.reasoning,
        expected_impact: action.expectedImpact,
        metrics_before: action.metricsBefore || null,
        status: 'failed',
      }).catch(() => {});

      toast.error(err?.message || 'Erro ao executar ação.');
      return false;
    } finally {
      setExecuting(null);
    }
  }, [user, callMetaApi]);

  const fetchHistory = useCallback(async (accountIds?: string[]) => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      let query = supabase
        .from('cortex_optimizations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (accountIds && accountIds.length > 0) {
        query = query.in('account_id', accountIds);
      }

      const { data } = await query;
      setHistory((data || []) as unknown as CortexOptimization[]);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  return { executing, executeAction, history, historyLoading, fetchHistory };
}
