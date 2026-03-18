import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  campaignName: string;
  actionLabel: string;
  reasoning: string;
  expectedImpact: string;
}

export default function CortexConfirmModal({
  open, onClose, onConfirm, loading,
  title, campaignName, actionLabel, reasoning, expectedImpact,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60">
      <div className="w-full max-w-md animate-fade-up rounded-xl border border-[hsl(var(--surface-edge)/0.08)] bg-[hsl(var(--surface-panel))] p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Confirmar Otimização</h3>
        </div>

        <div className="mb-6 space-y-3">
          <div className="space-y-2 rounded-lg border border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-panel-strong))] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-text-muted">Campanha</span>
              <span className="ml-2 max-w-[250px] truncate text-[12px] font-medium text-foreground">{campaignName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-text-muted">Ação</span>
              <span className="text-[12px] font-semibold text-foreground">{actionLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-text-muted">Motivo</span>
              <span className="max-w-[250px] text-right text-[11px] text-text-muted">{reasoning}</span>
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <p className="mb-0.5 text-[10px] font-medium text-primary">Impacto esperado</p>
            <p className="text-[12px] text-foreground">{expectedImpact}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 text-[12px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 gap-2 text-[12px]"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Executando...</>
            ) : (
              'Confirmar'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
