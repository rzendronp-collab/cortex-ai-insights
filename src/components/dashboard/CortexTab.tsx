import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useCortexCreatives, CreativeScore } from '@/hooks/useCortexCreatives';
import { useCortexForecast } from '@/hooks/useCortexForecast';
import { useCortexActions, CortexAction } from '@/hooks/useCortexActions';
import { useActionPlan } from '@/hooks/useActionPlan';
import CortexScopeSelector from '@/components/cortex/CortexScopeSelector';
import CortexCreativeScorePanel from '@/components/cortex/CortexCreativeScore';
import CortexForecastPanel from '@/components/cortex/CortexForecast';
import CortexConfirmModal from '@/components/cortex/CortexConfirmModal';
import CortexHistory from '@/components/cortex/CortexHistory';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Settings2, Clock, BarChart3, TrendingUp, History } from 'lucide-react';
import { toast } from 'sonner';

type SubTab = 'action-plan' | 'creatives' | 'forecast' | 'history';

const SUB_TABS: { key: SubTab; label: string; icon: typeof Zap }[] = [
  { key: 'action-plan', label: 'Plano de Ação', icon: Zap },
  { key: 'creatives', label: 'Score Criativos', icon: BarChart3 },
  { key: 'forecast', label: 'Previsão', icon: TrendingUp },
  { key: 'history', label: 'Histórico', icon: History },
];

export default function CortexTab() {
  const { analysisData, activeAccountIds, currencySymbol } = useDashboard();
  const { adAccounts } = useMetaConnection();
  const { creatives, loading: creativesLoading, analyzeCreatives } = useCortexCreatives();
  const { forecast, loading: forecastLoading, generateForecast } = useCortexForecast();
  const { executing, executeAction, history: cortexHistory, historyLoading, fetchHistory } = useCortexActions();
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

      // Step 2: Forecast
      setProgress('Gerando previsão...');
      await generateForecast();

      // Step 3: Action Plan
      if (campaigns.length > 0) {
        setProgress('Gerando plano de ação...');
        await generatePlan(campaigns);
      }

      // Step 4: History
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
  }, [scopeIds, analyzeCreatives, generateForecast, generatePlan, campaigns, fetchHistory]);

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
      <div className="bg-gradient-to-r from-[#6366F1]/10 to-[#111827] border border-[#6366F1]/20 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#6366F1]" />
              CORTEX Intelligence
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              Análise profunda · Execução real · Histórico comparado
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastTimeFormatted && (
              <span className="flex items-center gap-1 text-[10px] text-text-muted">
                <Clock className="w-3 h-3" /> Última: {lastTimeFormatted}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setScopeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-text-muted bg-[#0A0F1E] border border-[#1F2937] rounded-lg hover:text-text-primary hover:border-[#374151] transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Contas selecionadas: {scopeIds.length}
          </button>
          <Button
            onClick={handleFullAnalysis}
            disabled={analyzing || scopeIds.length === 0}
            className="px-5 py-2 text-[12px] font-bold bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white hover:opacity-90 rounded-lg gap-2"
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{progress || 'Analisando...'}</>
            ) : (
              <><Zap className="w-4 h-4" />Executar análise completa</>
            )}
          </Button>
        </div>

        {/* Progress bar */}
        {analyzing && (
          <div className="mt-3">
            <div className="h-1 bg-[#1F2937] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-[10px] text-[#818CF8] mt-1">{progress}</p>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-[#0A0F1E] border border-[#1F2937] rounded-lg p-1">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium rounded-md transition-all duration-150 ${
                activeSubTab === tab.key
                  ? 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30'
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
        <Loader2 className="w-5 h-5 animate-spin text-[#6366F1]" />
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
            className="text-[12px] bg-[#6366F1] hover:bg-[#5558E6] text-white gap-2"
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
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-text-primary">{plan.score_conta}</p>
          <p className="text-[9px] text-text-muted uppercase">Score</p>
        </div>
        <div className="h-12 w-px bg-[#1F2937]" />
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
            <p className="font-bold text-emerald-400">{plan.roas_estimado?.toFixed(1)}x</p>
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
              {actions.map((a: any) => (
                <div key={a.campaign_id} className="bg-[#111827] border border-[#1F2937] rounded-lg p-3 flex items-center gap-3 hover:border-[#374151] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-primary truncate">{a.campaign_name}</p>
                    <p className="text-[10px] text-text-muted">{a.motivo}</p>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium flex-shrink-0">{a.impacto_estimado}</span>
                  <span className="text-[10px] text-text-muted flex-shrink-0">
                    {currencySymbol} {a.valor_atual?.toFixed(0)} → {a.valor_novo?.toFixed(0)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyAction(a)}
                    className="h-7 px-3 text-[10px] font-semibold border-[#1F2937] text-text-muted hover:text-text-primary flex-shrink-0"
                  >
                    {a.tipo === 'pause' ? '⏸ Pausar' : a.tipo === 'increase_budget' ? '🚀 Escalar' : 'Aplicar'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
