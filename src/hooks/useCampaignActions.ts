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
  const { selectedAccountId, selectedPeriod, analysisData, setAnalysisForAccount, clearCurrentAnalysis, analyzeRef } = useDashboard();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const triggerReanalyze = useCallback(() => {
    setTimeout(() => {
      analyzeRef.current?.();
    }, 2000);
  }, [analyzeRef]);

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

  // Feature 5: Verify status after toggle via GET
  const verifyStatus = useCallback(async (campaignId: string, expectedStatus: string): Promise<string> => {
    try {
      const res = await callMetaApi(campaignId, { fields: 'status' });
      const realStatus = res?.status;
      if (realStatus && realStatus !== expectedStatus) {
        toast.warning('⚠ Meta API retornou status diferente — a sincronizar...');
        return realStatus;
      }
      return expectedStatus;
    } catch {
      return expectedStatus;
    }
  }, [callMetaApi]);

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

      // Feature 5: Verify real status after 1.5s
      await new Promise(r => setTimeout(r, 1500));
      const confirmedStatus = await verifyStatus(campaignId, newStatus);

      await invalidateCache();
      clearCurrentAnalysis();
      triggerReanalyze();
      return confirmedStatus;
    } catch (err: any) {
      console.error(`[TOGGLE] Error:`, err);
      toast.error(err?.message || 'Erro ao alterar status da campanha.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, clearCurrentAnalysis, invalidateCache, verifyStatus, triggerReanalyze]);

  /**
   * Detect whether a campaign uses CBO or ABO budgeting.
   */
  const detectBudgetType = useCallback(async (campaignId: string): Promise<BudgetInfo> => {
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
      const budgetInfo = await detectBudgetType(campaignId);
      console.log(`[BUDGET] Detected ${budgetInfo.isCBO ? 'CBO' : 'ABO'} for campaign ${campaignId}, target: ${budgetInfo.targetId}`);

      await callMetaApi(budgetInfo.targetId, { daily_budget: budgetCents, _method: 'POST' });

      await invalidateCache();
      clearCurrentAnalysis();
      triggerReanalyze();
      toast.success(`✅ Orçamento atualizado (${budgetInfo.isCBO ? 'CBO' : 'ABO'}). A sincronizar dados em 2s...`);
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Erro ao atualizar budget.';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, clearCurrentAnalysis, detectBudgetType, invalidateCache, triggerReanalyze]);

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
      triggerReanalyze();
      toast.success('✅ Nome atualizado. A sincronizar dados em 2s...');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar nome.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, syncCacheStatus, invalidateCache, triggerReanalyze]);

  // Feature 4: Duplicate campaign
  const duplicateCampaign = useCallback(async (campaignId: string, campaignName: string, newName: string, keepActive: boolean) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return false;
    }
    setLoading(true);
    try {
      // Get the original campaign's objective
      const campRes = await callMetaApi(campaignId, { fields: 'objective,special_ad_categories' });
      const objective = campRes?.objective || 'OUTCOME_SALES';
      const specialAdCategories = campRes?.special_ad_categories || [];

      // Create new campaign with same objective
      const acctPath = `act_${selectedAccountId}`;
      await callMetaApi(acctPath + '/campaigns', {
        name: newName,
        status: keepActive ? 'ACTIVE' : 'PAUSED',
        objective,
        special_ad_categories: JSON.stringify(specialAdCategories),
        _method: 'POST',
      });

      await invalidateCache();
      clearCurrentAnalysis();
      triggerReanalyze();
      toast.success('✅ Campanha duplicada! A sincronizar dados em 2s...');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao duplicar campanha.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, clearCurrentAnalysis, invalidateCache, triggerReanalyze]);

  return { loading, toggleCampaignStatus, updateBudget, updateCampaignName, syncCacheStatus, detectBudgetType, duplicateCampaign };
}
