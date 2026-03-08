import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Inbox, Loader2, Sparkles, Clock, Users, Lightbulb, BarChart3 } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { mockCampaigns, getRoasColor, formatCurrency, formatNumber } from '@/lib/mockData';
import { ProcessedCampaign } from '@/hooks/useMetaData';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type FilterType = 'all' | 'scale' | 'optimize' | 'pause';

function getRec(roas: number, roasTarget: number) {
  if (roas >= roasTarget * 1.5) return { label: '🚀 Escalar', key: 'scale' as const, color: 'text-success', bg: 'bg-success/10 border-success/20' };
  if (roas >= roasTarget) return { label: '🔧 Otimizar', key: 'optimize' as const, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' };
  if (roas > 0) return { label: '⚠ Atenção', key: 'optimize' as const, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' };
  return { label: '⏸ Pausar', key: 'pause' as const, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
}

function getMetricSemaphore(value: number, thresholds: { good: number; warn: number; higher?: boolean }) {
  const { good, warn, higher = true } = thresholds;
  if (higher) {
    if (value >= good) return 'bg-success';
    if (value >= warn) return 'bg-warning';
    return 'bg-destructive';
  }
  if (value <= good) return 'bg-success';
  if (value <= warn) return 'bg-warning';
  return 'bg-destructive';
}

function getRankBadge(rank: number) {
  if (rank === 1) return { emoji: '🥇', bg: 'bg-warning/20 text-warning border-warning/30' };
  if (rank === 2) return { emoji: '🥈', bg: 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30' };
  if (rank === 3) return { emoji: '🥉', bg: 'bg-warning/15 text-warning/80 border-warning/20' };
  return { emoji: `#${rank}`, bg: 'bg-muted text-muted-foreground border-border' };
}

export default function CampaignsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [aiLoadingIds, setAiLoadingIds] = useState<Set<string>>(new Set());
  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const { analysisData, selectedAccountId } = useDashboard();
  const { profile } = useProfile();
  const { callMetaApi, isConnected } = useMetaConnection();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = profile?.currency || 'R$';

  const rawCampaigns: ProcessedCampaign[] = analysisData?.campaigns || mockCampaigns.map(c => ({
    ...c, purchases: c.sales, cpv: c.spend / c.sales,
  }));

  // Previous period campaigns for comparison
  const prevCampaigns = analysisData?.campaignsPrev || [];
  const prevMap = useMemo(() => {
    const map: Record<string, ProcessedCampaign> = {};
    prevCampaigns.forEach(c => { map[c.id] = c; });
    return map;
  }, [prevCampaigns]);

  // Sort by ROAS descending and assign ranks
  const sorted = useMemo(() => {
    const s = [...rawCampaigns].sort((a, b) => b.roas - a.roas);
    return s.map((c, i) => ({ ...c, rank: i + 1 }));
  }, [rawCampaigns]);

  // Filter
  const campaigns = useMemo(() => {
    if (filter === 'all') return sorted;
    return sorted.filter(c => {
      const rec = getRec(c.roas, roasTarget);
      if (filter === 'scale') return rec.key === 'scale';
      if (filter === 'optimize') return rec.key === 'optimize';
      if (filter === 'pause') return rec.key === 'pause';
      return true;
    });
  }, [sorted, filter, roasTarget]);

  const totalSpend = rawCampaigns.reduce((s, c) => s + c.spend, 0);

  // Toggle campaign status via Meta API
  const toggleCampaignStatus = useCallback(async (campaignId: string, currentStatus: string) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return;
    }
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingIds(prev => new Set(prev).add(campaignId));
    try {
      await callMetaApi(campaignId, { status: newStatus, _method: 'POST' });
      setLocalStatuses(prev => ({ ...prev, [campaignId]: newStatus }));
      toast.success(newStatus === 'ACTIVE' ? 'Campanha ativada ✓' : 'Campanha pausada ✓');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar status da campanha.');
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
    }
  }, [isConnected, selectedAccountId, callMetaApi]);

  // Generate AI analysis for a campaign
  const generateAiAnalysis = useCallback(async (campaign: ProcessedCampaign & { rank: number }) => {
    setAiLoadingIds(prev => new Set(prev).add(campaign.id));
    try {
      const prev = prevMap[campaign.id];
      const prompt = `Analise esta campanha Meta Ads e responda em JSON com as chaves: diagnostico (2-3 frases), acao_principal (1 ação específica com valor), previsao_roas_7d (número estimado), budget_recomendado (valor em ${currency}), hook (frase máx 8 palavras), copy_a (2-3 frases de anúncio), copy_b (variação com ângulo diferente), qual_testar (qual copy testar primeiro e por quê em 1 frase), horarios_sugeridos (string), publico_sugerido (string), proximo_passo (string).

Dados da campanha:
- Nome: ${campaign.name}
- Status: ${campaign.status}
- ROAS: ${campaign.roas.toFixed(2)}x (meta: ${roasTarget}x)
- Gasto: ${currency} ${campaign.spend.toFixed(2)}
- Receita: ${currency} ${campaign.revenue.toFixed(2)}
- Vendas: ${campaign.purchases}
- CTR: ${campaign.ctr.toFixed(2)}%
- CPC: ${currency} ${campaign.cpc.toFixed(2)}
- CPM: ${currency} ${campaign.cpm.toFixed(2)}
- Impressões: ${campaign.impressions}
- Cliques: ${campaign.clicks}
- Ranking: #${campaign.rank} de ${sorted.length}
${prev ? `\nPeríodo anterior: ROAS ${prev.roas.toFixed(2)}x, Gasto ${currency} ${prev.spend.toFixed(2)}, Receita ${currency} ${prev.revenue.toFixed(2)}, Vendas ${prev.purchases}` : ''}

Responda SOMENTE com o JSON, sem markdown.`;

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          system: 'Você é um especialista em Meta Ads. Responda SOMENTE com JSON válido, sem backticks ou markdown.',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      let parsed;
      try {
        const content = data.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(content);
      } catch {
        parsed = { diagnostico: data.content, acao_principal: 'Verifique os dados manualmente.', previsao_roas_7d: campaign.roas, budget_recomendado: campaign.spend };
      }

      setAiResults(prev => ({ ...prev, [campaign.id]: parsed }));
    } catch (err: any) {
      toast.error('Erro ao gerar análise IA: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setAiLoadingIds(prev => { const n = new Set(prev); n.delete(campaign.id); return n; });
    }
  }, [prevMap, roasTarget, currency, sorted.length]);

  if (analysisData && rawCampaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Sem campanhas para este período</h3>
        <p className="text-xs text-muted-foreground">Selecione um período maior ou verifique a conta.</p>
      </div>
    );
  }

  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: sorted.length },
    { key: 'scale', label: '🚀 Escalar', count: sorted.filter(c => getRec(c.roas, roasTarget).key === 'scale').length },
    { key: 'optimize', label: '🔧 Otimizar', count: sorted.filter(c => getRec(c.roas, roasTarget).key === 'optimize').length },
    { key: 'pause', label: '⏸ Pausar', count: sorted.filter(c => getRec(c.roas, roasTarget).key === 'pause').length },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterButtons.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
              filter === f.key
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border-hover'
            }`}
          >
            {f.label} <span className="ml-1 opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Campaign cards */}
      {campaigns.map(c => {
        const expanded = expandedId === c.id;
        const roas = c.roas;
        const rec = getRec(roas, roasTarget);
        const rank = getRankBadge(c.rank);
        const effectiveStatus = localStatuses[c.id] || c.status;
        const isActive = effectiveStatus === 'ACTIVE';
        const isToggling = togglingIds.has(c.id);
        const borderColor = isActive
          ? roas >= roasTarget * 1.2 ? 'border-l-success' : roas >= roasTarget ? 'border-l-primary' : roas >= roasTarget * 0.7 ? 'border-l-warning' : 'border-l-destructive'
          : 'border-l-muted-foreground/30';
        const purchases = c.purchases;
        const revenue = c.revenue;
        const budgetPct = totalSpend > 0 ? ((c.spend / totalSpend) * 100).toFixed(0) : '0';
        const roasProgress = Math.min((roas / roasTarget) * 100, 200);
        const prev = prevMap[c.id];
        const ai = aiResults[c.id];
        const aiLoading = aiLoadingIds.has(c.id);

        return (
          <div key={c.id} className={`bg-card border border-border rounded-lg overflow-hidden animate-fade-up border-l-[3px] ${borderColor} ${!isActive ? 'opacity-60' : ''}`}>
            {/* HEADER */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                {/* Left: Toggle + Rank + Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Toggle */}
                  <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => toggleCampaignStatus(c.id, effectiveStatus)}
                        className="scale-75"
                      />
                    )}
                  </div>
                  {/* Rank Badge */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0 ${rank.bg}`}>
                    {rank.emoji}
                  </span>
                  {/* Name + Badge */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${rec.bg} ${rec.color}`}>{rec.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {isActive ? 'Ativo' : 'Pausado'} • {budgetPct}% do budget
                    </p>
                  </div>
                </div>

                {/* Right: Metrics */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className={`text-lg font-extrabold ${getRoasColor(roas, roasTarget)}`}>{roas.toFixed(1)}x</p>
                    <p className="text-[10px] text-muted-foreground">ROAS</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(c.spend, currency)}</p>
                    <p className="text-[10px] text-muted-foreground">Gasto</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(revenue, currency)}</p>
                    <p className="text-[10px] text-muted-foreground">Receita</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-foreground">{purchases}</p>
                    <p className="text-[10px] text-muted-foreground">Vendas</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-foreground">{c.ctr.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground">CTR</p>
                  </div>
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(c.cpm, currency)}</p>
                    <p className="text-[10px] text-muted-foreground">CPM</p>
                  </div>
                  <button onClick={() => setExpandedId(expanded ? null : c.id)} className="p-1 hover:bg-muted/50 rounded transition-colors">
                    {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* ROAS Progress Bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 relative">
                  <Progress value={Math.min(roasProgress, 100)} className="h-1.5 bg-muted" />
                  {roasProgress > 100 && (
                    <div className="absolute top-0 left-0 h-1.5 rounded-full bg-success/40" style={{ width: `${Math.min(roasProgress, 200) / 2}%` }} />
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${roas >= roasTarget ? 'text-success' : 'text-warning'}`}>
                  {roasProgress.toFixed(0)}% da meta
                </span>
              </div>
            </div>

            {/* EXPANDED CONTENT */}
            {expanded && (
              <div className="border-t border-border animate-fade-up">
                {/* AI Generate Button */}
                {!ai && (
                  <div className="p-4 border-b border-border bg-muted/10">
                    <Button
                      onClick={() => generateAiAnalysis(c)}
                      disabled={aiLoading}
                      size="sm"
                      className="gradient-primary text-primary-foreground text-xs"
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      {aiLoading ? 'Analisando com IA...' : 'Gerar Análise IA + Copies'}
                    </Button>
                  </div>
                )}

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/10">
                  {/* BLOCO 1 — MÉTRICAS COMPLETAS */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-3.5 h-3.5 text-primary" />
                      <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Métricas Completas</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Receita', value: formatCurrency(revenue, currency), sem: getMetricSemaphore(revenue, { good: c.spend * roasTarget, warn: c.spend, higher: true }), prev: prev ? formatCurrency(prev.revenue, currency) : null, delta: prev ? ((revenue - prev.revenue) / (prev.revenue || 1) * 100) : null },
                        { label: 'Lucro Bruto', value: formatCurrency(revenue - c.spend, currency), sem: getMetricSemaphore(revenue - c.spend, { good: 0, warn: -c.spend * 0.2, higher: true }), prev: prev ? formatCurrency(prev.revenue - prev.spend, currency) : null, delta: prev ? (((revenue - c.spend) - (prev.revenue - prev.spend)) / (Math.abs(prev.revenue - prev.spend) || 1) * 100) : null },
                        { label: 'CPC', value: `${currency} ${c.cpc.toFixed(2)}`, sem: getMetricSemaphore(c.cpc, { good: 1.0, warn: 2.5, higher: false }), prev: prev ? `${currency} ${prev.cpc.toFixed(2)}` : null, delta: prev ? ((c.cpc - prev.cpc) / (prev.cpc || 1) * 100) : null },
                        { label: 'CPV', value: `${currency} ${(c.cpv || 0).toFixed(2)}`, sem: getMetricSemaphore(c.cpv, { good: 30, warn: 80, higher: false }), prev: prev ? `${currency} ${(prev.cpv || 0).toFixed(2)}` : null, delta: prev && prev.cpv ? ((c.cpv - prev.cpv) / prev.cpv * 100) : null },
                        { label: 'Impressões', value: formatNumber(c.impressions), sem: getMetricSemaphore(c.impressions, { good: 10000, warn: 2000, higher: true }), prev: prev ? formatNumber(prev.impressions) : null, delta: prev ? ((c.impressions - prev.impressions) / (prev.impressions || 1) * 100) : null },
                        { label: 'Cliques', value: formatNumber(c.clicks), sem: getMetricSemaphore(c.clicks, { good: 500, warn: 100, higher: true }), prev: prev ? formatNumber(prev.clicks) : null, delta: prev ? ((c.clicks - prev.clicks) / (prev.clicks || 1) * 100) : null },
                        { label: 'CPM', value: `${currency} ${c.cpm.toFixed(2)}`, sem: getMetricSemaphore(c.cpm, { good: 20, warn: 40, higher: false }), prev: prev ? `${currency} ${prev.cpm.toFixed(2)}` : null, delta: prev ? ((c.cpm - prev.cpm) / (prev.cpm || 1) * 100) : null },
                        { label: 'CTR', value: `${c.ctr.toFixed(2)}%`, sem: getMetricSemaphore(c.ctr, { good: 2.0, warn: 1.0, higher: true }), prev: prev ? `${prev.ctr.toFixed(2)}%` : null, delta: prev ? ((c.ctr - prev.ctr) / (prev.ctr || 1) * 100) : null },
                      ].map(m => (
                        <div key={m.label} className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${m.sem}`} />
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">{m.label}</p>
                            <p className="text-xs font-bold text-foreground">{m.value}</p>
                            {m.delta !== null && (
                              <p className={`text-[9px] ${m.delta >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {m.delta >= 0 ? '▲' : '▼'} {Math.abs(m.delta).toFixed(0)}% vs anterior
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BLOCO 2 — ANÁLISE IA */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-secondary" />
                      <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Análise IA</h4>
                    </div>
                    {aiLoading ? (
                      <div className="flex items-center gap-2 py-8 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Analisando com Claude...</span>
                      </div>
                    ) : ai ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-primary font-semibold mb-1">Diagnóstico</p>
                          <p className="text-[11px] text-foreground/80 leading-relaxed">{ai.diagnostico}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/10 rounded-md p-2">
                          <p className="text-[10px] text-primary font-semibold mb-0.5">🎯 Ação Principal</p>
                          <p className="text-[11px] text-foreground leading-relaxed">{ai.acao_principal}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-muted rounded-md p-2">
                            <p className="text-[10px] text-muted-foreground">Previsão ROAS 7d</p>
                            <p className={`text-sm font-bold ${getRoasColor(ai.previsao_roas_7d || roas, roasTarget)}`}>{(ai.previsao_roas_7d || roas).toFixed(1)}x</p>
                          </div>
                          <div className="bg-muted rounded-md p-2">
                            <p className="text-[10px] text-muted-foreground">Budget Recomendado</p>
                            <p className="text-sm font-bold text-foreground">{currency} {parseFloat(ai.budget_recomendado || c.spend).toFixed(0)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {roas >= roasTarget * 1.5 ? 'Campanha acima da meta. Clique acima para diagnóstico IA completo.' :
                           roas >= roasTarget ? 'Performance estável. Gere a análise IA para recomendações.' :
                           roas > 0 ? 'Abaixo da meta. Gere análise IA para ações corretivas.' :
                           'Sem retorno. Gere análise IA para próximos passos.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* BLOCO 3 — COPY A/B */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-3.5 h-3.5 text-warning" />
                      <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Copy A/B</h4>
                    </div>
                    {ai ? (
                      <div className="space-y-3">
                        {ai.hook && (
                          <div className="bg-warning/5 border border-warning/10 rounded-md p-2">
                            <p className="text-[10px] text-warning font-semibold mb-0.5">🪝 Hook</p>
                            <p className="text-sm font-bold text-foreground">{ai.hook}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-2">
                          <div className="bg-muted rounded-md p-3 border border-primary/10">
                            <p className="text-[10px] text-primary font-semibold mb-1">Copy A</p>
                            <p className="text-[11px] text-foreground/90 leading-relaxed">{ai.copy_a || 'Gere a análise IA para ver copies.'}</p>
                          </div>
                          <div className="bg-muted rounded-md p-3 border border-secondary/10">
                            <p className="text-[10px] text-secondary font-semibold mb-1">Copy B</p>
                            <p className="text-[11px] text-foreground/90 leading-relaxed">{ai.copy_b || 'Gere a análise IA para ver copies.'}</p>
                          </div>
                        </div>
                        {ai.qual_testar && (
                          <p className="text-[10px] text-muted-foreground italic">💡 {ai.qual_testar}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground text-center py-6">
                        Clique em "Gerar Análise IA" para criar copies A/B personalizados.
                      </p>
                    )}
                  </div>

                  {/* BLOCO 4 — HORÁRIOS E OTIMIZAÇÃO */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3.5 h-3.5 text-success" />
                      <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Horários & Otimização</h4>
                    </div>
                    {ai ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">⏰ Melhores Horários</p>
                          <p className="text-[11px] text-foreground">{ai.horarios_sugeridos || 'Dados insuficientes para esta campanha.'}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground">Público Sugerido</p>
                          </div>
                          <p className="text-[11px] text-foreground">{ai.publico_sugerido || 'Gere análise IA para sugestões.'}</p>
                        </div>
                        <div className="bg-success/5 border border-success/10 rounded-md p-2">
                          <p className="text-[10px] text-success font-semibold mb-0.5">✅ Próximo Passo</p>
                          <p className="text-[11px] text-foreground">{ai.proximo_passo || 'Siga as recomendações acima.'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground text-center py-6">
                        Clique em "Gerar Análise IA" para ver horários e otimizações.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
