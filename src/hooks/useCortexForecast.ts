import { useState, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ForecastDay {
  date: string;
  roas_min: number;
  roas_expected: number;
  roas_max: number;
  spend_expected: number;
  revenue_expected: number;
}

export interface ForecastResult {
  forecast: ForecastDay[];
  trend: 'crescente' | 'estavel' | 'decrescente';
  confidence: 'alta' | 'media' | 'baixa';
  reasoning: string;
}

export function useCortexForecast() {
  const { analysisData, currencySymbol } = useDashboard();
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  const generateForecast = useCallback(async () => {
    const dailyData = analysisData?.dailyData;
    if (!dailyData || dailyData.length < 3) {
      toast.error('Dados diários insuficientes. Selecione um período de pelo menos 7 dias.');
      return;
    }

    setLoading(true);
    try {
      const historicalData = dailyData.map(d => ({
        date: d.date,
        spend: d.spend,
        revenue: d.revenue,
        roas: d.roas,
        sales: d.sales,
      }));

      const prompt = `Dados dos últimos ${dailyData.length} dias de Meta Ads (formato: data, gasto, receita, ROAS, vendas):
${JSON.stringify(historicalData, null, 2)}

Moeda: ${currencySymbol}

Com base na tendência, projeta os próximos 7 dias.
Responde APENAS em JSON válido (sem markdown):
{
  "forecast": [
    {"date":"YYYY-MM-DD","roas_min":2.8,"roas_expected":3.4,"roas_max":4.1,"spend_expected":210,"revenue_expected":714}
  ],
  "trend": "crescente|estavel|decrescente",
  "confidence": "alta|media|baixa",
  "reasoning": "string curta explicando a previsão"
}`;

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          system: 'Você é um analista de dados de Meta Ads. Faça previsões realistas baseadas em tendências. Responda SOMENTE JSON válido.',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
        },
      });

      if (error) throw error;

      const content = data?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido.');

      const result: ForecastResult = JSON.parse(jsonMatch[0]);
      setForecast(result);
      toast.success('Previsão gerada!');
    } catch (err: any) {
      console.error('generateForecast error:', err);
      toast.error(err?.message || 'Erro ao gerar previsão.');
    } finally {
      setLoading(false);
    }
  }, [analysisData, currencySymbol]);

  return { forecast, loading, generateForecast };
}
