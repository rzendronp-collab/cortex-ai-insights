import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useCortexCreatives, CreativeScore } from '@/hooks/useCortexCreatives';
import { useCortexForecast } from '@/hooks/useCortexForecast';
import { useCortexActions, CortexAction } from '@/hooks/useCortexActions';
import { useCortexFatigue } from '@/hooks/useCortexFatigue';
import { useActionPlan } from '@/hooks/useActionPlan';
import CortexScopeSelector from '@/components/cortex/CortexScopeSelector';
import CortexCreativeScorePanel from '@/components/cortex/CortexCreativeScore';
import CortexForecastPanel from '@/components/cortex/CortexForecast';
import CortexConfirmModal from '@/components/cortex/CortexConfirmModal';
import CortexHistory from '@/components/cortex/CortexHistory';
import CortexFatigue from '@/components/cortex/CortexFatigue';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Settings2, Clock, BarChart3, TrendingUp, History, Flame } from 'lucide-react';
import { toast } from 'sonner';

type SubTab = 'action-plan' | 'creatives' | 'forecast' | 'fatigue' | 'history';

const SUB_TABS: { key: SubTab; label: string; icon: typeof Zap }[] = [
  { key: 'action-plan', label: 'Plano de Ação', icon: Zap },
  { key: 'creatives', label: 'Score Criativos', icon: BarChart3 },
  { key: 'forecast', label: 'Previsão', icon: TrendingUp },
  { key: 'fatigue', label: 'Fadiga', icon: Flame },
  { key: 'history', label: 'Histórico', icon: History },
];

