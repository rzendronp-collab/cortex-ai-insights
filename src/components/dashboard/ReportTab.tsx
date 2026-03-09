import { useState } from 'react';
import { Bot, Loader2, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

function buildReportPrompt(ctx: {
  campaigns: any[];
  campaignsPrev: any[];
  dailyData: any[];
  hourlyData: any[];
  roasTarget: number;
  currency: string;
  accountName: string | null;
}) {
  const { campaigns, campaignsPrev, dailyData, hourlyData, roasTarget, currency, accountName } = ctx;
  const active = campaigns.filter((c: any) => c.spend > 0);
  const totalSpend = active.reduce((s: number, c: any) => s + c.spend, 0);
  const totalRevenue = active.reduce((s: number, c: any) => s + c.revenue, 0);
  const totalSales = active.reduce((s: number, c: any) => s + c.purchases, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const prevActive = campaignsPrev.filter((c: any) => c.spend > 0);
  const prevSpend = prevActive.reduce((s: number, c: any) => s + c.spend, 0);
  const prevRevenue = prevActive.reduce((s: number, c: any) => s + c.revenue, 0);
  const prevSales = prevActive.reduce((s: number, c: any) => s + c.purchases, 0);

  const peakHours = [...hourlyData]
    .sort((a: any, b: any) => b.spend - a.spend)
    .filter((h: any) => h.spend > 0)
    .slice(0, 5)
    .map((h: any) => h.hour);

  const topHourlySpendLines = [...hourlyData]
    .sort((a: any, b: any) => b.spend - a.spend)
    .filter((h: any) => h.spend > 0)
    .slice(0, 8)
    .map((h: any) => {
      const raw = String(h.hour ?? '').trim();
      const hourLabel = raw
        ? `${raw.replace(':00', '').replace(/h$/i, '')}h`
        : 'N/A';
      return `${hourLabel}: ${currency}${Number(h.spend || 0).toFixed(0)} gastos`;
    })
    .join('\n');

  const campLines = active
    .sort((a: any, b: any) => b.spend - a.spend)
    .map((c: any) => {
      const prev = campaignsPrev.find((p: any) => p.id === c.id);
      return `"${c.name}" | Status: ${c.status} | ROAS: ${c.roas.toFixed(2)}x | Gasto: ${currency}${c.spend.toFixed(2)} | Receita: ${currency}${c.revenue.toFixed(2)} | Vendas: ${c.purchases} | CTR: ${c.ctr.toFixed(2)}% | CPC: ${currency}${c.cpc.toFixed(2)} | CPM: ${currency}${c.cpm.toFixed(2)}${prev && prev.spend > 0 ? ` | Antes: ROAS ${prev.roas.toFixed(1)}x, ${currency}${prev.spend.toFixed(0)}, ${prev.purchases} vendas` : ''}`;
    }).join('\n');

  const dailyLines = dailyData.map((d: any) =>
    `${d.date}: ROAS ${d.roas.toFixed(1)}x | ${currency}${d.spend.toFixed(0)} | ${currency}${d.revenue.toFixed(0)} | ${d.sales}v`
  ).join('\n');

  return `Gere um relatório executivo completo para um gestor de tráfego sênior. Use markdown com headers ##, negrito, listas. Seja ESPECÍFICO com os números reais — nunca genérico.

CONTA: ${accountName || 'Conta'}
META ROAS: ${roasTarget}x | MOEDA: ${currency}

TOTAIS:
Gasto: ${currency}${totalSpend.toFixed(2)} | Receita: ${currency}${totalRevenue.toFixed(2)} | ROAS: ${avgRoas.toFixed(2)}x | Vendas: ${totalSales}
${prevSpend > 0 ? `Anterior: Gasto ${currency}${prevSpend.toFixed(2)} | Receita ${currency}${prevRevenue.toFixed(2)} | ROAS ${(prevSpend > 0 ? prevRevenue / prevSpend : 0).toFixed(2)}x | Vendas ${prevSales}` : ''}

DADOS HORÁRIOS (TOP INVESTIMENTO):
${topHourlySpendLines || 'N/A'}

Horários pico (por gasto): ${peakHours.join(', ') || 'N/A'}

CAMPANHAS (${active.length}):
${campLines}

EVOLUÇÃO DIÁRIA:
${dailyLines}

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO:
1. **🎯 DIAGNÓSTICO EXECUTIVO** — Resumo de 3-4 frases com os números reais. O que vai bem, o que vai mal.
2. **⚡ TOP 5 AÇÕES PRÓXIMAS 24H** — Ações numeradas com valores exatos (ex: "Aumentar budget de R$60 para R$150")
3. **💰 REDISTRIBUIÇÃO DE BUDGET** — Tabela com budget atual → recomendado para cada campanha, com % de mudança
4. **🎨 3 COPIES PRONTOS** — 3 copies de anúncio com emoji, urgência, social proof ou benefício
5. **🎯 PÚBLICOS PARA TESTAR** — 4 sugestões de público baseadas nos dados
6. **⏰ MELHORES HORÁRIOS** — Análise baseada nos dados horários reais
7. **📊 PREVISÃO 7 DIAS** — Projeção de ROAS, receita e vendas com as otimizações

Fale como consultor sênior. Sem enrolação. Números reais sempre.`;
}

export default function ReportTab() {
  const { analysisData, selectedAccountName } = useDashboard();
  const { profile } = useProfile();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = currencySymbol;
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!analysisData) {
      toast.error('Analise uma conta primeiro (Visão Geral → Analisar).');
      return;
    }
    setLoading(true);
    try {
      const prompt = buildReportPrompt({
        campaigns: analysisData.campaigns,
        campaignsPrev: analysisData.campaignsPrev,
        dailyData: analysisData.dailyData,
        hourlyData: analysisData.hourlyData,
        roasTarget,
        currency,
        accountName: selectedAccountName,
      });

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          system: 'Você é um consultor sênior de Meta Ads. Gere relatórios executivos precisos com dados reais. Use markdown. Responda em português do Brasil.',
          max_tokens: 4096,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setReport(data.content);
    } catch (err: any) {
      toast.error('Erro ao gerar relatório: ' + (err?.message || 'Erro desconhecido'));
    }
    setLoading(false);
  };

  // No data state
  if (!analysisData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Bot className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Relatório Inteligente</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Primeiro analise uma conta na aba Visão Geral, depois gere o relatório completo com IA.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Relatório Inteligente CortexAds</h2>
            <p className="text-[11px] text-muted-foreground">
              {report ? 'Gerado por IA com dados reais' : 'Pronto para gerar'} • {selectedAccountName || 'Conta'}
            </p>
          </div>
        </div>
        <Button
          onClick={generateReport}
          disabled={loading}
          className="h-9 px-4 text-xs gradient-primary text-primary-foreground gap-2"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Gerando...</>
          ) : report ? (
            <><RefreshCw className="w-3.5 h-3.5" />Regenerar</>
          ) : (
            <><Zap className="w-3.5 h-3.5" />Gerar Relatório</>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="space-y-6">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : report ? (
          <div className="prose prose-sm prose-invert max-w-none [&_h2]:text-primary [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:text-[13px] [&_p]:text-foreground/80 [&_p]:leading-relaxed [&_li]:text-[13px] [&_li]:text-foreground/80 [&_strong]:text-foreground [&_table]:text-[12px] [&_th]:text-muted-foreground [&_th]:text-left [&_th]:py-1 [&_th]:pr-4 [&_td]:py-1 [&_td]:pr-4">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              Clique em <strong className="text-foreground">"Gerar Relatório"</strong> para criar um diagnóstico completo com IA usando os dados reais da sua conta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
