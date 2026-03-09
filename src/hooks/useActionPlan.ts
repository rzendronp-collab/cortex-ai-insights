import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccountContext {
  margin?: number;
  objective?: string;    // 'scale' | 'maintain' | 'reduce_costs' | ''
  niche?: string;
  total_budget?: number;
}

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
  dias_ativo?: number;
  frequency?: number;
  regra_aplicada?: string;
  spend_diario?: number;
  tipo_budget?: string;
}

export interface ActionPlan {
  resumo: string;
  score_conta: number;
  roas_atual: number;
  roas_estimado: number;
  receita_atual: number;
  receita_estimada: number;
  alertas_criticos?: string[];
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

  const generatePlan = useCallback(async (campaigns: any[], context: AccountContext = {}) => {
    if (!user || !selectedAccountId) {
      toast.error('Selecione uma conta primeiro.');
      return null;
    }

    setIsGenerating(true);
    try {
      // Fetch extra data from Meta API
      const extraData = await Promise.allSettled([
        callMetaApi(`act_${selectedAccountId}/campaigns`, {
          fields: 'id,name,created_time,objective,bid_strategy',
          limit: '50',
        }),
        callMetaApi(`act_${selectedAccountId}/insights`, {
          fields: 'campaign_id,frequency,reach',
          level: 'campaign',
          date_preset: 'last_7d',
          limit: '50',
        }),
      ]);

      const campDetails = extraData[0].status === 'fulfilled'
        ? (extraData[0] as PromiseFulfilledResult<any>).value?.data || [] : [];
      const insights = extraData[1].status === 'fulfilled'
        ? (extraData[1] as PromiseFulfilledResult<any>).value?.data || [] : [];

      const campaignsData = campaigns.map(c => {
        const detail = campDetails.find((d: any) => d.id === c.id) || {};
        const insight = insights.find((i: any) => i.campaign_id === c.id) || {};
        const createdDaysAgo = detail.created_time
          ? Math.floor((Date.now() - new Date(detail.created_time).getTime()) / 86400000)
          : null;

        return {
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
          purchases: c.purchases,
          budget: analysisData?.budgetByCampaignId?.[c.id] || 0,
          objective: detail.objective || 'unknown',
          bid_strategy: detail.bid_strategy || 'unknown',
          created_days_ago: createdDaysAgo,
          frequency: parseFloat(insight.frequency) || null,
          reach: parseInt(insight.reach) || null,
        };
      });

      const objectiveLabels: Record<string, string> = {
        scale: 'Escalar volume de vendas',
        maintain: 'Manter performance estável',
        reduce_costs: 'Reduzir custos e melhorar ROAS',
        '': 'não informado',
      };

      const contextInfo = `
CONTEXTO DO NEGÓCIO:
- Nicho/Produto: ${context.niche || 'não informado'}
- Margem média: ${context.margin != null ? context.margin + '%' : 'não informada'}
- Objetivo: ${objectiveLabels[context.objective || ''] || 'não informado'}
- Budget total disponível: ${context.total_budget ? currency + ' ' + context.total_budget : 'não informado'}

REGRAS DE ANÁLISE:
- Campanhas com menos de 3 dias: não pausar, aguardar aprendizado
- Frequency > 3.5: público saturado, sugerir novo criativo ou público
- Frequency > 5.0: pausar ou trocar criativo urgente
- ROAS >= meta * 1.5: escalar budget 20-40%
- ROAS < meta * 0.5 AND spend > 20 AND created_days_ago > 7: pausar
- CPM > 40: público caro, sugerir otimização de segmentação
- CTR < 1% AND spend > 15: criativo fraco
${context.margin ? `- Margem ${context.margin}%: ROAS mínimo viável = ${(100 / context.margin).toFixed(1)}x` : ''}
`;

      const systemPrompt = `Você é especialista em Meta Ads com 10 anos de experiência em e-commerce. 
Analise estas campanhas seguindo as regras e contexto fornecidos.
Responda SOMENTE JSON válido sem markdown.

${contextInfo}
Meta ROAS: ${roasTarget}x | Moeda: ${currency}

Campanhas: ${JSON.stringify(campaignsData)}

Formato exato:
{
  "resumo": "diagnóstico completo em 3 frases mencionando os principais problemas e oportunidades",
  "score_conta": 0-100,
  "roas_atual": number,
  "roas_estimado": number,
  "receita_atual": number,
  "receita_estimada": number,
  "alertas_criticos": ["string — alertas urgentes como saturação, campanhas jovens, etc"],
  "acoes": [{
    "campaign_id": "string",
    "campaign_name": "string",
    "tipo": "pause|resume|increase_budget|decrease_budget",
    "prioridade": 1|2|3,
    "motivo": "1 frase com dados reais (ex: ROAS 1.2x após 12 dias, frequency 4.1)",
    "valor_atual": number,
    "valor_novo": number,
    "impacto_estimado": "string",
    "roas_atual": number,
    "roas_estimado": number,
    "dias_ativo": number,
    "frequency": number
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
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido.');

      const parsed: ActionPlan = JSON.parse(jsonMatch[0]);
      setPlan(parsed);

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
  }, [user, selectedAccountId, roasTarget, currency, callMetaApi, analysisData]);

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
