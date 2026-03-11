import { FatigueResult } from '@/hooks/useCortexFatigue';
import { Loader2, AlertTriangle, TrendingDown, TrendingUp, Minus, Flame } from 'lucide-react';

const STATUS_CONFIG = {
  healthy: { label: 'Saudável', color: 'bg-emerald-500/10 text-emerald-400', ring: 'stroke-emerald-400' },
  warning: { label: 'Atenção', color: 'bg-amber-500/10 text-amber-400', ring: 'stroke-amber-400' },
  fatigued: { label: 'Fatigado', color: 'bg-orange-500/10 text-orange-400', ring: 'stroke-orange-400' },
  critical: { label: 'Crítico', color: 'bg-red-500/10 text-red-400', ring: 'stroke-red-400' },
};

const TREND_ICON = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
  crashing: AlertTriangle,
};

const TREND_LABEL = {
  improving: 'Melhorando',
  stable: 'Estável',
  declining: 'Declinando',
  crashing: 'Despencando',
};

interface Props {
  results: FatigueResult[];
  loading: boolean;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CortexFatigue({ results, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#6C63FF]" />
        <span className="text-sm text-text-muted">Analisando fadiga criativa...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <Flame className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-30" />
        <p className="text-sm text-text-muted">Execute a análise para detectar fadiga criativa.</p>
        <p className="text-[10px] text-text-muted mt-1">Compara CTR, CPM e frequência dos últimos 7 dias.</p>
      </div>
    );
  }

  const critical = results.filter(r => r.status === 'critical').length;
  const fatigued = results.filter(r => r.status === 'fatigued').length;
  const warning = results.filter(r => r.status === 'warning').length;
  const healthy = results.filter(r => r.status === 'healthy').length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#6C63FF]" />
          <span className="text-[12px] font-semibold text-text-primary">Fadiga Criativa</span>
        </div>
        <div className="flex gap-4 text-[11px]">
          {critical > 0 && <span className="text-red-400 font-medium">{critical} crítico{critical > 1 ? 's' : ''}</span>}
          {fatigued > 0 && <span className="text-orange-400 font-medium">{fatigued} fatigado{fatigued > 1 ? 's' : ''}</span>}
          {warning > 0 && <span className="text-amber-400 font-medium">{warning} atenção</span>}
          <span className="text-emerald-400 font-medium">{healthy} saudável{healthy !== 1 ? 'is' : ''}</span>
        </div>
        <span className="text-[10px] text-text-muted ml-auto">{results.length} anúncios analisados</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.map(r => {
          const config = STATUS_CONFIG[r.status];
          const TrendIcon = TREND_ICON[r.trend];

          // SVG ring for fatigue score
          const radius = 22;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (r.fatigueScore / 100) * circumference;

          return (
            <div key={r.adId} className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-4 hover:border-[#2A3A5C] transition-colors">
              <div className="flex items-start gap-3">
                {/* Score ring */}
                <div className="relative flex-shrink-0">
                  <svg width="52" height="52" className="-rotate-90">
                    <circle cx="26" cy="26" r={radius} fill="none" stroke="#1E2A42" strokeWidth="3" />
                    <circle
                      cx="26" cy="26" r={radius}
                      fill="none"
                      className={config.ring}
                      strokeWidth="3"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-text-primary">
                    {r.fatigueScore}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary truncate">{r.adName}</p>
                  <p className="text-[10px] text-text-muted truncate">{r.campaignName}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                      <TrendIcon className="w-3 h-3" />
                      {TREND_LABEL[r.trend]}
                    </span>
                  </div>
                </div>

                {/* Sparklines */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-text-muted">CTR</span>
                    <MiniSparkline data={r.ctrTrend} color={r.status === 'healthy' ? '#10B981' : r.status === 'warning' ? '#F59E0B' : '#EF4444'} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-text-muted">CPM</span>
                    <MiniSparkline data={r.cpmTrend} color="#6C63FF" />
                  </div>
                </div>
              </div>

              {/* Details row */}
              <div className="mt-3 pt-2 border-t border-[#1E2A42] flex items-center gap-4 text-[10px]">
                <span className="text-text-muted">Dias: <b className="text-text-primary">{r.daysRunning}</b></span>
                <span className="text-text-muted">Freq: <b className="text-text-primary">{r.frequencyAvg.toFixed(1)}x</b></span>
                <span className="text-text-muted flex-1 truncate">{r.reasoning}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
