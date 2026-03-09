import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface BudgetInfo {
  isCBO: boolean;
  targetId: string; // campaignId for CBO, adsetId for ABO
  currentBudget: number; // in currency units (not cents)
}

export function useCampaignActions() {
  const { callMetaApi, isConnected } = useMetaConnection();
  const { selectedAccountId, selectedPeriod, analysisData, setAnalysisForAccount, clearCurrentAnalysis } = useDashboard();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const invalidateCache = useCallback(async () => {
    if (!user || !selectedAccountId) return;
    await supabase
      .from('analysis_cache')
      .delete()
      .eq('user_id', user.id)
      .eq('account_id', selectedAccountId);
  }, [user, selectedAccountId]);

  const syncCacheStatus = useCallback((campaignId: string, updates: Record<string, any>) => {
    if (!analysisData || !selectedAccountId) return;
    const updatedCampaigns = (analysisData.campaigns || []).map(c =>
      c.id === campaignId ? { ...c, ...updates } : c
    );
    setAnalysisForAccount(selectedAccountId, selectedPeriod, {
      ...analysisData,
      campaigns: updatedCampaigns,
    });
  }, [analysisData, selectedAccountId, selectedPeriod, setAnalysisForAccount]);

  const toggleCampaignStatus = useCallback(async (campaignId: string, currentStatus: string) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return;
    }
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setLoading(true);
    try {
      console.log(`[TOGGLE] Sending POST to ${campaignId}: status=${newStatus}`);
      const result = await callMetaApi(campaignId, { status: newStatus, _method: 'POST' });
      console.log(`[TOGGLE] Response:`, result);
      await invalidateCache();
      clearCurrentAnalysis();
      return newStatus;
    } catch (err: any) {
      console.error(`[TOGGLE] Error:`, err);
      toast.error(err?.message || 'Erro ao alterar status da campanha.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, clearCurrentAnalysis, invalidateCache]);

  /**
   * Detect whether a campaign uses CBO or ABO budgeting.
   * Returns the target entity ID and budget type.
   */
  const detectBudgetType = useCallback(async (campaignId: string): Promise<BudgetInfo> => {
    // Step 1: Check campaign-level budget (CBO)
    const campRes = await callMetaApi(campaignId, {
      fields: 'daily_budget,lifetime_budget,budget_rebalance_flag',
    });

    const campaignDailyBudget = campRes?.daily_budget;
    if (campaignDailyBudget) {
      return {
        isCBO: true,
        targetId: campaignId,
        currentBudget: parseInt(campaignDailyBudget, 10) / 100,
      };
    }

    // Step 2: No campaign budget → ABO, get first adset
    const adsetsRes = await callMetaApi(`${campaignId}/adsets`, {
      fields: 'id,daily_budget',
      limit: '1',
    });
    const adsets = adsetsRes?.data || [];
    if (adsets.length > 0 && adsets[0].daily_budget) {
      return {
        isCBO: false,
        targetId: adsets[0].id,
        currentBudget: parseInt(adsets[0].daily_budget, 10) / 100,
      };
    }

    // Fallback: treat as CBO
    return { isCBO: true, targetId: campaignId, currentBudget: 0 };
  }, [callMetaApi]);

  const updateBudget = useCallback(async (campaignId: string, newDailyBudget: number) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return false;
    }
    setLoading(true);
    try {
      const budgetCents = String(Math.round(newDailyBudget * 100));

      // Auto-detect CBO vs ABO
      const budgetInfo = await detectBudgetType(campaignId);
      console.log(`[BUDGET] Detected ${budgetInfo.isCBO ? 'CBO' : 'ABO'} for campaign ${campaignId}, target: ${budgetInfo.targetId}`);

      await callMetaApi(budgetInfo.targetId, { daily_budget: budgetCents, _method: 'POST' });

      await invalidateCache();
      clearCurrentAnalysis();
      toast.success(`✅ Orçamento atualizado (${budgetInfo.isCBO ? 'CBO' : 'ABO'})`);
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Erro ao atualizar budget.';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, clearCurrentAnalysis, detectBudgetType, invalidateCache]);

  const updateCampaignName = useCallback(async (campaignId: string, newName: string) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return false;
    }
    setLoading(true);
    try {
      await callMetaApi(campaignId, { name: newName, _method: 'POST' });
      await invalidateCache();
      syncCacheStatus(campaignId, { name: newName });
      toast.success('Nome atualizado ✓');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar nome.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, syncCacheStatus, invalidateCache]);

  return { loading, toggleCampaignStatus, updateBudget, updateCampaignName, syncCacheStatus, detectBudgetType };
}
