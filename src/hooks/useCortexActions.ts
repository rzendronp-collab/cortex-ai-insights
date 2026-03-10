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

const LOCAL_STORAGE_KEY = 'cortex_history_local';

function getLocalHistory(): CortexOptimization[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveToLocalHistory(entry: Omit<CortexOptimization, 'id'>) {
  const history = getLocalHistory();
  const newEntry: CortexOptimization = {
    ...entry,
    id: crypto.randomUUID(),
  };
  history.unshift(newEntry);
  // Keep max 100 entries
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  return newEntry;
}

async function saveToSupabase(userId: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const { error } = await supabase.from('cortex_optimizations').insert({
      user_id: userId,
      ...data,
    });
    if (error) {
      console.warn('[CORTEX] Supabase insert failed (table may not exist):', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
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
    const now = new Date().toISOString();

    const baseEntry = {
      account_id: action.accountId,
      account_name: null as string | null,
      action_type: action.type,
      campaign_id: action.campaignId || null,
      campaign_name: action.title,
      ad_id: action.adId || null,
      ad_name: null as string | null,
      reasoning: action.reasoning,
      expected_impact: action.expectedImpact,
      metrics_before: action.metricsBefore || null,
      metrics_after: null as Record<string, number> | null,
      created_at: now,
    };

    try {
      // Execute via meta-proxy
      const params = { ...action.apiCall.body as Record<string, string>, _method: action.apiCall.method };
      const result = await callMetaApi(action.apiCall.endpoint, params);

      if (!result || result.error) {
        throw new Error(result?.error || 'Meta API error');
      }

      const entry = { ...baseEntry, status: 'executed' };

      // Try Supabase first, fallback to localStorage
      const savedToDb = await saveToSupabase(user.id, entry);
      if (!savedToDb) {
        saveToLocalHistory(entry);
      }

      // Update local state immediately
      setHistory(prev => [{ ...entry, id: crypto.randomUUID() }, ...prev]);

      toast.success(`Ação executada: ${action.title}`);
      return true;
    } catch (err: any) {
      console.error('executeAction error:', err);

      const failEntry = { ...baseEntry, status: 'failed' };
      const savedToDb = await saveToSupabase(user.id, failEntry);
      if (!savedToDb) {
        saveToLocalHistory(failEntry);
      }

      setHistory(prev => [{ ...failEntry, id: crypto.randomUUID() }, ...prev]);

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
      // Try Supabase first
      let query = supabase
        .from('cortex_optimizations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (accountIds && accountIds.length > 0) {
        query = query.in('account_id', accountIds);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        setHistory(data as unknown as CortexOptimization[]);
        setHistoryLoading(false);
        return;
      }

      // Fallback: read from localStorage
      let local = getLocalHistory();
      if (accountIds && accountIds.length > 0) {
        local = local.filter(h => accountIds.includes(h.account_id));
      }
      setHistory(local.slice(0, 50));
    } catch {
      // Final fallback: localStorage
      let local = getLocalHistory();
      if (accountIds && accountIds.length > 0) {
        local = local.filter(h => accountIds.includes(h.account_id));
      }
      setHistory(local.slice(0, 50));
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  return { executing, executeAction, history, historyLoading, fetchHistory };
}
