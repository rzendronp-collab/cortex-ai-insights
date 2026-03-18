import { useState } from 'react';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { CreativeScore, GeneratedAd } from '@/hooks/useCortexCreatives';
import { useDashboard } from '@/context/DashboardContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const STATUS_BADGES: Record<string, { label: string; color: string; accent: string }> = {
  top_performer: { label: 'Top Performer', color: 'border-success/20 bg-success/10 text-success', accent: 'hsl(var(--success))' },
  escalavel: { label: 'Escalável', color: 'border-primary/20 bg-primary/10 text-primary', accent: 'hsl(var(--primary))' },
  monitorar: { label: 'Monitorar', color: 'border-border-default bg-secondary text-text-secondary', accent: 'hsl(var(--text-muted))' },
  otimizar: { label: 'Otimizar', color: 'border-warning/20 bg-warning/10 text-warning', accent: 'hsl(var(--warning))' },
  pausar: { label: 'Pausar', color: 'border-destructive/20 bg-destructive/10 text-destructive', accent: 'hsl(var(--destructive))' },
};

function ScoreCircle({ score, color }: { score: number; color: string }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--border-subtle))" strokeWidth="5" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-text-primary">{score}</span>
        <span className="text-[8px] uppercase tracking-[0.18em] text-text-muted">Score</span>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg p-1 text-text-muted transition-colors hover:bg-accent hover:text-text-primary"
      title="Copiar"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function GeneratedAdsSection({ ads, generating, onGenerate }: { ads: GeneratedAd[]; generating: boolean; onGenerate: () => void }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-border-default bg-card shadow-[0_20px_50px_-36px_hsl(var(--foreground)/0.22)]">
      <div className="flex flex-col gap-4 border-b border-border-subtle px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">AI Generator</p>
          <h4 className="mt-2 flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Sparkles className="size-4 text-primary" />
            Variações de anúncio
          </h4>
          <p className="mt-1 text-sm text-text-secondary">Gere novas copys a partir dos criativos com melhor score.</p>
        </div>

        <Button onClick={onGenerate} disabled={generating} className="h-10 rounded-2xl px-4 text-sm font-semibold">
          {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {generating ? 'Gerando...' : 'Gerar anúncios'}
        </Button>
      </div>

      {ads.length > 0 ? (
        <div className="grid gap-3 px-5 py-5 md:grid-cols-2 md:px-6">
          {ads.map((ad, index) => (
            <article key={index} className="rounded-[1.4rem] border border-border-default bg-background/70 p-4 transition-all hover:border-border-hover">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                  Anúncio {index + 1}
                </span>
                <span className="rounded-full border border-border-default bg-card px-2.5 py-1 text-[10px] text-text-secondary">{ad.angulo}</span>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Hook', value: ad.hook, emphasized: true },
                  { label: 'Título', value: ad.headline },
                  { label: 'Body', value: ad.body },
                  { label: 'CTA', value: ad.cta, cta: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-card px-3 py-3">
                    <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">{item.label}</span>
                    <p
                      className={cn(
                        'flex-1 text-sm leading-6',
                        item.cta ? 'font-semibold text-success' : item.emphasized ? 'font-semibold text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      {item.value}
                    </p>
                    <CopyButton text={item.value} />
                  </div>
                ))}

                {ad.copy_b ? (
                  <div className="rounded-2xl border border-border-subtle bg-card px-3 py-3">
                    <div className="flex items-start gap-3">
                      <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Copy B</span>
                      <p className="flex-1 text-sm leading-6 text-text-secondary">{ad.copy_b}</p>
                      <CopyButton text={ad.copy_b} />
                    </div>
                    <p className="mt-3 border-t border-border-subtle pt-3 text-xs text-primary">Teste sugerido: {ad.teste}</p>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

interface Props {
  creatives: CreativeScore[];
  loading: boolean;
  onAction?: (creative: CreativeScore) => void;
  generatedAds?: GeneratedAd[];
  generating?: boolean;
  onGenerateAds?: () => void;
}

export default function CortexCreativeScore({ creatives, loading, onAction, generatedAds = [], generating = false, onGenerateAds }: Props) {
  const { currencySymbol } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm text-text-muted">Calculando scores de criativos...</span>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-border-default bg-card px-6 py-16 text-center">
        <div className="mb-4 text-4xl opacity-30">🎨</div>
        <p className="text-sm font-semibold text-text-primary">Sem criativos avaliados ainda</p>
        <p className="mt-2 text-xs text-text-secondary">Execute a análise para ver score, recomendação e potencial de escala.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.75rem] border border-border-default bg-card shadow-[0_20px_50px_-36px_hsl(var(--foreground)/0.22)]">
        <div className="panel-highlight border-b border-border-subtle px-5 py-5 md:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">Creative Scoring</p>
          <h3 className="mt-2 font-display text-xl font-bold tracking-[-0.04em] text-text-primary">Leitura de performance criativa</h3>
          <p className="mt-2 text-sm text-text-secondary">Classifique rapidamente o que escalar, otimizar, monitorar ou pausar.</p>
        </div>

        <div className="grid gap-3 px-5 py-5 md:grid-cols-2 md:px-6">
          {creatives.map((creative, index) => {
            const badge = STATUS_BADGES[creative.status] || STATUS_BADGES.monitorar;
            const showAction = creative.status !== 'monitorar' && onAction;
            const roasClass = creative.roas >= 3 ? 'text-success' : creative.roas >= 1 ? 'text-warning' : 'text-destructive';

            return (
              <article
                key={creative.id}
                style={{ animationDelay: `${index * 45}ms` }}
                className="animate-fade-up rounded-[1.5rem] border border-border-default bg-background/70 p-4 opacity-0 [animation-fill-mode:forwards] transition-all hover:border-border-hover hover:shadow-[0_16px_36px_-30px_hsl(var(--foreground)/0.22)]"
              >
                <div className="flex gap-4">
                  <ScoreCircle score={creative.score} color={badge.accent} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">{creative.name}</p>
                        {creative.campaignName ? <p className="mt-1 truncate text-xs text-text-secondary">{creative.campaignName}</p> : null}
                      </div>
                      <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold', badge.color)}>{badge.label}</span>
                    </div>

                    <p className="mt-3 text-xs leading-6 text-text-secondary">{creative.reasoning}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                      <div className="rounded-2xl border border-border-subtle bg-card px-3 py-2">
                        <p className="text-text-muted">CTR</p>
                        <p className="mt-1 font-semibold text-text-primary">{creative.ctr.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-2xl border border-border-subtle bg-card px-3 py-2">
                        <p className="text-text-muted">CPM</p>
                        <p className="mt-1 font-semibold text-text-primary">{currencySymbol}{creative.cpm.toFixed(0)}</p>
                      </div>
                      <div className="rounded-2xl border border-border-subtle bg-card px-3 py-2">
                        <p className="text-text-muted">ROAS</p>
                        <p className={cn('mt-1 font-semibold', roasClass)}>{creative.roas.toFixed(1)}x</p>
                      </div>
                      <div className="rounded-2xl border border-border-subtle bg-card px-3 py-2">
                        <p className="text-text-muted">Gasto</p>
                        <p className="mt-1 font-semibold text-text-primary">{currencySymbol}{creative.spend.toFixed(0)}</p>
                      </div>
                    </div>

                    {showAction ? (
                      <Button
                        onClick={() => onAction?.(creative)}
                        variant="outline"
                        className={cn(
                          'mt-4 h-9 rounded-2xl border px-4 text-xs font-semibold',
                          creative.status === 'pausar'
                            ? 'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15'
                            : creative.status === 'escalavel' || creative.status === 'top_performer'
                              ? 'border-success/20 bg-success/10 text-success hover:bg-success/15'
                              : 'border-warning/20 bg-warning/10 text-warning hover:bg-warning/15',
                        )}
                      >
                        {creative.action}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {onGenerateAds ? <GeneratedAdsSection ads={generatedAds} generating={generating} onGenerate={onGenerateAds} /> : null}
    </div>
  );
}
