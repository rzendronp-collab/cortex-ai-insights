import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { toast } from 'sonner';

export function useCampaignActions() {
  const { callMetaApi, isConnected } = useMetaConnection();
  const { selectedAccountId } = useDashboard();
  const [loading, setLoading] = useState(false);

  const toggleCampaignStatus = useCallback(async (campaignId: string, currentStatus: string) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return;
    }
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setLoading(true);
    try {
      await callMetaApi(campaignId, { status: newStatus, _method: 'POST' });
      return newStatus;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar status da campanha.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi]);

  const updateBudget = useCallback(async (campaignId: string, newDailyBudget: number) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return false;
    }
    setLoading(true);
    try {
      // Fetch adsets for this campaign
      const adSetsRes = await callMetaApi(`${campaignId}/adsets`, {
        fields: 'id,name,daily_budget,lifetime_budget',
      });
      const adsets = adSetsRes?.data || [];
      const budgetCents = String(Math.round(newDailyBudget * 100));

      // ABO: adsets have their own daily_budget
      const aboAdsets = adsets.filter((a: any) => a.daily_budget || a.lifetime_budget);

      if (aboAdsets.length > 0) {
        await Promise.all(
          aboAdsets.map((adset: any) =>
            callMetaApi(adset.id, { daily_budget: budgetCents, _method: 'POST' })
          )
        );
      } else {
        // CBO: update campaign budget directly
        await callMetaApi(campaignId, { daily_budget: budgetCents, _method: 'POST' });
      }

      toast.success('Budget atualizado ✓');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar budget.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedAccountId, callMetaApi]);

  return { loading, toggleCampaignStatus, updateBudget };
}
