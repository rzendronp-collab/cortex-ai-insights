import { CortexOptimization } from '@/hooks/useCortexActions';
import { Loader2, Filter } from 'lucide-react';
import { useState } from 'react';

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  pause_campaign: { label: 'Pausar', color: 'bg-red-500/10 text-red-400' },
  scale_budget: { label: 'Escalar', color: 'bg-emerald-500/10 text-emerald-400' },
  pause_ad: { label: 'Pausar Ad', color: 'bg-red-500/10 text-red-400' },
  change_audience: { label: 'Audiência', color: 'bg-blue-500/10 text-blue-400' },
  test_creative: { label: 'Teste', color: 'bg-purple-500/10 text-purple-400' },
};

interface Props {
  history: CortexOptimization[];
  loading: boolean;
}

export default function CortexHistory({ history, loading }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#6C63FF]" />
        <span className="text-sm text-text-muted">Carregando histórico...</span>
      </div>
    );
  }

  const filtered = filter === 'all' ? history : history.filter(h => h.action_type === filter);
  const actionTypes = [...new Set(history.map(h => h.action_type))];

  return (
    <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1E2A42] flex items-center justify-between">
        <h4 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
          Histórico de Otimizações ({history.length})
        </h4>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <button
            onClick={() => setFilter('all')}
            className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
              filter === 'all' ? 'bg-[#6C63FF]/20 text-[#6C63FF]' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Todos
          </button>
          {actionTypes.map(type => {
            const badge = TYPE_BADGES[type] || { label: type, color: '' };
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                  filter === type ? 'bg-[#6C63FF]/20 text-[#6C63FF]' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {badge.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* localStorage fallback indicator */}
      {history.length > 0 && !history[0].id?.includes('-') && (
        <div className="px-5 py-1.5 bg-amber-500/5 border-b border-amber-500/20">
          <p className="text-[10px] text-amber-400">Dados salvos localmente. Execute a migration SQL no Supabase para persistência permanente.</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-[12px] text-text-muted">
            {history.length === 0 ? 'Nenhuma otimização executada ainda.' : 'Nenhuma otimização encontrada com este filtro.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1E2A42]">
          {filtered.map(h => {
            const badge = TYPE_BADGES[h.action_type] || { label: h.action_type, color: 'bg-[#4A5F7A]/10 text-[#7A8FAD]' };
            const isExpanded = expanded === h.id;
            return (
              <div key={h.id} className="px-5 py-3 hover:bg-[#080B14]/50 transition-colors">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : h.id)}
                >
                  <span className="text-[11px] text-text-muted w-24 flex-shrink-0">
                    {new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badge.color} flex-shrink-0`}>
                    {badge.label}
                  </span>
                  <span className="text-[12px] text-text-primary font-medium truncate flex-1">
                    {h.campaign_name || h.ad_name || '—'}
                  </span>
                  <span className="text-[10px] text-text-muted truncate max-w-[200px]">
                    {h.expected_impact || ''}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
                    h.status === 'executed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {h.status === 'executed' ? 'Executado' : 'Falhou'}
                  </span>
                </div>

                {isExpanded && (
                  <div className="mt-3 ml-24 bg-[#080B14] rounded-lg p-3 space-y-2 animate-fade-up">
                    {h.reasoning && (
                      <div>
                        <p className="text-[10px] text-text-muted uppercase mb-0.5">Motivo</p>
                        <p className="text-[11px] text-text-primary">{h.reasoning}</p>
                      </div>
                    )}
                    {h.metrics_before && (
                      <div>
                        <p className="text-[10px] text-text-muted uppercase mb-0.5">Métricas Antes</p>
                        <div className="flex gap-3 text-[10px]">
                          {Object.entries(h.metrics_before).map(([k, v]) => (
                            <span key={k} className="text-text-muted">{k}: <b className="text-text-primary">{typeof v === 'number' ? v.toFixed(2) : v}</b></span>
                          ))}
                        </div>
                      </div>
                    )}
                    {h.metrics_after && (
                      <div>
                        <p className="text-[10px] text-text-muted uppercase mb-0.5">Métricas Depois</p>
                        <div className="flex gap-3 text-[10px]">
                          {Object.entries(h.metrics_after).map(([k, v]) => (
                            <span key={k} className="text-text-muted">{k}: <b className="text-text-primary">{typeof v === 'number' ? v.toFixed(2) : v}</b></span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
