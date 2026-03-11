import { useState, useEffect } from 'react';
import { Plus, Trash2, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RuleCondition {
  metric: string;  // 'ROAS' | 'CTR' | 'CPV' | 'Gasto' | 'CPM' | 'CPA' | 'Frequencia'
  operator: '<' | '>' | '=' | '>=' | '<=';
  value: number;
}

interface Rule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  logic: 'AND' | 'OR';
  action: 'Alertar' | 'Sugerir Pausa' | 'Sugerir Escala' | 'Notificar';
  active: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'cortexads_rules';

const METRICS = ['ROAS', 'CTR', 'CPV', 'Gasto', 'CPM', 'CPA', 'Frequencia'] as const;

const OPERATORS: { value: RuleCondition['operator']; label: string }[] = [
  { value: '<', label: 'Menor que' },
  { value: '>', label: 'Maior que' },
  { value: '=', label: 'Igual a' },
  { value: '>=', label: 'Maior ou igual' },
  { value: '<=', label: 'Menor ou igual' },
];

const ACTIONS: Rule['action'][] = ['Alertar', 'Sugerir Pausa', 'Sugerir Escala', 'Notificar'];

function operatorSymbol(op: string) {
  switch (op) {
    case '>=': return '\u2265';
    case '<=': return '\u2264';
    default: return op;
  }
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

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------

function checkRules(rules: Rule[], campaignMetrics: Record<string, number>): { rule: Rule; triggered: boolean }[] {
  return rules.map(rule => {
    if (!rule.active) return { rule, triggered: false };
    const results = rule.conditions.map(c => {
      const val = campaignMetrics[c.metric] ?? 0;
      switch (c.operator) {
        case '<': return val < c.value;
        case '>': return val > c.value;
        case '=': return val === c.value;
        case '>=': return val >= c.value;
        case '<=': return val <= c.value;
      }
    });
    const triggered = rule.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
    return { rule, triggered };
  });
}

// ---------------------------------------------------------------------------
// Suggested (pre-built) rules
// ---------------------------------------------------------------------------

const SUGGESTED_RULES: Omit<Rule, 'id' | 'active' | 'createdAt'>[] = [
  {
    name: 'ROAS Baixo + Gasto Alto',
    conditions: [
      { metric: 'ROAS', operator: '<', value: 2 },
      { metric: 'Gasto', operator: '>', value: 100 },
    ],
    logic: 'AND',
    action: 'Sugerir Pausa',
  },
  {
    name: 'Performance Alta',
    conditions: [
      { metric: 'ROAS', operator: '>=', value: 4 },
      { metric: 'CTR', operator: '>', value: 2 },
    ],
    logic: 'AND',
    action: 'Sugerir Escala',
  },
  {
    name: 'CPM Alto + CTR Baixo',
    conditions: [
      { metric: 'CPM', operator: '>', value: 35 },
      { metric: 'CTR', operator: '<', value: 1 },
    ],
    logic: 'AND',
    action: 'Alertar',
  },
  {
    name: 'CPA Alto',
    conditions: [
      { metric: 'CPV', operator: '>', value: 50 },
      { metric: 'ROAS', operator: '<', value: 1.5 },
    ],
    logic: 'AND',
    action: 'Sugerir Pausa',
  },
  {
    name: 'Escala Segura',
    conditions: [
      { metric: 'ROAS', operator: '>=', value: 3 },
      { metric: 'Gasto', operator: '<', value: 50 },
    ],
    logic: 'AND',
    action: 'Sugerir Escala',
  },
  {
    name: 'Frequ\u00eancia Alta',
    conditions: [
      { metric: 'Frequencia', operator: '>', value: 3 },
    ],
    logic: 'AND',
    action: 'Alertar',
  },
];

// ---------------------------------------------------------------------------
// Action badge color
// ---------------------------------------------------------------------------

function actionColor(action: string) {
  switch (action) {
    case 'Alertar': return 'bg-amber-500/15 text-amber-400';
    case 'Sugerir Pausa': return 'bg-red-500/15 text-red-400';
    case 'Sugerir Escala': return 'bg-emerald-500/15 text-emerald-400';
    case 'Notificar': return 'bg-blue-500/15 text-blue-400';
    default: return 'bg-[#6C63FF]/15 text-[#6C63FF]';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export { checkRules };
export type { Rule, RuleCondition };

export default function RulesTab() {
  // ---- State: persisted rules ----
  const [rules, setRules] = useState<Rule[]>(loadRules);

  useEffect(() => {
    saveRules(rules);
  }, [rules]);

  // ---- State: builder ----
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { metric: 'ROAS', operator: '<', value: 0 },
  ]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [action, setAction] = useState<Rule['action']>('Alertar');
  const [ruleName, setRuleName] = useState('');

  // ---- Condition helpers ----
  const updateCondition = (idx: number, patch: Partial<RuleCondition>) => {
    setConditions(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeCondition = (idx: number) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { metric: 'ROAS', operator: '<', value: 0 }]);
  };

  // ---- Rule CRUD ----
  const createRule = () => {
    const name = ruleName.trim() || conditions.map(c => `${c.metric} ${operatorSymbol(c.operator)} ${c.value}`).join(` ${logic} `);
    const rule: Rule = {
      id: uid(),
      name,
      conditions: [...conditions],
      logic,
      action,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setRules(prev => [...prev, rule]);
    toast.success(`Regra "${rule.name}" criada!`);
    // reset builder
    setConditions([{ metric: 'ROAS', operator: '<', value: 0 }]);
    setRuleName('');
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, active: !r.active } : r)));
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast('Regra removida');
  };

  const adoptSuggested = (suggested: (typeof SUGGESTED_RULES)[number]) => {
    const rule: Rule = {
      id: uid(),
      name: suggested.name,
      conditions: [...suggested.conditions],
      logic: suggested.logic,
      action: suggested.action,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setRules(prev => [...prev, rule]);
    toast.success(`Regra "${rule.name}" adicionada!`);
  };

  // ---- Render ----
  const canCreate = conditions.length > 0 && conditions.every(c => c.value !== 0 || c.metric);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ================================================================ */}
      {/* LEFT — Rule Builder                                              */}
      {/* ================================================================ */}
      <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-5 animate-fade-up">
        <h3 className="text-[12px] font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#6C63FF]" />
          Criar Regra
        </h3>

        {/* Name */}
        <Input
          value={ruleName}
          onChange={e => setRuleName(e.target.value)}
          placeholder="Nome da regra (opcional)"
          className="h-8 text-[12px] bg-[#080B14] border-[#1E2A42] text-white placeholder:text-gray-500 mb-3 rounded-lg"
        />

        {/* Conditions */}
        <div className="space-y-2 mb-3">
          {conditions.map((cond, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {/* Metric */}
              <Select value={cond.metric} onValueChange={v => updateCondition(idx, { metric: v })}>
                <SelectTrigger className="h-8 w-[110px] text-[12px] bg-[#080B14] border-[#1E2A42] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0E1420] border-[#1E2A42]">
                  {METRICS.map(m => (
                    <SelectItem key={m} value={m} className="text-[12px] text-white">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator */}
              <Select value={cond.operator} onValueChange={v => updateCondition(idx, { operator: v as RuleCondition['operator'] })}>
                <SelectTrigger className="h-8 w-[130px] text-[12px] bg-[#080B14] border-[#1E2A42] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0E1420] border-[#1E2A42]">
                  {OPERATORS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-[12px] text-white">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value */}
              <Input
                type="number"
                value={cond.value || ''}
                onChange={e => updateCondition(idx, { value: parseFloat(e.target.value) || 0 })}
                placeholder="Valor"
                className="h-8 w-[80px] text-[12px] bg-[#080B14] border-[#1E2A42] text-white placeholder:text-gray-500 rounded-lg"
              />

              {/* Remove condition */}
              {conditions.length > 1 && (
                <button
                  onClick={() => removeCondition(idx)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add condition + logic toggle row */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={addCondition}
            className="h-7 text-[10px] border-[#1E2A42] bg-[#080B14] text-gray-400 hover:text-white hover:border-[#6C63FF]"
          >
            <Plus className="w-3 h-3 mr-1" />
            Condição
          </Button>

          {conditions.length > 1 && (
            <div className="flex items-center bg-[#080B14] border border-[#1E2A42] rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setLogic('AND')}
                className={`px-3 py-1 text-[10px] font-semibold transition-colors ${
                  logic === 'AND'
                    ? 'bg-[#6C63FF] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                AND
              </button>
              <button
                onClick={() => setLogic('OR')}
                className={`px-3 py-1 text-[10px] font-semibold transition-colors ${
                  logic === 'OR'
                    ? 'bg-[#6C63FF] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                OR
              </button>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="mb-4">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Ação</label>
          <Select value={action} onValueChange={v => setAction(v as Rule['action'])}>
            <SelectTrigger className="h-8 text-[12px] bg-[#080B14] border-[#1E2A42] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0E1420] border-[#1E2A42]">
              {ACTIONS.map(a => (
                <SelectItem key={a} value={a} className="text-[12px] text-white">{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Submit */}
        <Button
          onClick={createRule}
          disabled={!canCreate}
          className="w-full h-9 text-[12px] font-semibold bg-[#6C63FF] hover:bg-[#5558e6] text-white rounded-lg"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Criar Regra
        </Button>
      </div>

      {/* ================================================================ */}
      {/* RIGHT — Active Rules                                             */}
      {/* ================================================================ */}
      <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-5 animate-fade-up">
        <h3 className="text-[12px] font-semibold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#6C63FF]" />
          Regras Ativas ({rules.filter(r => r.active).length}/{rules.length})
        </h3>

        {rules.length === 0 ? (
          <p className="text-[12px] text-gray-500 text-center py-10">Nenhuma regra criada ainda</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`bg-[#080B14] border rounded-lg p-3 transition-all ${
                  rule.active ? 'border-[#6C63FF]/30' : 'border-[#1E2A42] opacity-50'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-medium text-white flex-1 truncate">{rule.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${actionColor(rule.action)}`}>
                    {rule.action}
                  </span>
                </div>

                {/* Conditions inline */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {rule.conditions.map((c, ci) => (
                    <span key={ci} className="inline-flex items-center">
                      <span className="text-[10px] bg-[#0E1420] text-gray-300 px-2 py-0.5 rounded">
                        {c.metric} {operatorSymbol(c.operator)} {c.value}
                      </span>
                      {ci < rule.conditions.length - 1 && (
                        <span className="text-[10px] text-[#6C63FF] font-semibold mx-1">{rule.logic}</span>
                      )}
                    </span>
                  ))}
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.active}
                    onCheckedChange={() => toggleRule(rule.id)}
                    className="data-[state=checked]:bg-[#6C63FF] scale-75 origin-left"
                  />
                  <span className="text-[10px] text-gray-500 flex-1">
                    {rule.active ? 'Ativa' : 'Inativa'}
                  </span>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* BOTTOM — Suggested Rules (full width)                            */}
      {/* ================================================================ */}
      <div className="lg:col-span-2 bg-[#0E1420] border border-[#1E2A42] rounded-xl p-5 animate-fade-up">
        <h3 className="text-[12px] font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#6C63FF]" />
          Regras Sugeridas
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {SUGGESTED_RULES.map((suggested, i) => (
            <button
              key={i}
              onClick={() => adoptSuggested(suggested)}
              className="bg-[#080B14] hover:bg-[#1E2A42] border border-[#1E2A42] hover:border-[#6C63FF]/40 rounded-lg p-3 text-left transition-all group"
            >
              <p className="text-[12px] font-semibold text-white mb-1 truncate">{suggested.name}</p>
              <div className="space-y-0.5 mb-2">
                {suggested.conditions.map((c, ci) => (
                  <p key={ci} className="text-[10px] text-gray-400">
                    {c.metric} {operatorSymbol(c.operator)} {c.value}
                    {ci < suggested.conditions.length - 1 && (
                      <span className="text-[#6C63FF] font-semibold ml-1">{suggested.logic}</span>
                    )}
                  </p>
                ))}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${actionColor(suggested.action)}`}>
                {suggested.action}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