export default function CortexTab() {
  const { analysisData, activeAccountIds, currencySymbol } = useDashboard();
  const { adAccounts } = useMetaConnection();
  const { creatives, loading: creativesLoading, analyzeCreatives, generatedAds, generating: adGenerating, generateAdCopy } = useCortexCreatives();
  const { forecast, loading: forecastLoading, generateForecast } = useCortexForecast();
  const { executing, executeAction, history: cortexHistory, historyLoading, fetchHistory } = useCortexActions();
  const { results: fatigueResults, loading: fatigueLoading, analyzeFatigue } = useCortexFatigue();
  const {
    plan, isGenerating, isApplying, appliedCount,
    generatePlan, applyAction, applyAllActions, simulatePlan, fetchHistory: fetchActionHistory,
    history: actionHistory,
  } = useActionPlan();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('action-plan');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeIds, setScopeIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cortex_scope') || '{}');
      return saved.accountIds || activeAccountIds;
    } catch { return activeAccountIds; }
  });
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cortex_scope') || '{}');
      return saved.analyzedAt || null;
    } catch { return null; }
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');

  // Confirm modal state
  const [confirmAction, setConfirmAction] = useState<{
    creative?: CreativeScore;
    action?: CortexAction;
    title: string;
    campaignName: string;
    actionLabel: string;
    reasoning: string;
    expectedImpact: string;
  } | null>(null);

  useEffect(() => {
    fetchHistory(scopeIds);
  }, [fetchHistory, scopeIds]);

  const campaigns = analysisData?.campaigns || [];

  const handleScopeConfirm = (ids: string[]) => {
    setScopeIds(ids);
  };

  const handleFullAnalysis = useCallback(async () => {
    if (scopeIds.length === 0) {
      toast.error('Selecione pelo menos uma conta.');
      return;
    }

    setAnalyzing(true);

    try {
      // Step 1: Creatives
      setProgress('Buscando criativos...');
      await analyzeCreatives(scopeIds);

      // Step 2: Fatigue
      setProgress('Detectando fadiga criativa...');
      await analyzeFatigue(scopeIds);

      // Step 3: Forecast
      setProgress('Gerando previsão...');
      await generateForecast();

      // Step 4: Action Plan
      if (campaigns.length > 0) {
        setProgress('Gerando plano de ação...');
        await generatePlan(campaigns);
      }

      // Step 5: History
      setProgress('Carregando histórico...');
      await fetchHistory(scopeIds);

      setLastAnalysis(new Date().toISOString());
      localStorage.setItem('cortex_scope', JSON.stringify({ accountIds: scopeIds, analyzedAt: new Date().toISOString() }));
      toast.success('Análise CORTEX completa!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro na análise.');
    } finally {
      setAnalyzing(false);
      setProgress('');
    }
  }, [scopeIds, analyzeCreatives, analyzeFatigue, generateForecast, generatePlan, campaigns, fetchHistory]);

  const handleCreativeAction = (creative: CreativeScore) => {
    const isPause = creative.status === 'pausar';
    const action: CortexAction = {
      id: creative.id,
      priority: isPause ? 1 : 3,
      type: isPause ? 'pause_ad' : 'scale_budget',
      accountId: creative.campaignId?.split('/')[0] || scopeIds[0] || '',
      adId: creative.id,
      campaignId: creative.campaignId,
      title: creative.name,
      reasoning: creative.reasoning,
      expectedImpact: creative.action,
      apiCall: isPause ? {
        method: 'POST',
        endpoint: creative.id,
        body: { status: 'PAUSED' },
      } : undefined,
      status: 'pending',
      metricsBefore: {
        roas: creative.roas,
        spend: creative.spend,
        ctr: creative.ctr,
        cpm: creative.cpm,
        purchases: creative.purchases,
      },
    };

    setConfirmAction({
      action,
      creative,
      title: creative.name,
      campaignName: creative.campaignName || creative.name,
      actionLabel: creative.action,
      reasoning: creative.reasoning,
      expectedImpact: creative.action,
    });
  };

  const handleConfirmExecute = async () => {
    if (!confirmAction?.action) return;
    const success = await executeAction(confirmAction.action);
    if (success) {
      await fetchHistory(scopeIds);
    }
    setConfirmAction(null);
  };

  const lastTimeFormatted = lastAnalysis
    ? (() => {
        const diff = Date.now() - new Date(lastAnalysis).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `há ${mins}min`;
        const hours = Math.floor(mins / 60);
        return `há ${hours}h`;
      })()
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="overflow-hidden rounded-[1.75rem] border border-border-highlight bg-card shadow-[0_24px_60px_-38px_hsl(var(--primary)/0.45)]">
        <div className="panel-highlight border-b border-border-subtle px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.8)]">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold tracking-[-0.04em] text-text-primary">CORTEX Intelligence</h2>
                  <p className="mt-1 text-sm text-text-secondary">Análise profunda · execução real · histórico comparado</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {lastTimeFormatted ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-background/80 px-3 py-1.5 text-[11px] font-medium text-text-secondary">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Última análise {lastTimeFormatted}
                </div>
              ) : null}

              <button
                onClick={() => setScopeOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-border-default bg-background px-3.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              >
                <Settings2 className="h-4 w-4" />
                Contas selecionadas: {scopeIds.length}
              </button>

              <Button
                onClick={handleFullAnalysis}
                disabled={analyzing || scopeIds.length === 0}
                className="h-11 rounded-2xl px-5 text-sm font-semibold shadow-[0_18px_36px_-22px_hsl(var(--primary)/0.85)]"
              >
                {analyzing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{progress || 'Analisando...'}</>
                ) : (
                  <><Zap className="h-4 w-4" />Executar análise completa</>
                )}
              </Button>
            </div>
          </div>

          {analyzing ? (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="gradient-primary h-full w-3/5 rounded-full animate-pulse" />
              </div>
              <p className="mt-2 text-xs font-medium text-primary">{progress}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-[#F8F9FC] border border-[#E4E7EF] rounded-lg p-1">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium rounded-md transition-all duration-150 ${
                activeSubTab === tab.key
                  ? 'bg-[#7C3AED]/15 text-[#8B85FF] border border-[#7C3AED]/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'action-plan' && (
        <ActionPlanSection
          plan={plan}
          isGenerating={isGenerating}
          campaigns={campaigns}
          generatePlan={generatePlan}
          applyAction={applyAction}
          currencySymbol={currencySymbol}
        />
      )}

      {activeSubTab === 'creatives' && (
        <CortexCreativeScorePanel
          creatives={creatives}
          loading={creativesLoading}
          onAction={handleCreativeAction}
          generatedAds={generatedAds}
          generating={adGenerating}
          onGenerateAds={() => generateAdCopy(creatives.filter(c => c.score >= 60), 'Meta Ads')}
        />
      )}

      {activeSubTab === 'forecast' && (
        <CortexForecastPanel
          forecast={forecast}
          loading={forecastLoading}
          historicalData={analysisData?.dailyData?.map(d => ({
            date: d.date,
            roas: d.roas,
            spend: d.spend,
            revenue: d.revenue,
          }))}
        />
      )}

      {activeSubTab === 'fatigue' && (
        <CortexFatigue results={fatigueResults} loading={fatigueLoading} />
      )}

      {activeSubTab === 'history' && (
        <CortexHistory history={cortexHistory} loading={historyLoading} />
      )}

      {/* Scope selector modal */}
      <CortexScopeSelector
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        onConfirm={handleScopeConfirm}
        selectedIds={scopeIds}
      />

      {/* Confirm modal */}
      <CortexConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmExecute}
        loading={!!executing}
        title={confirmAction?.title || ''}
        campaignName={confirmAction?.campaignName || ''}
        actionLabel={confirmAction?.actionLabel || ''}
        reasoning={confirmAction?.reasoning || ''}
        expectedImpact={confirmAction?.expectedImpact || ''}
      />
    </div>
  );
}

