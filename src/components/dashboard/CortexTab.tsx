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
import { cn } from '@/lib/utils';

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
      setProgress('Buscando criativos...');
      await analyzeCreatives(scopeIds);

      setProgress('Detectando fadiga criativa...');
      await analyzeFatigue(scopeIds);

      setProgress('Gerando previsão...');
      await generateForecast();

      if (campaigns.length > 0) {
        setProgress('Gerando plano de ação...');
        await generatePlan(campaigns);
      }

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

      <div className="flex items-center gap-1 rounded-2xl border border-border-default bg-card p-1.5 shadow-sm">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-medium transition-all duration-150',
                activeSubTab === tab.key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

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
          onGenerateAds={() => generateAdCopy(creatives.filter((c) => c.score >= 60), 'Meta Ads')}
        />
      )}

      {activeSubTab === 'forecast' && (
        <CortexForecastPanel
          forecast={forecast}
          loading={forecastLoading}
          historicalData={analysisData?.dailyData?.map((d) => ({
            date: d.date,
            roas: d.roas,
            spend: d.spend,
            revenue: d.revenue,
          }))}
        />
      )}

      {activeSubTab === 'fatigue' && <CortexFatigue results={fatigueResults} loading={fatigueLoading} />}

      {activeSubTab === 'history' && <CortexHistory history={cortexHistory} loading={historyLoading} />}

      <CortexScopeSelector
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        onConfirm={handleScopeConfirm}
        selectedIds={scopeIds}
      />

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

function calculateConfidence(action: any, campaigns: any[]): { score: number; label: string; tone: string; bar: string } {
  let score = 50;

  if (campaigns.length >= 5) score += 10;
  else if (campaigns.length >= 3) score += 5;

  if (action.valor_atual && action.valor_novo) score += 10;
  if (action.motivo && action.motivo.length > 20) score += 5;

  const campaign = campaigns.find((c: any) => c.id === action.campaign_id || c.name === action.campaign_name);
  if (campaign) {
    const spend = campaign.spend || 0;
    const revenue = campaign.revenue || 0;
    const roas = spend > 0 ? revenue / spend : 0;

    if (roas < 1 || roas > 5) score += 15;
    else if (roas < 1.5 || roas > 4) score += 10;

    if (spend > 500) score += 10;
    else if (spend > 100) score += 5;
  }

  if (action.prioridade === 1) score += 5;

  score = Math.min(99, Math.max(20, score));

  if (score >= 80) return { score, label: 'Alta', tone: 'text-success', bar: 'bg-success' };
  if (score >= 60) return { score, label: 'Média', tone: 'text-warning', bar: 'bg-warning' };
  return { score, label: 'Baixa', tone: 'text-destructive', bar: 'bg-destructive' };
}

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
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-text-muted">Gerando plano de ação...</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-border-default bg-card px-6 py-16 text-center">
        <div className="mb-3 text-4xl opacity-30">🎯</div>
        <p className="text-sm font-semibold text-text-primary">Plano ainda não gerado</p>
        <p className="mt-2 text-sm text-text-muted">Execute a análise completa para gerar o plano de ação.</p>
        {campaigns.length > 0 && (
          <Button onClick={() => generatePlan(campaigns)} className="mt-5 h-10 rounded-2xl px-5 text-sm font-semibold">
            <Zap className="h-4 w-4" />
            Gerar Plano CORTEX
          </Button>
        )}
      </div>
    );
  }

  const priorities = [
    { level: 1, label: 'Urgente', emoji: '🔴', color: 'border-destructive/25' },
    { level: 2, label: 'Importante', emoji: '🟡', color: 'border-warning/25' },
    { level: 3, label: 'Oportunidade', emoji: '🟢', color: 'border-success/25' },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[1.75rem] border border-border-default bg-card shadow-[0_20px_50px_-36px_hsl(var(--foreground)/0.22)]">
        <div className="grid gap-4 px-5 py-5 md:grid-cols-[120px_1fr_auto] md:items-center md:px-6">
          <div className="rounded-[1.4rem] border border-primary/15 bg-primary/5 px-4 py-4 text-center">
            <p className="text-3xl font-bold text-text-primary">{plan.score_conta}</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Score da conta</p>
          </div>
          <div>
            <p className="text-sm leading-6 text-text-secondary">{plan.resumo}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center text-sm md:min-w-[180px]">
            <div className="rounded-2xl border border-border-subtle bg-background/70 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">ROAS Atual</p>
              <p className="mt-1 font-bold text-text-primary">{plan.roas_atual?.toFixed(1)}x</p>
            </div>
            <div className="rounded-2xl border border-success/15 bg-success/5 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Estimado</p>
              <p className="mt-1 font-bold text-success">{plan.roas_estimado?.toFixed(1)}x</p>
            </div>
          </div>
        </div>
      </div>

      {priorities.map((priority) => {
        const actions = plan.acoes?.filter((action: any) => action.prioridade === priority.level) || [];
        if (actions.length === 0) return null;

        return (
          <section key={priority.level}>
            <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              <span>{priority.emoji}</span>
              {priority.label} ({actions.length})
            </h4>
            <div className={cn('space-y-3 border-l-2 pl-4', priority.color)}>
              {actions.map((action: any) => {
                const confidence = calculateConfidence(action, campaigns);
                return (
                  <article key={action.campaign_id} className="rounded-[1.4rem] border border-border-default bg-card p-4 transition-all hover:border-border-hover hover:shadow-[0_16px_36px_-30px_hsl(var(--foreground)/0.22)]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-text-primary">{action.campaign_name}</p>
                          <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', confidence.tone, 'bg-secondary')}>
                            {confidence.score}% confiança
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-6 text-text-secondary">{action.motivo}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[190px_auto_auto] xl:items-center">
                        <div className="rounded-2xl border border-border-subtle bg-background/80 px-3 py-3">
                          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-text-muted">
                            <span>Confiança</span>
                            <span className={confidence.tone}>{confidence.label}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div className={cn('h-full rounded-full', confidence.bar)} style={{ width: `${confidence.score}%` }} />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border-subtle bg-background/80 px-3 py-3 text-xs text-text-secondary">
                          <p>Impacto</p>
                          <p className="mt-1 font-semibold text-success">{action.impacto_estimado}</p>
                        </div>

                        <div className="rounded-2xl border border-border-subtle bg-background/80 px-3 py-3 text-xs text-text-secondary">
                          <p>Budget</p>
                          <p className="mt-1 font-semibold text-text-primary">
                            {currencySymbol} {action.valor_atual?.toFixed(0)} → {action.valor_novo?.toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyAction(action)}
                        className="h-9 shrink-0 rounded-2xl border-border-default px-4 text-xs font-semibold text-text-secondary hover:text-text-primary"
                      >
                        {action.tipo === 'pause' ? '⏸ Pausar' : action.tipo === 'increase_budget' ? '🚀 Escalar' : 'Aplicar'}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
