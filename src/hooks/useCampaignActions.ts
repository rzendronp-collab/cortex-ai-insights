import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { toast } from 'sonner';

export function useCampaignActions() {
  const { callMetaApi, isConnected } = useMetaConnection();
  const { selectedAccountId, selectedPeriod, analysisData, setAnalysisForAccount, clearCurrentAnalysis } = useDashboard();
  const [loading, setLoading] = useState(false);

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
      clearCurrentAnalysis();
      return newStatus;
    } catch (err: any) {
      console.error(`[TOGGLE] Error:`, err);
      toast.error(err?.message || 'Erro ao alterar status da campanha.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, clearCurrentAnalysis]);

  const updateBudget = useCallback(async (campaignId: string, newDailyBudget: number) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return false;
    }
    setLoading(true);
    try {
      const budgetCents = String(Math.round(newDailyBudget * 100));
      const acctPath = `act_${selectedAccountId}`;

      const adSetsRes = await callMetaApi(`${acctPath}/adsets`, {
        fields: 'id,name,daily_budget,lifetime_budget,bid_amount,status',
        filtering: JSON.stringify([{
          field: 'campaign.id',
          operator: 'EQUAL',
          value: campaignId,
        }]),
      });
      const adsets = adSetsRes?.data || [];
      const aboAdsets = adsets.filter((a: any) => a.daily_budget);

      if (aboAdsets.length > 0) {
        const activeAdsets = aboAdsets.filter((a: any) => a.status === 'ACTIVE');
        const targets = activeAdsets.length > 0 ? activeAdsets : aboAdsets;
        await Promise.all(
          targets.map((adset: any) =>
            callMetaApi(adset.id, { daily_budget: budgetCents, _method: 'POST' })
          )
        );
      } else {
        await callMetaApi(campaignId, { daily_budget: budgetCents, _method: 'POST' });
      }

      clearCurrentAnalysis();
      toast.success('✅ Orçamento atualizado');
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Erro ao atualizar budget.';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, clearCurrentAnalysis]);

  const updateCampaignName = useCallback(async (campaignId: string, newName: string) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return false;
    }
    setLoading(true);
    try {
      await callMetaApi(campaignId, { name: newName, _method: 'POST' });
      syncCacheStatus(campaignId, { name: newName });
      toast.success('Nome atualizado ✓');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar nome.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi, syncCacheStatus]);

  return { loading, toggleCampaignStatus, updateBudget, updateCampaignName, syncCacheStatus };
}
