import { useState, useEffect } from 'react';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface CortexScope {
  accountIds: string[];
  analyzedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (accountIds: string[]) => void;
  selectedIds: string[];
}

export default function CortexScopeSelector({ open, onClose, onConfirm, selectedIds }: Props) {
  const { adAccounts } = useMetaConnection();
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    setSelected(new Set(selectedIds));
  }, [selectedIds, open]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const ids = Array.from(selected);
    localStorage.setItem('cortex_scope', JSON.stringify({ accountIds: ids, analyzedAt: new Date().toISOString() }));
    onConfirm(ids);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60">
      <div className="w-full max-w-md rounded-xl border border-[hsl(var(--surface-edge)/0.08)] bg-[hsl(var(--surface-panel))] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings2 className="h-4 w-4 text-primary" />
            Configurar Escopo de Análise
          </h3>
          <button onClick={onClose} className="text-text-muted transition-colors hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-[11px] text-text-muted">Selecione as contas que deseja incluir na análise CORTEX.</p>

        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          {adAccounts.map(account => (
            <label
              key={account.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                selected.has(account.account_id || '')
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-[hsl(var(--surface-edge)/0.08)] hover:border-border-hover'
              }`}
            >
              <Checkbox
                checked={selected.has(account.account_id || '')}
                onCheckedChange={() => toggle(account.account_id || '')}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-foreground">
                  {account.account_name || `act_${account.account_id}`}
                </p>
                <p className="text-[10px] text-text-muted">{account.account_id}</p>
              </div>
            </label>
          ))}
          {adAccounts.length === 0 && (
            <p className="py-6 text-center text-[11px] text-text-muted">Nenhuma conta conectada.</p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--surface-edge)/0.08)] pt-4">
          <span className="text-[11px] text-text-muted">{selected.size} conta(s) selecionada(s)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-[11px]">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="text-[11px]"
            >
              Analisar {selected.size} conta(s)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
