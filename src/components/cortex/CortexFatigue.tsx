import { FatigueResult } from '@/hooks/useCortexFatigue';
import { Flame, Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  results: FatigueResult[];
  loading: boolean;
}

type FatigueStatus = 'fresco' | 'atencao' | 'saturado' | 'critico';

function getDelta(values: number[]) {
  if (values.length < 2) return 0;
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avgFirst = first.reduce((sum, value) => sum + value, 0) / (first.length || 1);
  const avgSecond = second.reduce((sum, value) => sum + value, 0) / (second.length || 1);
  if (avgFirst <= 0) return 0;
  return ((avgSecond - avgFirst) / avgFirst) * 100;
}

function calculateV5Fatigue(result: FatigueResult) {
  const ctrDelta = getDelta(result.ctrTrend);
  const cpmDelta = getDelta(result.cpmTrend);
  const roasProxyDelta = cpmDelta - ctrDelta;

  let score = 0;
  if (ctrDelta <= -30) score += 35;
  if (cpmDelta >= 20) score += 25;
  if (roasProxyDelta >= 25) score += 25;
  if (result.frequencyAvg > 3.5) score += 15;

  const finalScore = Math.min(100, Math.max(0, score));

  let status: FatigueStatus = 'fresco';
  if (finalScore >= 75) status = 'critico';
  else if (finalScore >= 50) status = 'saturado';
  else if (finalScore >= 25) status = 'atencao';

  return {
    score: finalScore,
    status,
    ctrDelta,
    cpmDelta,
    roasProxyDelta,
  };
}

const STATUS_CONFIG: Record<FatigueStatus, { label: string; badge: string; ring: string }> = {
  fresco: { label: 'Fresco', badge: 'border-success/20 bg-success/10 text-success', ring: 'hsl(var(--success))' },
  atencao: { label: 'Atenção', badge: 'border-warning/20 bg-warning/10 text-warning', ring: 'hsl(var(--warning))' },
  saturado: { label: 'Saturado', badge: 'border-[hsl(var(--yellow))/0.25] bg-[hsl(var(--yellow))/0.12] text-[hsl(var(--yellow))]', ring: 'hsl(var(--yellow))' },
  critico: { label: 'Crítico', badge: 'border-destructive/20 bg-destructive/10 text-destructive', ring: 'hsl(var(--destructive))' },
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 72;
  const height = 24;

  const points = data
    .map((value, index) => `${(index / (data.length - 1)) * width},${height - ((value - min) / range) * height}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CortexFatigue({ results, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm text-text-muted">Analisando fadiga criativa...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-border-default bg-card px-6 py-16 text-center">
        <Flame className="mx-auto mb-4 size-10 text-text-muted/50" />
        <p className="text-sm font-semibold text-text-primary">Sem análise de fadiga ainda</p>
        <p className="mt-2 text-xs text-text-secondary">Execute a análise para calcular score 0-100 e identificar saturação criativa.</p>
      </div>
    );
  }

  const enhanced = results.map((result) => ({ result, v5: calculateV5Fatigue(result) }));

  const critical = enhanced.filter((item) => item.v5.status === 'critico').length;
  const saturated = enhanced.filter((item) => item.v5.status === 'saturado').length;
  const warning = enhanced.filter((item) => item.v5.status === 'atencao').length;
  const fresh = enhanced.filter((item) => item.v5.status === 'fresco').length;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.75rem] border border-border-default bg-card shadow-[0_20px_50px_-36px_hsl(var(--foreground)/0.22)]">
        <div className="panel-highlight flex flex-col gap-4 border-b border-border-subtle px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">Creative Health</p>
            <h3 className="mt-2 flex items-center gap-2 font-display text-xl font-bold tracking-[-0.04em] text-text-primary">
              <Flame className="size-5 text-primary" />
              Radar de fadiga v5
            </h3>
            <p className="mt-2 text-sm text-text-secondary">Score por sinais de CTR, CPM, roas proxy e frequência.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-2xl border border-destructive/15 bg-destructive/5 px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Crítico</p>
              <p className="mt-1 text-lg font-semibold text-destructive">{critical}</p>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--yellow))/0.2] bg-[hsl(var(--yellow))/0.08] px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Saturado</p>
              <p className="mt-1 text-lg font-semibold text-[hsl(var(--yellow))]">{saturated}</p>
            </div>
            <div className="rounded-2xl border border-warning/15 bg-warning/5 px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Atenção</p>
              <p className="mt-1 text-lg font-semibold text-warning">{warning}</p>
            </div>
            <div className="rounded-2xl border border-success/15 bg-success/5 px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Fresco</p>
              <p className="mt-1 text-lg font-semibold text-success">{fresh}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-5 md:grid-cols-2 md:px-6">
          {enhanced.map(({ result, v5 }) => {
            const config = STATUS_CONFIG[v5.status];
            const radius = 24;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (v5.score / 100) * circumference;

            return (
              <article key={result.adId} className="rounded-[1.5rem] border border-border-default bg-background/70 p-4 transition-all hover:border-border-hover hover:shadow-[0_16px_36px_-30px_hsl(var(--foreground)/0.22)]">
                <div className="flex gap-4">
                  <div className="relative shrink-0">
                    <svg width="58" height="58" className="-rotate-90">
                      <circle cx="29" cy="29" r={radius} fill="none" stroke="hsl(var(--border-subtle))" strokeWidth="4" />
                      <circle
                        cx="29"
                        cy="29"
                        r={radius}
                        fill="none"
                        stroke={config.ring}
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-text-primary">{v5.score}</span>
                      <span className="text-[9px] uppercase tracking-[0.18em] text-text-muted">Score</span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{result.adName}</p>
                        <p className="mt-1 truncate text-xs text-text-secondary">{result.campaignName}</p>
                      </div>
                      <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold', config.badge)}>{config.label}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-full border border-border-default bg-card px-2.5 py-1 text-text-secondary">
                        CTR {v5.ctrDelta <= 0 ? <TrendingDown className="ml-1 inline size-3" /> : <TrendingUp className="ml-1 inline size-3" />} {Math.abs(v5.ctrDelta).toFixed(0)}%
                      </span>
                      <span className="rounded-full border border-border-default bg-card px-2.5 py-1 text-text-secondary">
                        CPM {v5.cpmDelta >= 0 ? <TrendingUp className="ml-1 inline size-3" /> : <Minus className="ml-1 inline size-3" />} {Math.abs(v5.cpmDelta).toFixed(0)}%
                      </span>
                      <span className="rounded-full border border-border-default bg-card px-2.5 py-1 text-text-secondary">
                        Freq <strong className="text-text-primary">{result.frequencyAvg.toFixed(1)}x</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-border-subtle pt-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border-subtle bg-card px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">CTR</span>
                      <span className="text-[10px] text-text-secondary">7 dias</span>
                    </div>
                    <MiniSparkline data={result.ctrTrend} color={config.ring} />
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-card px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">CPM</span>
                      <span className="text-[10px] text-text-secondary">7 dias</span>
                    </div>
                    <MiniSparkline data={result.cpmTrend} color="hsl(var(--accent))" />
                  </div>
                </div>

                <p className="mt-4 text-xs leading-6 text-text-secondary">{result.reasoning}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
