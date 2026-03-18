import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RuleCondition {
  metric: string;
  operator: '<' | '>' | '=' | '>=' | '<=';
  value: number;
}

interface Rule {
  id: string;
  name: string;
  logic: 'AND' | 'OR';
  conditions: RuleCondition[];
  action: 'alert' | 'pause_suggest' | 'scale_suggest';
  active: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'cortex_rules_v2';
const METRICS = ['ROAS', 'CTR', 'CPV', 'Gasto', 'CPM', 'CPA', 'Frequencia'] as const;
const OPERATORS: { value: RuleCondition['operator']; label: string }[] = [
  { value: '<', label: 'Menor que' },
  { value: '>', label: 'Maior que' },
  { value: '=', label: 'Igual a' },
  { value: '>=', label: 'Maior ou igual' },
  { value: '<=', label: 'Menor ou igual' },
];

const ACTIONS: Rule['action'][] = ['alert', 'pause_suggest', 'scale_suggest'];

const ACTION_LABEL: Record<Rule['action'], string> = {
  alert: 'Alertar',
  pause_suggest: 'Sugerir Pausa',
  scale_suggest: 'Sugerir Escala',
};

const SUGGESTED_RULES: Omit<Rule, 'id' | 'active' | 'createdAt'>[] = [
  { name: 'ROAS < 2.0x → Alertar', logic: 'AND', conditions: [{ metric: 'ROAS', operator: '<', value: 2.0 }], action: 'alert' },
  { name: 'CTR < 1% → Pausar', logic: 'AND', conditions: [{ metric: 'CTR', operator: '<', value: 1 }], action: 'pause_suggest' },
  { name: 'CPV > 50 → Alertar', logic: 'AND', conditions: [{ metric: 'CPV', operator: '>', value: 50 }], action: 'alert' },
  { name: 'Gasto > 100 → Alertar', logic: 'AND', conditions: [{ metric: 'Gasto', operator: '>', value: 100 }], action: 'alert' },
  { name: 'CPM > 35 → Alertar', logic: 'AND', conditions: [{ metric: 'CPM', operator: '>', value: 35 }], action: 'alert' },
  { name: 'ROAS ≥ 4.0x → Escalar', logic: 'AND', conditions: [{ metric: 'ROAS', operator: '>=', value: 4.0 }], action: 'scale_suggest' },
];

function operatorSymbol(op: string) {
  if (op === '>=') return '≥';
  if (op === '<=') return '≤';
  return op;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadRules(): Rule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRules(rules: Rule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

function checkRules(rules: Rule[], campaignMetrics: Record<string, number>): { rule: Rule; triggered: boolean }[] {
  return rules.map((rule) => {
    if (!rule.active) return { rule, triggered: false };

    const conditionsMet = rule.conditions.map((condition) => {
      const value = campaignMetrics[condition.metric] ?? 0;
      switch (condition.operator) {
        case '<':
          return value < condition.value;
        case '>':
          return value > condition.value;
        case '=':
          return value === condition.value;
        case '>=':
          return value >= condition.value;
        case '<=':
          return value <= condition.value;
      }
    });

    return { rule, triggered: rule.logic === 'AND' ? conditionsMet.every(Boolean) : conditionsMet.some(Boolean) };
  });
}

function actionColor(action: Rule['action']) {
  if (action === 'alert') return 'border-warning/20 bg-warning/10 text-warning';
  if (action === 'pause_suggest') return 'border-destructive/20 bg-destructive/10 text-destructive';
  return 'border-success/20 bg-success/10 text-success';
}

export { checkRules };
export type { Rule, RuleCondition };

export default function RulesTab() {
  const [rules, setRules] = useState<Rule[]>(loadRules);
  const [conditions, setConditions] = useState<RuleCondition[]>([{ metric: 'ROAS', operator: '<', value: 0 }]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [action, setAction] = useState<Rule['action']>('alert');
  const [ruleName, setRuleName] = useState('');

  useEffect(() => {
    saveRules(rules);
  }, [rules]);

  const updateCondition = (idx: number, patch: Partial<RuleCondition>) => {
    setConditions((prev) => prev.map((condition, i) => (i === idx ? { ...condition, ...patch } : condition)));
  };

  const removeCondition = (idx: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, { metric: 'ROAS', operator: '<', value: 0 }]);
  };

  const createRule = () => {
    const name = ruleName.trim() || conditions.map((c) => `${c.metric} ${operatorSymbol(c.operator)} ${c.value}`).join(` ${logic} `);

    const rule: Rule = {
      id: uid(),
      name,
      logic,
      conditions: [...conditions],
      action,
      active: true,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => [...prev, rule]);
    toast.success(`Regra "${rule.name}" criada!`);
    setConditions([{ metric: 'ROAS', operator: '<', value: 0 }]);
    setRuleName('');
    setLogic('AND');
    setAction('alert');
  };

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, active: !rule.active } : rule)));
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
    toast('Regra removida');
  };

  const adoptSuggested = (suggested: (typeof SUGGESTED_RULES)[number]) => {
    const rule: Rule = {
      id: uid(),
      name: suggested.name,
      logic: suggested.logic,
      conditions: [...suggested.conditions],
      action: suggested.action,
      active: true,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => [...prev, rule]);
    toast.success(`Regra "${rule.name}" adicionada!`);
  };

  const canCreate = conditions.length > 0 && conditions.every((c) => c.metric && Number.isFinite(c.value));
  const activeCount = rules.filter((rule) => rule.active).length;

  const logicPreview = useMemo(
    () => conditions.map((c) => `${c.metric} ${operatorSymbol(c.operator)} ${c.value}`).join(` ${logic} `),
    [conditions, logic],
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.75rem] border border-border-default bg-card shadow-[0_20px_50px_-36px_hsl(var(--foreground)/0.25)]">
          <div className="panel-highlight border-b border-border-subtle px-5 py-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">Rule Builder</p>
                <h3 className="mt-2 flex items-center gap-2 font-display text-xl font-bold tracking-[-0.04em] text-text-primary">
                  <Plus className="size-5 text-primary" />
                  Sistema multi-condição
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                  Configure condições com lógica <strong className="text-text-primary">AND</strong> / <strong className="text-text-primary">OR</strong> e acções de alerta, pausa sugerida ou escala sugerida.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                <div className="rounded-2xl border border-border-subtle bg-background/80 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">Regras</p>
                  <p className="mt-1 text-lg font-semibold text-text-primary">{rules.length}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-background/80 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">Ativas</p>
                  <p className="mt-1 text-lg font-semibold text-text-primary">{activeCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 md:px-6">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Nome da regra</label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Ex: Alertar quando ROAS cair abaixo da meta"
                className="h-11 rounded-2xl border-border-default bg-background text-text-primary placeholder:text-text-muted"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-secondary/50 px-3 py-3">
              <div>
                <p className="text-xs font-semibold text-text-primary">Lógica entre condições</p>
                <p className="text-[11px] text-text-secondary">AND para restringir, OR para ampliar gatilhos.</p>
              </div>
              <div className="inline-flex rounded-2xl border border-border-default bg-background p-1">
                {(['AND', 'OR'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setLogic(option)}
                    className={cn(
                      'rounded-xl px-4 py-2 text-xs font-semibold transition-colors',
                      logic === option ? 'bg-primary text-primary-foreground' : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {conditions.map((condition, idx) => (
                <div key={idx} className="rounded-[1.4rem] border border-border-default bg-background p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Condição {idx + 1}</p>
                    {conditions.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(idx)}
                        className="size-9 rounded-2xl text-text-muted hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_0.8fr]">
                    <Select value={condition.metric} onValueChange={(value) => updateCondition(idx, { metric: value })}>
                      <SelectTrigger className="h-11 rounded-2xl border-border-default bg-card text-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border-default bg-card text-text-primary">
                        {METRICS.map((metric) => (
                          <SelectItem key={metric} value={metric}>{metric}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(idx, { operator: value as RuleCondition['operator'] })}
                    >
                      <SelectTrigger className="h-11 rounded-2xl border-border-default bg-card text-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border-default bg-card text-text-primary">
                        {OPERATORS.map((operator) => (
                          <SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      value={condition.value || ''}
                      onChange={(e) => updateCondition(idx, { value: parseFloat(e.target.value) || 0 })}
                      placeholder="Valor"
                      className="h-11 rounded-2xl border-border-default bg-card text-text-primary placeholder:text-text-muted"
                    />
                  </div>

                  {idx < conditions.length - 1 ? (
                    <div className="mt-3 flex items-center justify-center">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-primary">
                        {logic}
                      </span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={addCondition}
                className="h-10 rounded-2xl border-border-default bg-background text-text-secondary hover:bg-accent hover:text-text-primary"
              >
                <Plus className="mr-1 size-4" />
                Adicionar condição
              </Button>

              <div className="rounded-2xl border border-border-subtle bg-secondary/40 px-3 py-2 text-[11px] text-text-secondary">
                <span className="font-semibold text-text-primary">Preview:</span> {logicPreview}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Ação</label>
                <Select value={action} onValueChange={(value) => setAction(value as Rule['action'])}>
                  <SelectTrigger className="h-11 rounded-2xl border-border-default bg-background text-text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border-default bg-card text-text-primary">
                    {ACTIONS.map((item) => (
                      <SelectItem key={item} value={item}>{ACTION_LABEL[item]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={createRule} disabled={!canCreate} className="h-11 rounded-2xl px-6 text-sm font-semibold shadow-[0_18px_36px_-22px_hsl(var(--primary)/0.9)]">
                <Plus className="mr-1 size-4" />
                Criar regra
              </Button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-border-default bg-card shadow-[0_20px_50px_-36px_hsl(var(--foreground)/0.22)]">
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 md:px-6">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Sparkles className="size-4 text-primary" />
                Regras sugeridas
              </h3>
              <p className="mt-1 text-xs text-text-secondary">6 atalhos clicáveis para cenários mais comuns.</p>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-3 md:px-6">
            {SUGGESTED_RULES.map((suggested, index) => (
              <button
                key={index}
                onClick={() => adoptSuggested(suggested)}
                className="rounded-[1.4rem] border border-border-default bg-background p-4 text-left transition-all hover:border-border-hover hover:shadow-[0_16px_36px_-30px_hsl(var(--foreground)/0.22)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{suggested.name}</p>
                    <p className="mt-2 text-xs leading-5 text-text-secondary">
                      {suggested.conditions.map((condition, i) => (
                        <span key={i}>
                          {condition.metric} {operatorSymbol(condition.operator)} {condition.value}
                          {i < suggested.conditions.length - 1 ? <strong className="mx-1 text-primary">{suggested.logic}</strong> : null}
                        </span>
                      ))}
                    </p>
                  </div>
                  <span className={cn('rounded-full border px-2 py-1 text-[10px] font-semibold', actionColor(suggested.action))}>
                    {ACTION_LABEL[suggested.action]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-border-default bg-card shadow-[0_20px_50px_-36px_hsl(var(--foreground)/0.22)]">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 md:px-6">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <ShieldCheck className="size-4 text-primary" />
              Regras ativas
            </h3>
            <p className="mt-1 text-xs text-text-secondary">{activeCount}/{rules.length} ligadas no momento.</p>
          </div>
        </div>

        <div className="hide-scrollbar max-h-[960px] space-y-3 overflow-y-auto px-5 py-5 md:px-6">
          {rules.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-border-default bg-secondary/30 px-6 py-14 text-center">
              <p className="text-sm font-semibold text-text-primary">Nenhuma regra criada ainda</p>
              <p className="mt-2 text-xs text-text-secondary">Monte sua primeira automação no builder.</p>
            </div>
          ) : (
            rules.map((rule) => (
              <article
                key={rule.id}
                className={cn(
                  'rounded-[1.4rem] border p-4 transition-all',
                  rule.active ? 'border-primary/20 bg-primary/5' : 'border-border-default bg-background/70 opacity-75',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-semibold text-text-primary">{rule.name}</h4>
                      <span className={cn('rounded-full border px-2 py-1 text-[10px] font-semibold', actionColor(rule.action))}>
                        {ACTION_LABEL[rule.action]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-muted">Criada em {new Date(rule.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRule(rule.id)}
                    className="size-9 rounded-2xl text-text-muted hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {rule.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="rounded-full border border-border-default bg-card px-3 py-1.5 text-[11px] font-medium text-text-primary">
                        {condition.metric} {operatorSymbol(condition.operator)} {condition.value}
                      </span>
                      {index < rule.conditions.length - 1 ? (
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold tracking-[0.18em] text-primary">{rule.logic}</span>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-border-subtle bg-background/70 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{rule.active ? 'Regra ativa' : 'Regra inativa'}</p>
                    <p className="text-[11px] text-text-secondary">Controle rápido para habilitar ou pausar este gatilho.</p>
                  </div>
                  <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} className="data-[state=checked]:bg-primary" />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
