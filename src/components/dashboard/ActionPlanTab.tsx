import { useState, useEffect, useMemo } from 'react';
import { useActionPlan, ActionItem, HistoryEntry } from '@/hooks/useActionPlan';
import { useDashboard } from '@/context/DashboardContext';
import { Loader2, Pause, Play, TrendingUp, TrendingDown, Check, X, Bot, ChevronRight, ChevronDown, ChevronUp, Settings2, Filter, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const ACTION_ICONS: Record<string, typeof Pause> = {
  pause: Pause,
  resume: Play,
  increase_budget: TrendingUp,
  decrease_budget: TrendingDown,
};

const ACTION_LABELS: Record<string, string> = {
  pause: 'Pausar',
  resume: 'Retomar',
  increase_budget: 'Aumentar Budget',
  decrease_budget: 'Diminuir Budget',
};

const ACTION_BORDER_COLORS: Record<string, string> = {
  pause: '#DC2626',
  resume: '#2563EB',
  increase_budget: '#16A34A',
  decrease_budget: '#D97706',
};

const PRIORITY_BADGES: Record<number, { emoji: string; bg: string; text: string }> = {
  1: { emoji: '🔴', bg: 'rgba(220,38,38,0.12)', text: '#DC2626' },
  2: { emoji: '🟡', bg: 'rgba(217,119,6,0.12)', text: '#D97706' },
  3: { emoji: '🟢', bg: 'rgba(22,163,74,0.12)', text: '#16A34A' },
};

function ScoreCircle({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? '#16A34A' : score >= 40 ? '#D97706' : '#DC2626';

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#E4E7EF" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-text-primary">{score}</span>
        <span className="text-[9px] text-text-muted">SCORE</span>
      </div>
    </div>
  );
}

export default function ActionPlanTab() {
  const {
    plan, isGenerating, isApplying, appliedCount,
    history, generatePlan, applyAction, applyAllActions, simulatePlan, fetchHistory,
  } = useActionPlan();
  const { analysisData, currencySymbol } = useDashboard();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [context, setContext] = useState({ margin: '', objective: '', niche: '', total_budget: '' });
  const [showContext, setShowContext] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [editedBudgets, setEditedBudgets] = useState<Record<string, number>>({});

  // Per-action loading/result state
  const [actionStates, setActionStates] = useState<Record<string, 'loading' | 'success' | 'error'>>({});
  // Pause confirmation dialog
  const [pauseConfirm, setPauseConfirm] = useState<ActionItem | null>(null);
  // Generic confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false, title: '', description: '', onConfirm: () => {},
  });

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (plan?.acoes) {
      setSelectedIds(new Set(plan.acoes.map(a => a.campaign_id)));
      setEditedBudgets({});
    }
  }, [plan]);

  const campaigns = analysisData?.campaigns || [];

  const selectedActions = useMemo(
    () => plan?.acoes.filter(a => selectedIds.has(a.campaign_id)) || [],
    [plan, selectedIds]
  );

  const simulation = useMemo(
    () => simulatePlan(selectedActions),
    [selectedActions, simulatePlan]
  );

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history;
    return history.filter(h => {
      if (historyFilter === 'pause') return h.action_type === 'pause';
      if (historyFilter === 'resume') return h.action_type === 'resume';
      if (historyFilter === 'budget') return h.action_type.includes('budget');
      return true;
    });
  }, [history, historyFilter]);

  const weekActions = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return history.filter(h => new Date(h.applied_at).getTime() > weekAgo).length;
  }, [history]);

  const urgentCount = useMemo(() => {
    if (!plan) return 0;
    return plan.acoes.filter(a => a.prioridade === 1 && actionStates[a.campaign_id] !== 'success').length;
  }, [plan, actionStates]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!plan) return;
    if (selectedIds.size === plan.acoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(plan.acoes.map(a => a.campaign_id)));
    }
  };

  const handleGenerate = () => {
    if (campaigns.length === 0) return;
    generatePlan(campaigns, {
      margin: context.margin ? parseFloat(context.margin) : undefined,
      objective: context.objective || undefined,
      niche: context.niche || undefined,
      total_budget: context.total_budget ? parseFloat(context.total_budget) : undefined,
    });
  };

  const handleApplySingle = async (action: ActionItem) => {
    if (action.tipo === 'pause') {
      setPauseConfirm(action);
      return;
    }
    await executeSingleAction(action);
  };

  const executeSingleAction = async (action: ActionItem) => {
    setActionStates(prev => ({ ...prev, [action.campaign_id]: 'loading' }));
    try {
      const overrideValue = (action.tipo === 'increase_budget' || action.tipo === 'decrease_budget')
        ? editedBudgets[action.campaign_id] ?? undefined
        : undefined;
      const success = await applyAction(action, overrideValue);
      if (success) {
        setActionStates(prev => ({ ...prev, [action.campaign_id]: 'success' }));
        toast.success('Ação aplicada com sucesso');
        await fetchHistory();
      } else {
        setActionStates(prev => ({ ...prev, [action.campaign_id]: 'error' }));
        toast.error('Erro ao aplicar ação');
      }
    } catch (err: any) {
      setActionStates(prev => ({ ...prev, [action.campaign_id]: 'error' }));
      toast.error(err?.message || 'Erro ao aplicar ação');
    }
    setTimeout(() => {
      setActionStates(prev => {
        const next = { ...prev };
        delete next[action.campaign_id];
        return next;
      });
    }, 2000);
  };

  const handleApply = () => {
    if (selectedActions.length === 0) return;
    setConfirmDialog({
      open: true,
      title: 'Confirmar execução',
      description: `Aplicar ${selectedActions.length} ação(ões) diretamente no Meta Ads? Esta operação é irreversível.`,
      onConfirm: () => {
        setConfirmDialog(d => ({ ...d, open: false }));
        applyAllActions(selectedActions);
      },
    });
  };

  const handleExecuteAllUrgent = () => {
    if (!plan) return;
    const urgent = plan.acoes.filter(a => a.prioridade === 1);
    setConfirmDialog({
      open: true,
      title: 'Executar acções urgentes',
      description: `Executar ${urgent.length} acção(ões) urgente(s) no Meta Ads? Esta operação é irreversível.`,
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, open: false }));
        await applyAllActions(urgent);
        await fetchHistory();
      },
    });
  };

  const fmt = (v: number) => `${currencySymbol} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ═══ EMPTY STATE ═══
  if (!plan && !isGenerating) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowContext(!showContext)}
              className="h-9 px-4 text-[12px] border-[#E4E7EF] text-text-muted hover:text-text-primary gap-2"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Contexto
            </Button>
          </div>

          {showContext && <ContextPanel context={context} setContext={setContext} />}

          <div className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-5">⚡</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">⚡ CORTEX Mode — Plano IA Executável</h2>
            <p className="text-[13px] text-text-muted mb-6 max-w-md">
              A IA analisa as tuas campanhas e gera um plano de acções que podes executar com 1 clique directamente no Meta Ads.
            </p>
            <div className="text-left space-y-2.5 mb-8 max-w-md">
              {[
                'Detecta campanhas a queimar budget sem retorno (ROAS crítico)',
                'Identifica oportunidades de escala com segurança (+20-30% budget)',
                'Aplica regras de segurança: não pausa campanhas em aprendizado',
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[13px] text-text-muted">
                  <span className="text-[#2563EB] mt-0.5">•</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || campaigns.length === 0}
              className="h-11 px-8 text-sm font-bold bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white hover:opacity-90 rounded-lg gap-2"
            >
              <Zap className="w-4 h-4" />
              ⚡ Gerar Plano CORTEX
            </Button>
            {campaigns.length === 0 && (
              <p className="text-[11px] text-text-muted mt-3">
                Analise uma conta primeiro (Visão Geral → Analisar)
              </p>
            )}
          </div>

          <HistorySection
            history={history}
            filteredHistory={filteredHistory}
            historyFilter={historyFilter}
            setHistoryFilter={setHistoryFilter}
            weekActions={weekActions}
            fmt={fmt}
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* ═══ HEADER ═══ */}
        <div className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl p-5">
          <div className="flex items-start gap-5">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {plan ? (
                <>
                  <ScoreCircle score={plan.score_conta} />
                  <span className="text-[10px] text-text-muted font-medium tracking-wide uppercase">Saúde da Conta</span>
                  {/* Score legend */}
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>0-39 Crítico</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(217,119,6,0.12)', color: '#D97706' }}>40-69 Médio</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(22,163,74,0.12)', color: '#16A34A' }}>70+ Bom</span>
                  </div>
                </>
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#E4E7EF] animate-pulse flex-shrink-0" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2.5 pt-1">
              {plan ? (
                <>
                  {/* CORTEX subtitle */}
                  <p className="text-[11px] text-text-muted">⚡ CORTEX Mode · Claude Sonnet 4 · Plano executável</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted text-[12px]">ROAS</span>
                      <span className="font-bold text-text-primary">{plan.roas_atual.toFixed(1)}x</span>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                      <span className="font-bold text-[#16A34A]">{plan.roas_estimado.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted text-[12px]">Receita</span>
                      <span className="font-semibold text-text-primary">{fmt(plan.receita_atual)}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                      <span className="font-semibold text-[#16A34A]">{fmt(plan.receita_estimada)}</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-text-muted leading-relaxed line-clamp-3">{plan.resumo}</p>
                </>
              ) : (
                <div className="space-y-2.5 py-2 animate-pulse">
                  <div className="h-3 bg-[#E4E7EF] rounded w-48" />
                  <div className="h-4 bg-[#E4E7EF] rounded w-64" />
                  <div className="h-4 bg-[#E4E7EF] rounded w-56" />
                  <div className="h-3 bg-[#E4E7EF] rounded w-full" />
                  <div className="h-3 bg-[#E4E7EF] rounded w-4/5" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || campaigns.length === 0}
                className="h-10 px-5 text-[13px] font-bold bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white hover:opacity-90 rounded-lg gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                ) : (
                  <><Zap className="w-4 h-4" />Gerar Plano CORTEX</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowContext(!showContext)}
                className="h-10 px-4 text-[13px] border-[#E4E7EF] text-text-muted hover:text-text-primary gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Contexto
              </Button>
              <Button
                onClick={handleApply}
                disabled={!plan || selectedActions.length === 0 || isApplying}
                variant="outline"
                className="h-10 px-5 text-[13px] font-bold border-[#16A34A]/30 text-[#16A34A] hover:bg-[#16A34A]/10 rounded-lg gap-2"
              >
                {isApplying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{appliedCount}/{selectedActions.length}</>
                ) : (
                  <><Check className="w-4 h-4" />Aplicar Selecionadas</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {showContext && <ContextPanel context={context} setContext={setContext} />}

        {/* ═══ SIMULATION BANNER ═══ */}
        {plan && selectedActions.length > 0 && simulation.ganho !== 0 && (
          <div className="bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-xl p-4 flex items-center gap-4">
            <span className="text-2xl">📊</span>
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <span className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-full px-3 py-1 text-[12px] text-text-primary font-medium">
                {selectedActions.length} ações selecionadas
              </span>
              <span className="bg-[#16A34A]/10 border border-[#16A34A]/30 rounded-full px-3 py-1 text-[12px] text-[#16A34A] font-medium">
                +{fmt(Math.abs(simulation.ganho))}
              </span>
              <span className="bg-[#16A34A]/10 border border-[#16A34A]/30 rounded-full px-3 py-1 text-[12px] text-[#16A34A] font-medium">
                +{Math.abs(simulation.ganho_pct).toFixed(0)}% receita
              </span>
            </div>
          </div>
        )}

        {/* ═══ CRITICAL ALERTS ═══ */}
        {plan && plan.alertas_criticos && plan.alertas_criticos.length > 0 && (
          <div className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl p-4 space-y-2">
            {(showAllAlerts ? plan.alertas_criticos : plan.alertas_criticos.slice(0, 2)).map((alerta, i) => (
              <div key={i} className="bg-[#D97706]/10 border border-[#D97706]/30 rounded-lg px-4 py-2 text-[12px] text-[#D97706] flex items-center gap-2">
                <span className="text-base flex-shrink-0">⚠</span>
                <span>{alerta}</span>
              </div>
            ))}
            {plan.alertas_criticos.length > 2 && (
              <button
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-[11px] text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
              >
                {showAllAlerts ? (
                  <><ChevronUp className="w-3 h-3" />Mostrar menos</>
                ) : (
                  <><ChevronDown className="w-3 h-3" />Ver mais {plan.alertas_criticos.length - 2} alertas</>
                )}
              </button>
            )}
          </div>
        )}

        {/* ═══ ACTIONS LIST ═══ */}
        {plan && plan.acoes.length > 0 && (
          <div className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#E4E7EF]">
              <Checkbox
                checked={selectedIds.size === plan.acoes.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">
                Selecionar todas ({plan.acoes.length})
              </span>
              {urgentCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>
                  🔴 {urgentCount} urgente(s)
                </span>
              )}
            </div>

            <div className="divide-y divide-[#E4E7EF]">
              {plan.acoes.map((action, actionIdx) => {
                const Icon = ACTION_ICONS[action.tipo] || TrendingUp;
                const borderColor = ACTION_BORDER_COLORS[action.tipo] || 'border-l-muted';
                const priority = PRIORITY_BADGES[action.prioridade] || PRIORITY_BADGES[3];
                const isSelected = selectedIds.has(action.campaign_id);
                const isPauseResume = action.tipo === 'pause' || action.tipo === 'resume';
                const isBudgetAction = action.tipo === 'increase_budget' || action.tipo === 'decrease_budget';
                const actionState = actionStates[action.campaign_id];
                const confidence = action.prioridade === 1 ? 0.92 : action.prioridade === 2 ? 0.75 : 0.60;

                return (
                  <div
                    key={action.campaign_id}
                    className={`px-5 py-3 border-l-4 transition-colors animate-slide-in-left opacity-0 [animation-fill-mode:forwards] ${
                      isSelected ? 'bg-[#2563EB]/5' : ''
                    } ${actionState === 'success' ? 'opacity-50' : ''}`}
                    style={{ animationDelay: `${actionIdx * 60}ms`, borderLeftColor: ACTION_BORDER_COLORS[action.tipo] || '#5A6478' }}
                  >
                    {/* LINE 1 */}
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(action.campaign_id)}
                      />

                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: ACTION_BORDER_COLORS[action.tipo] ? `${ACTION_BORDER_COLORS[action.tipo]}1F` : 'rgba(37,99,235,0.12)',
                          color: ACTION_BORDER_COLORS[action.tipo] || '#2563EB',
                        }}
                      >
                        <Icon className="w-3 h-3" />
                        {ACTION_LABELS[action.tipo]}
                      </span>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[13px] font-medium text-text-primary truncate max-w-[200px]">
                            {action.campaign_name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{action.campaign_name}</TooltipContent>
                      </Tooltip>

                      <div className="flex-1" />

                      {/* Budget or status change */}
                      <div className="flex items-center gap-1 text-[12px] text-text-muted flex-shrink-0">
                        {isPauseResume ? (
                          <>
                            <span>{action.tipo === 'pause' ? 'ATIVO' : 'PAUSADO'}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="font-semibold text-text-primary">
                              {action.tipo === 'pause' ? 'PAUSADO' : 'ATIVO'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>{fmt(action.valor_atual)}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="font-semibold text-text-primary">{fmt(editedBudgets[action.campaign_id] ?? action.valor_novo)}</span>
                          </>
                        )}
                      </div>

                      <span className="text-[11px] text-[#16A34A] font-medium flex-shrink-0 min-w-[80px] text-right">
                        {action.impacto_estimado}
                      </span>

                      <span
                        className="text-[10px] px-2 py-0.5 rounded flex-shrink-0"
                        style={{ background: priority.bg, color: priority.text }}
                      >
                        {priority.emoji} P{action.prioridade}
                      </span>

                      {/* Individual apply button */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!actionState}
                        onClick={() => handleApplySingle(action)}
                        className={`h-7 px-3 text-[10px] font-semibold ml-2 flex-shrink-0 ${
                          actionState === 'success' 
                            ? 'border-[#16A34A]/30 text-[#16A34A] bg-[#16A34A]/10' 
                            : actionState === 'error'
                            ? 'border-destructive/30 text-destructive bg-destructive/10'
                            : 'border-[#E4E7EF] text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {actionState === 'loading' ? (
                          <><Loader2 className="w-3 h-3 animate-spin mr-1" />Aplicando...</>
                        ) : actionState === 'success' ? (
                          '✅ Aplicado'
                        ) : actionState === 'error' ? (
                          '❌ Erro'
                        ) : (
                          'Aplicar'
                        )}
                      </Button>
                    </div>

                    {/* LINE 2 - Motivo */}
                    <div className="ml-[30px] mt-1">
                      <span className="text-[12px] text-text-muted">{action.motivo}</span>
                      {/* Editable budget input */}
                      {isBudgetAction && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-text-muted">Valor novo:</span>
                          <span className="text-[11px] text-text-muted line-through">{fmt(action.valor_novo)}</span>
                          <span className="text-[10px] text-text-muted">→</span>
                          <input
                            type="number"
                            defaultValue={action.valor_novo}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setEditedBudgets(prev => ({ ...prev, [action.campaign_id]: val }));
                              }
                            }}
                            className="w-20 h-6 bg-[#F8F9FC] border border-[#E4E7EF] rounded px-2 text-[11px] text-white focus:border-[#2563EB] outline-none"
                          />
                          <span className="text-[11px] text-text-muted">/dia</span>
                        </div>
                      )}
                    </div>

                    {/* LINE 3: Pills + Confidence */}
                    <div className="ml-[30px] mt-1.5 flex items-center gap-2 flex-wrap">
                      {action.dias_ativo != null && (
                        <span className="bg-[#F8F9FC] border border-[#E4E7EF] rounded-full px-2 py-0.5 text-[10px] text-text-muted">
                          📅 {action.dias_ativo}d ativo
                        </span>
                      )}
                      {action.frequency != null && (
                        <span className={`bg-[#F8F9FC] border border-[#E4E7EF] rounded-full px-2 py-0.5 text-[10px] ${
                          action.frequency > 3.5 ? 'text-[#D97706] border-[#D97706]/30' : 'text-text-muted'
                        }`}>
                          👁 freq. {action.frequency.toFixed(1)}
                        </span>
                      )}
                      {action.tipo_budget && (
                        <span className="bg-[#F8F9FC] border border-[#E4E7EF] rounded-full px-2 py-0.5 text-[10px] text-text-muted">
                          💰 {action.tipo_budget}
                        </span>
                      )}
                      {action.regra_aplicada && (
                        <span className="bg-[#F8F9FC] border border-[#E4E7EF] rounded-full px-2 py-0.5 text-[10px] text-[#2563EB]">
                          📏 {action.regra_aplicada}
                        </span>
                      )}
                      {/* Confidence bar */}
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[10px] text-[#5A6478]">Confiança:</span>
                        <div className="w-16 h-1 bg-[#FFFFFF] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-700"
                            style={{ width: `${confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#9BA5B7]">{Math.round(confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ EXECUTE ALL URGENT ═══ */}
        {plan && plan.acoes.filter(a => a.prioridade === 1).length > 0 && (
          <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.20)' }}>
            <div>
              <span className="text-[13px] font-semibold" style={{ color: '#DC2626' }}>
                🔴 {plan.acoes.filter(a => a.prioridade === 1).length} acção(ões) urgente(s) pendente(s)
              </span>
              <p className="text-[11px] text-text-muted mt-0.5">
                Executar todas as acções de prioridade máxima de uma vez
              </p>
            </div>
            <Button
              onClick={handleExecuteAllUrgent}
              disabled={isApplying}
              className="h-9 px-5 text-[12px] font-bold text-white rounded-lg gap-2 flex-shrink-0"
              style={{ background: '#DC2626' }}
            >
              {isApplying ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />A executar...</>
              ) : (
                '⚡ Executar Urgentes'
              )}
            </Button>
          </div>
        )}

        {/* ═══ HISTORY ═══ */}
        <HistorySection
          history={history}
          filteredHistory={filteredHistory}
          historyFilter={historyFilter}
          setHistoryFilter={setHistoryFilter}
          weekActions={weekActions}
          fmt={fmt}
        />

        {/* ═══ PAUSE CONFIRMATION DIALOG ═══ */}
        <Dialog open={!!pauseConfirm} onOpenChange={(open) => !open && setPauseConfirm(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">⏸️ Pausar campanha?</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Tem certeza que quer pausar '{pauseConfirm?.campaign_name}'? Isso vai interromper todos os anúncios.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setPauseConfirm(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (pauseConfirm) {
                    executeSingleAction(pauseConfirm);
                    setPauseConfirm(null);
                  }
                }}
              >
                Sim, pausar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ GENERIC CONFIRM DIALOG ═══ */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(d => ({ ...d, open: false }))}>
          <DialogContent className="sm:max-w-md" style={{ background: '#FFFFFF', border: '1px solid #C9D0E0' }}>
            <DialogHeader>
              <DialogTitle className="text-base text-[#0F1523]">{confirmDialog.title}</DialogTitle>
              <DialogDescription className="text-sm" style={{ color: '#9BA5B7' }}>
                {confirmDialog.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDialog(d => ({ ...d, open: false }))}>
                Cancelar
              </Button>
              <Button size="sm" variant="destructive" onClick={confirmDialog.onConfirm}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

/* ═══ CONTEXT PANEL COMPONENT ═══ */
function ContextPanel({
  context,
  setContext,
}: {
  context: { margin: string; objective: string; niche: string; total_budget: string };
  setContext: React.Dispatch<React.SetStateAction<{ margin: string; objective: string; niche: string; total_budget: string }>>;
}) {
  return (
    <div className="bg-[#F8F9FC] border border-[#E4E7EF] rounded-xl p-4 animate-fade-up">
      <div className="mb-3">
        <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">🎯 Contexto da Conta</h3>
        <div className="h-px bg-[#E4E7EF] mt-2 mb-2" />
        <p className="text-[11px] text-text-muted">Opcional — melhora a qualidade da análise</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">Nicho / Produto</Label>
          <Input
            value={context.niche}
            onChange={e => setContext(p => ({ ...p, niche: e.target.value }))}
            placeholder="ex: mármore, joias, moda..."
            className="h-9 text-[12px] bg-[#FFFFFF] border-[#E4E7EF] rounded-lg focus:border-[#2563EB]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">Margem média (%)</Label>
          <Input
            type="number"
            value={context.margin}
            onChange={e => setContext(p => ({ ...p, margin: e.target.value }))}
            placeholder="ex: 35 — opcional"
            className="h-9 text-[12px] bg-[#FFFFFF] border-[#E4E7EF] rounded-lg focus:border-[#2563EB]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">Objetivo</Label>
          <Select value={context.objective} onValueChange={v => setContext(p => ({ ...p, objective: v }))}>
            <SelectTrigger className="h-9 text-[12px] bg-[#FFFFFF] border-[#E4E7EF] rounded-lg">
              <SelectValue placeholder="Não sei / Deixar a IA decidir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Não sei / Deixar a IA decidir</SelectItem>
              <SelectItem value="scale">🚀 Escalar — quero mais volume</SelectItem>
              <SelectItem value="maintain">⚖ Manter — performance estável</SelectItem>
              <SelectItem value="reduce_costs">💰 Reduzir custos — melhorar ROAS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">Budget disponível/dia</Label>
          <Input
            type="number"
            value={context.total_budget}
            onChange={e => setContext(p => ({ ...p, total_budget: e.target.value }))}
            placeholder="ex: 100 — opcional"
            className="h-9 text-[12px] bg-[#FFFFFF] border-[#E4E7EF] rounded-lg focus:border-[#2563EB]"
          />
        </div>
      </div>
      <p className="text-[10px] text-text-muted mt-3">💡 Campos vazios = IA decide com base nos dados</p>
    </div>
  );
}

/* ═══ HISTORY SECTION COMPONENT ═══ */
function HistorySection({
  history,
  filteredHistory,
  historyFilter,
  setHistoryFilter,
  weekActions,
  fmt,
}: {
  history: HistoryEntry[];
  filteredHistory: HistoryEntry[];
  historyFilter: string;
  setHistoryFilter: (v: string) => void;
  weekActions: number;
  fmt: (v: number) => string;
}) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E4E7EF] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">Histórico de Ações</h3>
          {weekActions > 0 && (
            <span className="bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-medium px-2 py-0.5 rounded-full">
              {weekActions} esta semana
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          {['all', 'pause', 'resume', 'budget'].map(f => (
            <button
              key={f}
              onClick={() => setHistoryFilter(f)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                historyFilter === f
                  ? 'bg-[#2563EB]/20 text-[#2563EB]'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'pause' ? 'Pausar' : f === 'resume' ? 'Retomar' : 'Budget'}
            </button>
          ))}
        </div>
      </div>

      {filteredHistory.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="border-[#E4E7EF] hover:bg-transparent">
              <TableHead className="text-[11px] text-text-muted uppercase tracking-wider">Data</TableHead>
              <TableHead className="text-[11px] text-text-muted uppercase tracking-wider">Campanha</TableHead>
              <TableHead className="text-[11px] text-text-muted uppercase tracking-wider">Ação</TableHead>
              <TableHead className="text-[11px] text-text-muted uppercase tracking-wider">De → Para</TableHead>
              <TableHead className="text-[11px] text-text-muted uppercase tracking-wider text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.map((h) => (
              <TableRow key={h.id} className="border-[#E4E7EF]">
                <TableCell className="text-[12px] text-text-muted">
                  {new Date(h.applied_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell className="text-[12px] text-text-primary truncate max-w-[180px]">
                  {h.campaign_name || h.campaign_id}
                </TableCell>
                <TableCell className="text-[12px]">
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-medium"
                    style={{
                      background: ACTION_BORDER_COLORS[h.action_type]
                        ? `${ACTION_BORDER_COLORS[h.action_type]}1F`
                        : h.action_type.includes('increase')
                          ? 'rgba(22,163,74,0.12)'
                          : 'rgba(217,119,6,0.12)',
                      color: ACTION_BORDER_COLORS[h.action_type]
                        || (h.action_type.includes('increase') ? '#16A34A' : '#D97706'),
                    }}
                  >
                    {ACTION_LABELS[h.action_type] || h.action_type}
                  </span>
                </TableCell>
                <TableCell className="text-[12px] text-text-muted">
                  {h.old_value} → {h.new_value}
                </TableCell>
                <TableCell className="text-center">
                  {h.success ? (
                    <Check className="w-4 h-4 text-[#16A34A] mx-auto" />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger>
                        <X className="w-4 h-4 text-[#DC2626] mx-auto" />
                      </TooltipTrigger>
                      <TooltipContent>{h.error_message}</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="px-5 py-8 text-center text-[13px] text-text-muted">
          {history.length === 0 ? 'Nenhuma ação aplicada ainda.' : 'Nenhuma ação encontrada com esse filtro.'}
        </div>
      )}
    </div>
  );
}