/* ═══ CONFIDENCE SCORE (local, no API) ═══ */
function calculateConfidence(action: any, campaigns: any[]): { score: number; label: string; color: string } {
  let score = 50; // baseline

  // Factor 1: data volume — more campaigns = more confidence
  if (campaigns.length >= 5) score += 10;
  else if (campaigns.length >= 3) score += 5;

  // Factor 2: action has clear metrics
  if (action.valor_atual && action.valor_novo) score += 10;
  if (action.motivo && action.motivo.length > 20) score += 5;

  // Factor 3: ROAS deviation from target
  const campaign = campaigns.find((c: any) => c.id === action.campaign_id || c.name === action.campaign_name);
  if (campaign) {
    const spend = campaign.spend || 0;
    const revenue = campaign.revenue || 0;
    const roas = spend > 0 ? revenue / spend : 0;
    // Strong signals (very low or very high ROAS) = more confidence
    if (roas < 1 || roas > 5) score += 15;
    else if (roas < 1.5 || roas > 4) score += 10;
    // More spend = more data = more confidence
    if (spend > 500) score += 10;
    else if (spend > 100) score += 5;
  }

  // Factor 4: priority alignment
  if (action.prioridade === 1) score += 5; // urgent = clearer signal

  score = Math.min(99, Math.max(20, score));

  let label = 'Baixa';
  let color = 'text-red-400 bg-red-500/10';
  if (score >= 80) { label = 'Alta'; color = 'text-emerald-400 bg-emerald-500/10'; }
  else if (score >= 60) { label = 'Média'; color = 'text-amber-400 bg-amber-500/10'; }

  return { score, label, color };
}

/* ═══ ACTION PLAN SECTION ═══ */
function ActionPlanSection({
  plan, isGenerating, campaigns, generatePlan, applyAction, currencySymbol,
}: {
  plan: any;
  isGenerating: boolean;
  campaigns: any[];
  generatePlan: (c: any[]) => void;
  applyAction: (a: any) => Promise<boolean>;
  currencySymbol: string;
}) {
  if (isGenerating) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
        <span className="text-sm text-text-muted">Gerando plano de ação...</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">🎯</div>
        <p className="text-sm text-text-muted mb-4">Execute a análise completa para gerar o plano de ação.</p>
        {campaigns.length > 0 && (
          <Button
            onClick={() => generatePlan(campaigns)}
            className="text-[12px] bg-[#7C3AED] hover:bg-[#5558E6] text-white gap-2"
          >
            <Zap className="w-4 h-4" />
            Gerar Plano CORTEX
          </Button>
        )}
      </div>
    );
  }

  const priorities = [
    { level: 1, label: 'URGENTE', emoji: '🔴', color: 'border-red-500/30' },
    { level: 2, label: 'IMPORTANTE', emoji: '🟡', color: 'border-amber-500/30' },
    { level: 3, label: 'OPORTUNIDADE', emoji: '🟢', color: 'border-emerald-500/30' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl p-4 flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-text-primary">{plan.score_conta}</p>
          <p className="text-[9px] text-text-muted uppercase">Score</p>
        </div>
        <div className="h-12 w-px bg-[#E4E7EF]" />
        <div className="flex-1">
          <p className="text-[12px] text-text-muted">{plan.resumo}</p>
        </div>
        <div className="flex gap-3 text-[12px] flex-shrink-0">
          <div className="text-center">
            <p className="text-text-muted text-[10px]">ROAS Atual</p>
            <p className="font-bold text-text-primary">{plan.roas_atual?.toFixed(1)}x</p>
          </div>
          <div className="text-center">
            <p className="text-text-muted text-[10px]">Estimado</p>
            <p className="font-bold text-success">{plan.roas_estimado?.toFixed(1)}x</p>
          </div>
        </div>
      </div>

      {/* Actions by priority */}
      {priorities.map(p => {
        const actions = plan.acoes?.filter((a: any) => a.prioridade === p.level) || [];
        if (actions.length === 0) return null;
        return (
          <div key={p.level}>
            <h4 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {p.emoji} {p.label} ({actions.length})
            </h4>
            <div className={`space-y-2 border-l-2 ${p.color} pl-4`}>
              {actions.map((a: any) => {
                const conf = calculateConfidence(a, campaigns);
                return (
                  <div key={a.campaign_id} className="rounded-lg border border-border-default bg-card p-3 flex items-center gap-3 transition-colors hover:border-border-hover">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-text-primary truncate">{a.campaign_name}</p>
                      <p className="text-[10px] text-text-muted">{a.motivo}</p>
                    </div>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${conf.color}`} title={`Confiança: ${conf.score}%`}>
                      {conf.score}% {conf.label}
                    </span>
                    <span className="text-[10px] text-success font-medium flex-shrink-0">{a.impacto_estimado}</span>
                    <span className="text-[10px] text-text-muted flex-shrink-0">
                      {currencySymbol} {a.valor_atual?.toFixed(0)} → {a.valor_novo?.toFixed(0)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyAction(a)}
                      className="h-7 px-3 text-[10px] font-semibold border-[#E4E7EF] text-text-muted hover:text-text-primary flex-shrink-0"
                    >
                      {a.tipo === 'pause' ? '⏸ Pausar' : a.tipo === 'increase_budget' ? '🚀 Escalar' : 'Aplicar'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
