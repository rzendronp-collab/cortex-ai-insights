import { useState, useEffect, useMemo } from 'react';
import { useActionPlan, ActionItem } from '@/hooks/useActionPlan';
import { useDashboard } from '@/context/DashboardContext';
import { Loader2, Pause, Play, TrendingUp, TrendingDown, Check, X, Bot, ChevronRight, BarChart3, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  pause: 'border-l-red-500',
  resume: 'border-l-blue-500',
  increase_budget: 'border-l-emerald-500',
  decrease_budget: 'border-l-amber-500',
};

const PRIORITY_BADGES: Record<number, { emoji: string; color: string }> = {
  1: { emoji: '🔴', color: 'bg-red-500/10 text-red-400' },
  2: { emoji: '🟡', color: 'bg-amber-500/10 text-amber-400' },
  3: { emoji: '🟢', color: 'bg-emerald-500/10 text-emerald-400' },
};

function ScoreCircle({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1E2D4A" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{score}</span>
        <span className="text-[9px] text-muted-foreground">SCORE</span>
      </div>
    </div>
  );
}

export default function ActionPlanTab() {
  const {
    plan, isGenerating, isApplying, appliedCount,
    history, generatePlan, applyAllActions, simulatePlan, fetchHistory,
  } = useActionPlan();
  const { analysisData, currencySymbol } = useDashboard();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [context, setContext] = useState({ margin: '', objective: '', niche: '', total_budget: '' });
  const [showContext, setShowContext] = useState(false);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (plan?.acoes) {
      setSelectedIds(new Set(plan.acoes.map(a => a.campaign_id)));
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

  const handleApply = () => {
    if (selectedActions.length === 0) return;
    applyAllActions(selectedActions);
  };

  const fmt = (v: number) => `${currencySymbol} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-6">
            {plan && <ScoreCircle score={plan.score_conta} />}

            <div className="flex-1 space-y-3">
              {plan ? (
                <>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">ROAS Atual</span>
                      <span className="ml-2 font-bold text-foreground">{plan.roas_atual.toFixed(1)}x</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Estimado</span>
                      <span className="ml-2 font-bold text-emerald-400">{plan.roas_estimado.toFixed(1)}x</span>
                    </div>
                    <span className="text-[#1E2D4A]">|</span>
                    <div>
                      <span className="text-muted-foreground">Receita</span>
                      <span className="ml-2 font-semibold text-foreground">{fmt(plan.receita_atual)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="font-semibold text-emerald-400">{fmt(plan.receita_estimada)}</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{plan.resumo}</p>
                </>
              ) : (
                <div className="flex items-center gap-3 py-4">
                  <BarChart3 className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {campaigns.length > 0
                      ? 'Clique em "Gerar Plano IA" para analisar suas campanhas e receber sugestões de otimização.'
                      : 'Analise uma conta primeiro para gerar um plano de ação.'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || campaigns.length === 0}
                className="h-10 px-5 text-[13px] font-bold bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:opacity-90 gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                ) : (
                  <><Bot className="w-4 h-4" />Gerar Plano IA</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowContext(!showContext)}
                className="h-10 px-4 text-[13px] border-[#1E2D4A] text-muted-foreground hover:text-foreground gap-2"
              >
                <Settings2 className="w-4 h-4" />
                ⚙ Contexto
              </Button>
              <Button
                onClick={handleApply}
                disabled={!plan || selectedActions.length === 0 || isApplying}
                variant="outline"
                className="h-10 px-5 text-[13px] font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-2"
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

        {/* CONTEXT PANEL */}
        {showContext && (
          <div className="bg-[#0E1420] border border-[#1E2D4A] rounded-xl p-4 animate-fade-up">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">🎯 Contexto da Conta</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Opcional — melhora a qualidade da análise</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-[1px]">Nicho / Produto</Label>
                <Input
                  value={context.niche}
                  onChange={e => setContext(p => ({ ...p, niche: e.target.value }))}
                  placeholder="ex: mármore, joias, moda..."
                  className="h-9 text-[12px] bg-muted border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-[1px]">Margem média (%)</Label>
                <Input
                  type="number"
                  value={context.margin}
                  onChange={e => setContext(p => ({ ...p, margin: e.target.value }))}
                  placeholder="ex: 35"
                  className="h-9 text-[12px] bg-muted border-border rounded-lg"
                />
                <p className="text-[9px] text-muted-foreground">(opcional — não sei)</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-[1px]">Objetivo</Label>
                <Select value={context.objective} onValueChange={v => setContext(p => ({ ...p, objective: v }))}>
                  <SelectTrigger className="h-9 text-[12px] bg-muted border-border rounded-lg">
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
                <Label className="text-[10px] text-muted-foreground uppercase tracking-[1px]">Budget disponível</Label>
                <Input
                  type="number"
                  value={context.total_budget}
                  onChange={e => setContext(p => ({ ...p, total_budget: e.target.value }))}
                  placeholder="ex: 500 (opcional)"
                  className="h-9 text-[12px] bg-muted border-border rounded-lg"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">💡 Campos em branco serão analisados pela IA com base nos dados disponíveis</p>
          </div>
        )}

        {/* SIMULATION BANNER */}
        {plan && selectedActions.length > 0 && simulation.ganho !== 0 && (
          <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg p-3 flex items-center gap-2">
            <span className="text-[13px] text-foreground">
              📊 <strong>Simulação:</strong> aplicar {selectedActions.length} ação(ões) pode gerar{' '}
              <span className="text-emerald-400 font-bold">
                +{fmt(Math.abs(simulation.ganho))} (+{Math.abs(simulation.ganho_pct).toFixed(0)}%)
              </span>{' '}
              em receita estimada
            </span>
          </div>
        )}

        {/* CRITICAL ALERTS */}
        {plan && plan.alertas_criticos && plan.alertas_criticos.length > 0 && (
          <div className="space-y-2">
            {plan.alertas_criticos.map((alerta, i) => (
              <div key={i} className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg px-4 py-2 text-[12px] text-[#F59E0B]">
                ⚠ {alerta}
              </div>
            ))}
          </div>
        )}

        {/* ACTIONS LIST */}
        {plan && plan.acoes.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
              <Checkbox
                checked={selectedIds.size === plan.acoes.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-[12px] text-muted-foreground font-medium">
                Selecionar todas ({plan.acoes.length})
              </span>
            </div>

            <div className="divide-y divide-border">
              {plan.acoes.map((action) => {
                const Icon = ACTION_ICONS[action.tipo] || TrendingUp;
                const borderColor = ACTION_BORDER_COLORS[action.tipo] || 'border-l-muted';
                const priority = PRIORITY_BADGES[action.prioridade] || PRIORITY_BADGES[3];
                const isSelected = selectedIds.has(action.campaign_id);

                return (
                  <div
                    key={action.campaign_id}
                    className={`flex items-start gap-4 px-5 py-3 border-l-4 ${borderColor} transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(action.campaign_id)}
                      className="mt-1"
                    />

                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded mt-0.5 ${
                      action.tipo === 'pause' ? 'bg-red-500/10 text-red-400' :
                      action.tipo === 'resume' ? 'bg-blue-500/10 text-blue-400' :
                      action.tipo === 'increase_budget' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      <Icon className="w-3 h-3" />
                      {ACTION_LABELS[action.tipo]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[13px] font-medium text-foreground truncate block max-w-[220px]">
                            {action.campaign_name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{action.campaign_name}</TooltipContent>
                      </Tooltip>

                      <span className="text-[12px] text-muted-foreground block truncate">
                        {action.motivo}
                      </span>

                      <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                        {action.dias_ativo != null && <span>📅 {action.dias_ativo}d ativo</span>}
                        {action.frequency != null && (
                          <span className={action.frequency > 3.5 ? 'text-[#F59E0B]' : ''}>
                            👁 freq. {action.frequency.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[12px] text-muted-foreground flex-shrink-0">
                      <span>{fmt(action.valor_atual)}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="font-semibold text-foreground">{fmt(action.valor_novo)}</span>
                    </div>

                    <span className="text-[12px] text-emerald-400 font-medium flex-shrink-0 min-w-[90px] text-right">
                      {action.impacto_estimado}
                    </span>

                    <span className={`text-[11px] px-2 py-0.5 rounded ${priority.color} flex-shrink-0`}>
                      {priority.emoji} P{action.prioridade}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORY */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Histórico de Ações</h3>
          </div>

          {history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[11px] text-muted-foreground">Data</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground">Campanha</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground">Ação</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground">De → Para</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id} className="border-border">
                    <TableCell className="text-[12px] text-muted-foreground">
                      {new Date(h.applied_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-[12px] text-foreground truncate max-w-[180px]">
                      {h.campaign_name || h.campaign_id}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        h.action_type === 'pause' ? 'bg-red-500/10 text-red-400' :
                        h.action_type === 'resume' ? 'bg-blue-500/10 text-blue-400' :
                        h.action_type.includes('increase') ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {ACTION_LABELS[h.action_type] || h.action_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {h.old_value} → {h.new_value}
                    </TableCell>
                    <TableCell className="text-center">
                      {h.success ? (
                        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <X className="w-4 h-4 text-red-400 mx-auto" />
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
            <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">
              Nenhuma ação aplicada ainda.
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
