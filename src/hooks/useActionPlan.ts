import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { useCampaignActions } from './useCampaignActions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/errorLogger';

export interface AccountContext {
  margin?: number;
  objective?: string;
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
  const { selectedAccountId, selectedPeriod, analysisData, currencySymbol } = useDashboard();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { toggleCampaignStatus, updateBudget } = useCampaignActions();

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

      const periodDays = (() => {
        const p = selectedPeriod || '7d';
        const map: Record<string, number> = {
          'today': 1, '1d': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30
        };
        return map[p] || 7;
      })();

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
          spend_diario: periodDays > 0 ? parseFloat((c.spend / periodDays).toFixed(2)) : c.spend,
          revenue_diario: periodDays > 0 ? parseFloat((c.revenue / periodDays).toFixed(2)) : c.revenue,
          period_days: periodDays,
          tipo_budget: (analysisData?.budgetByCampaignId?.[c.id] || 0) > 0 ? 'CBO' : 'ABO',
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

REGRAS DE BUDGET (baseadas em gasto DIÁRIO):
- valor_atual e valor_novo devem ser sempre em budget DIÁRIO
- Aumento máximo por ação: +30% do budget diário atual (Meta penaliza escala agressiva)
- Budget mínimo viável: ${currency} 10/dia (abaixo = sem dados suficientes)
- Campanhas com spend_diario < 5: não alterar budget ainda
- Para escalar: valor_novo = valor_atual * 1.20 (máx 1.30)
- Para reduzir: valor_novo = valor_atual * 0.70 (máx redução 50%)
- Se budget = 0 (CBO): não sugerir alteração de budget, apenas pause/resume

REGRAS DE SEGURANÇA:
- Máximo 3 pausas por plano — priorizar as piores
- Não pausar se conta tiver menos de 3 campanhas ativas
- Não sugerir aumento total de budget da conta > 50% num único plano
- Campanhas 0-3 dias: NUNCA pausar, NUNCA alterar budget — apenas observar
- Campanhas 3-7 dias: otimizar com cautela, máx +20% budget
- Campanhas 7+ dias: análise confiável, pode escalar até +30%

REGRAS DE TEMPO E APRENDIZADO:
- Fase de aprendizado Meta: mínimo 50 eventos de conversão ou 7 dias
- Não pausar campanha que teve venda nas últimas 24h (purchases > 0 em spend_diario)
- Campanhas reativadas recentemente (resume): aguardar 3 dias antes de nova otimização

REGRAS DE QUALIDADE:
- Frequency > 3.5: público saturado → sugerir novo criativo
- Frequency > 5.0: pausar urgente ou trocar criativo
- CTR < 1% após 7+ dias e spend > 15/dia: criativo fraco → pausar
- CPM > 40: público caro → otimizar segmentação
- ROAS >= meta * 1.5 e 7+ dias: escalar +20%
- ROAS >= meta * 2.0 e 7+ dias: escalar +30%
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
    "frequency": number,
    "regra_aplicada": "qual regra determinou esta ação"
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
      logError(err, 'useActionPlan.generatePlan');
      toast.error(err?.message || 'Erro ao gerar plano de ação.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, selectedAccountId, selectedPeriod, roasTarget, currency, callMetaApi, analysisData]);

  /**
   * Apply a single action using real Meta API calls via useCampaignActions.
   */
  const applyAction = useCallback(async (action: ActionItem): Promise<boolean> => {
    if (!user || !selectedAccountId) return false;

    try {
      let oldValue = '';
      let newValue = '';
      let success = false;

      switch (action.tipo) {
        case 'pause': {
          const result = await toggleCampaignStatus(action.campaign_id, 'ACTIVE');
          success = result === 'PAUSED';
          oldValue = 'ACTIVE';
          newValue = 'PAUSED';
          break;
        }
        case 'resume': {
          const result = await toggleCampaignStatus(action.campaign_id, 'PAUSED');
          success = result === 'ACTIVE';
          oldValue = 'PAUSED';
          newValue = 'ACTIVE';
          break;
        }
        case 'increase_budget':
        case 'decrease_budget': {
          success = await updateBudget(action.campaign_id, action.valor_novo) || false;
          oldValue = String(action.valor_atual);
          newValue = String(action.valor_novo);
          break;
        }
      }

      if (!success) {
        // Log failure
        await supabase.from('action_history').insert({
          user_id: user.id,
          account_id: selectedAccountId,
          campaign_id: action.campaign_id,
          campaign_name: action.campaign_name,
          action_type: action.tipo,
          old_value: oldValue,
          new_value: newValue,
          success: false,
          error_message: 'Meta API call failed',
        });
        toast.error(`❌ Erro ao aplicar ação: ${action.campaign_name}`);
        return false;
      }

      // Log success
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

      toast.success(`✅ Ação aplicada no Meta Ads: ${action.campaign_name}`);
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
      toast.error(`❌ Erro: ${err?.message || 'Erro desconhecido'}`);
      return false;
    }
  }, [user, selectedAccountId, toggleCampaignStatus, updateBudget]);

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
