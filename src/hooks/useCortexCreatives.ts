import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreativeScore {
  id: string;
  name: string;
  score: number;
  status: 'top_performer' | 'escalavel' | 'monitorar' | 'otimizar' | 'pausar';
  reasoning: string;
  action: string;
  campaignName?: string;
  campaignId?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  purchases: number;
  revenue: number;
  roas: number;
}

export function useCortexCreatives() {
  const { callMetaApi } = useMetaConnection();
  const { currencySymbol } = useDashboard();
  const [creatives, setCreatives] = useState<CreativeScore[]>([]);
  const [loading, setLoading] = useState(false);

  const analyzeCreatives = useCallback(async (accountIds: string[]) => {
    setLoading(true);
    setCreatives([]);

    try {
      // Fetch ads from all selected accounts
      const allAds: any[] = [];
      for (const accountId of accountIds) {
        try {
          const res = await callMetaApi(`act_${accountId}/ads`, {
            fields: 'id,name,status,campaign{id,name},insights.date_preset(last_7d){spend,impressions,clicks,ctr,cpm,actions,action_values}',
            limit: '50',
          });
          const ads = (res?.data || []).map((ad: any) => ({ ...ad, accountId }));
          allAds.push(...ads);
        } catch { /* skip failed accounts */ }
      }

      // Filter active ads with data
      const activeAds = allAds.filter(ad => {
        const ins = ad.insights?.data?.[0];
        return ad.status === 'ACTIVE' && ins && parseFloat(ins.spend || '0') > 0;
      });

      if (activeAds.length === 0) {
        toast.info('Nenhum anúncio ativo com dados encontrado.');
        setLoading(false);
        return;
      }

      // Prepare data for Claude (batch of max 20)
      const batch = activeAds.slice(0, 20).map(ad => {
        const ins = ad.insights?.data?.[0] || {};
        const spend = parseFloat(ins.spend || '0');
        const purchases = extractPurchases(ins.actions);
        const revenue = extractRevenue(ins.action_values);
        return {
          id: ad.id,
          name: ad.name,
          campaignName: ad.campaign?.name || '',
          campaignId: ad.campaign?.id || '',
          accountId: ad.accountId,
          spend,
          impressions: parseInt(ins.impressions || '0', 10),
          clicks: parseInt(ins.clicks || '0', 10),
          ctr: parseFloat(ins.ctr || '0'),
          cpm: parseFloat(ins.cpm || '0'),
          purchases,
          revenue,
          roas: spend > 0 ? revenue / spend : 0,
        };
      });

      const prompt = `Analisa estes anúncios de Meta Ads e dá um score de 0-100 para cada um.
Formato JSON array: [{"id":"...","score":85,"status":"top_performer","reasoning":"CTR 4.2% + ROAS 6.8x...","action":"escalar +20%"}]
Status possíveis: top_performer | escalavel | monitorar | otimizar | pausar
Moeda: ${currencySymbol}

Anúncios:
${JSON.stringify(batch, null, 2)}

Responde APENAS o array JSON, sem markdown.`;

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          system: 'Você é um especialista em Meta Ads. Analise criativos e dê scores precisos baseados em performance. Responda SOMENTE JSON válido.',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4096,
        },
      });

      if (error) throw error;

      const content = data?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido.');

      const scores: any[] = JSON.parse(jsonMatch[0]);

      const result: CreativeScore[] = batch.map(ad => {
        const aiScore = scores.find(s => s.id === ad.id) || {};
        return {
          ...ad,
          score: aiScore.score || 50,
          status: aiScore.status || 'monitorar',
          reasoning: aiScore.reasoning || 'Sem análise disponível',
          action: aiScore.action || 'monitorar',
        };
      }).sort((a, b) => b.score - a.score);

      setCreatives(result);
      toast.success(`${result.length} criativos analisados!`);
    } catch (err: any) {
      console.error('analyzeCreatives error:', err);
      toast.error(err?.message || 'Erro ao analisar criativos.');
    } finally {
      setLoading(false);
    }
  }, [callMetaApi, currencySymbol]);

  return { creatives, loading, analyzeCreatives };
}

function extractPurchases(actions: any[]): number {
  if (!actions) return 0;
  const found = actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
  return found ? parseInt(found.value, 10) : 0;
}

function extractRevenue(actionValues: any[]): number {
  if (!actionValues) return 0;
  const found = actionValues.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
  return found ? parseFloat(found.value) : 0;
}
