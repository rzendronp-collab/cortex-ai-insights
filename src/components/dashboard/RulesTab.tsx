import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Rule { metric: string; condition: string; value: string; action: string; label: string; }

const suggestedRules = [
  { metric: 'ROAS', condition: '<', value: '2', action: 'Sugerir Pausa', label: 'ROAS < 2x' },
  { metric: 'CTR', condition: '<', value: '1', action: 'Alertar', label: 'CTR < 1%' },
  { metric: 'CPV', condition: '>', value: '50', action: 'Alertar', label: 'CPV > 50' },
  { metric: 'Gasto', condition: '>', value: '100', action: 'Alertar', label: 'Gasto > 100' },
  { metric: 'CPM', condition: '>', value: '35', action: 'Alertar', label: 'CPM > 35' },
  { metric: 'ROAS', condition: '>=', value: '4', action: 'Sugerir Escala', label: 'ROAS ≥ 4x' },
];

export default function RulesTab() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [metric, setMetric] = useState('ROAS');
  const [condition, setCondition] = useState('<');
  const [value, setValue] = useState('');
  const [action, setAction] = useState('Alertar');

  const addRule = (rule?: Rule) => {
    const r = rule || { metric, condition, value, action, label: `${metric} ${condition} ${value}` };
    setRules(prev => [...prev, r]);
    toast.success(`Regra "${r.label}" adicionada!`);
    setValue('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Create rule */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-4">Criar Regra</h3>
        <div className="space-y-3">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="h-9 text-xs bg-muted border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['ROAS', 'CTR', 'CPV', 'Gasto', 'CPM'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className="h-9 text-xs bg-muted border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[['<', 'Menor que'], ['>', 'Maior que'], ['=', 'Igual a'], ['>=', 'Maior ou igual'], ['<=', 'Menor ou igual']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="Valor" className="h-9 text-xs bg-muted border-border" />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-9 text-xs bg-muted border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Alertar', 'Sugerir Pausa', 'Sugerir Escala'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => addRule()} disabled={!value} className="w-full h-9 text-xs gradient-primary text-primary-foreground">
            <Plus className="w-3.5 h-3.5 mr-1" />Adicionar Regra
          </Button>
        </div>
      </div>

      {/* Active rules */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">Regras Ativas ({rules.length})</h3>
        {rules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhuma regra criada ainda</p>
        ) : (
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted rounded-md p-2.5">
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-foreground font-medium flex-1">{r.label}</span>
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">{r.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested rules */}
      <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">Regras Sugeridas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {suggestedRules.map((r, i) => (
            <button key={i} onClick={() => addRule(r)} className="bg-muted hover:bg-accent border border-border hover:border-border-hover rounded-md p-3 text-left transition-all">
              <p className="text-xs font-semibold text-foreground">{r.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{r.action}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
