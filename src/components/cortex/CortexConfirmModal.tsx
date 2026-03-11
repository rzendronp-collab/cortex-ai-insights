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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl w-full max-w-md p-6 shadow-2xl animate-fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#6C63FF]" />
          <h3 className="text-sm font-semibold text-text-primary">Confirmar Otimização</h3>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-[#080B14] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted uppercase">Campanha</span>
              <span className="text-[12px] text-text-primary font-medium truncate ml-2 max-w-[250px]">{campaignName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted uppercase">Ação</span>
              <span className="text-[12px] text-text-primary font-semibold">{actionLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted uppercase">Motivo</span>
              <span className="text-[11px] text-text-muted text-right max-w-[250px]">{reasoning}</span>
            </div>
          </div>

          <div className="bg-[#6C63FF]/5 border border-[#6C63FF]/20 rounded-lg p-3">
            <p className="text-[10px] text-[#8B85FF] font-medium mb-0.5">Impacto esperado</p>
            <p className="text-[12px] text-text-primary">{expectedImpact}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 text-[12px] border-[#1E2A42] text-text-muted"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 text-[12px] bg-[#6C63FF] hover:bg-[#5558E6] text-white gap-2"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Executando...</>
            ) : (
              'Confirmar'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
