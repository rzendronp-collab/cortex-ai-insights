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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#6C63FF]" />
            Configurar Escopo de Análise
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-text-muted mb-4">Selecione as contas que deseja incluir na análise CORTEX.</p>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {adAccounts.map(account => (
            <label
              key={account.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected.has(account.account_id || '')
                  ? 'border-[#6C63FF]/40 bg-[#6C63FF]/5'
                  : 'border-[#1E2A42] hover:border-[#2A3A5C]'
              }`}
            >
              <Checkbox
                checked={selected.has(account.account_id || '')}
                onCheckedChange={() => toggle(account.account_id || '')}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-text-primary truncate">
                  {account.account_name || `act_${account.account_id}`}
                </p>
                <p className="text-[10px] text-text-muted">{account.account_id}</p>
              </div>
            </label>
          ))}
          {adAccounts.length === 0 && (
            <p className="text-[11px] text-text-muted text-center py-6">Nenhuma conta conectada.</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#1E2A42]">
          <span className="text-[11px] text-text-muted">{selected.size} conta(s) selecionada(s)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-[11px] border-[#1E2A42]">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="text-[11px] bg-[#6C63FF] hover:bg-[#5558E6] text-white"
            >
              Analisar {selected.size} conta(s)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
