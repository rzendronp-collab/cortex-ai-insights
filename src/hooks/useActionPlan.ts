import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ActionItem {
  campaign_id: string;
  campaign_name: string;
  tipo: 'pause' | 'resume' | 'increase_budget' | 'decrease_budget';
  prioridade: 1 | 2 | 3;
  motivo: string;
  valor_atual: number;
  valor_novo: number;
  impacto_estimado: string;
  roas_atual: number;
  roas_estimado: number;
}

export interface ActionPlan {
  resumo: string;
  score_conta: number;
  roas_atual: number;
  roas_estimado: number;
  receita_atual: number;
  receita_estimada: number;
  acoes: ActionItem[];
}

export interface HistoryEntry {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  applied_at: string;
  success: boolean;
  error_message: string | null;
}

export function useActionPlan() {
  const { callMetaApi } = useMetaConnection();
  const { selectedAccountId, analysisData, currencySymbol } = useDashboard();
  const { profile } = useProfile();
  const { user } = useAuth();

  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const roasTarget = profile?.roas_target ?? 3;
  const currency = profile?.currency ?? 'R$';

  const fetchHistory = useCallback(async () => {
    if (!user || !selectedAccountId) return;
    const { data } = await supabase
      .from('action_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', selectedAccountId)
      .order('applied_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data as unknown as HistoryEntry[]);
  }, [user, selectedAccountId]);

  const generatePlan = useCallback(async (campaigns: any[]) => {
    if (!user || !selectedAccountId) {
      toast.error('Selecione uma conta primeiro.');
      return null;
    }

    setIsGenerating(true);
    try {
      const campaignsData = campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        spend: c.spend,
        revenue: c.revenue,
        roas: c.roas,
        ctr: c.ctr,
        cpc: c.cpc,
        cpm: c.cpm,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        daily_budget: c.daily_budget,
      }));

      const systemPrompt = `Você é especialista em Meta Ads. Analise e responda SOMENTE JSON válido sem markdown.
Campanhas: ${JSON.stringify(campaignsData)}
Meta ROAS: ${roasTarget}x | Moeda: ${currency}
Formato exato:
{
  "resumo": "diagnóstico em 2 frases",
  "score_conta": 0-100,
  "roas_atual": number,
  "roas_estimado": number,
  "receita_atual": number,
  "receita_estimada": number,
  "acoes": [{
    "campaign_id": "string",
    "campaign_name": "string",
    "tipo": "pause|resume|increase_budget|decrease_budget",
    "prioridade": 1|2|3,
    "motivo": "1 frase",
    "valor_atual": number,
    "valor_novo": number,
    "impacto_estimado": "ex: +€120/semana",
    "roas_atual": number,
    "roas_estimado": number
  }]
}`;

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          system: systemPrompt,
          messages: [{ role: 'user', content: 'Gere o plano de ação para essas campanhas.' }],
          max_tokens: 4096,
        },
      });

      if (error) throw error;

      const content = data?.content || '';
      // Try to parse JSON from response (may have extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido.');

      const parsed: ActionPlan = JSON.parse(jsonMatch[0]);
      setPlan(parsed);

      // Save to action_plans
      await supabase.from('action_plans').insert({
        user_id: user.id,
        account_id: selectedAccountId,
        period: 'current',
        status: 'pending',
        total_campaigns: parsed.acoes.length,
        estimated_roas_gain: parsed.roas_estimado - parsed.roas_atual,
        actions: parsed as any,
      });

      toast.success('Plano gerado com sucesso!');
      return parsed;
    } catch (err: any) {
      console.error('generatePlan error:', err);
      toast.error(err?.message || 'Erro ao gerar plano de ação.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, selectedAccountId, roasTarget, currency]);

  const applyAction = useCallback(async (action: ActionItem): Promise<boolean> => {
    if (!user || !selectedAccountId) return false;

    try {
      let oldValue = '';
      let newValue = '';

      switch (action.tipo) {
        case 'pause':
          await callMetaApi(action.campaign_id, { status: 'PAUSED', _method: 'POST' });
          oldValue = 'ACTIVE';
          newValue = 'PAUSED';
          break;
        case 'resume':
          await callMetaApi(action.campaign_id, { status: 'ACTIVE', _method: 'POST' });
          oldValue = 'PAUSED';
          newValue = 'ACTIVE';
          break;
        case 'increase_budget':
        case 'decrease_budget':
          await callMetaApi(action.campaign_id, {
            daily_budget: String(Math.round(action.valor_novo * 100)),
            _method: 'POST',
          });
          oldValue = String(action.valor_atual);
          newValue = String(action.valor_novo);
          break;
      }

      // Log to action_history
      await supabase.from('action_history').insert({
        user_id: user.id,
        account_id: selectedAccountId,
        campaign_id: action.campaign_id,
        campaign_name: action.campaign_name,
        action_type: action.tipo,
        old_value: oldValue,
        new_value: newValue,
        success: true,
      });

      return true;
    } catch (err: any) {
      // Log failure
      await supabase.from('action_history').insert({
        user_id: user.id,
        account_id: selectedAccountId,
        campaign_id: action.campaign_id,
        campaign_name: action.campaign_name,
        action_type: action.tipo,
        old_value: String(action.valor_atual),
        new_value: String(action.valor_novo),
        success: false,
        error_message: err?.message || 'Erro desconhecido',
      });
      return false;
    }
  }, [user, selectedAccountId, callMetaApi]);

  const applyAllActions = useCallback(async (actions: ActionItem[]) => {
    setIsApplying(true);
    setAppliedCount(0);
    let successCount = 0;

    for (let i = 0; i < actions.length; i++) {
      const success = await applyAction(actions[i]);
      if (success) successCount++;
      setAppliedCount(i + 1);
      // Delay between actions to avoid rate limiting
      if (i < actions.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setIsApplying(false);
    await fetchHistory();
    toast.success(`${successCount}/${actions.length} ações aplicadas com sucesso!`);
  }, [applyAction, fetchHistory]);

  const simulatePlan = useCallback((acoes: ActionItem[]) => {
    if (acoes.length === 0) return { receita_atual: 0, receita_estimada: 0, ganho: 0, ganho_pct: 0 };

    const receitaAtual = acoes.reduce((sum, a) => sum + (a.roas_atual * a.valor_atual), 0);
    const roasEstimadoMedio = acoes.reduce((sum, a) => sum + a.roas_estimado, 0) / acoes.length;
    const roasAtualMedio = acoes.reduce((sum, a) => sum + a.roas_atual, 0) / acoes.length;
    const receitaEstimada = roasAtualMedio > 0
      ? receitaAtual * (roasEstimadoMedio / roasAtualMedio)
      : receitaAtual;
    const ganho = receitaEstimada - receitaAtual;
    const ganho_pct = receitaAtual > 0 ? (ganho / receitaAtual) * 100 : 0;

    return { receita_atual: receitaAtual, receita_estimada: receitaEstimada, ganho, ganho_pct };
  }, []);

  return {
    plan,
    isGenerating,
    isApplying,
    appliedCount,
    history,
    generatePlan,
    applyAction,
    applyAllActions,
    simulatePlan,
    fetchHistory,
  };
}
