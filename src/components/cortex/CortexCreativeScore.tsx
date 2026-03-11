import { CreativeScore, GeneratedAd } from '@/hooks/useCortexCreatives';
import { useDashboard } from '@/context/DashboardContext';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  top_performer: { label: 'Top Performer', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  escalavel: { label: 'Escalável', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  monitorar: { label: 'Monitorar', color: 'bg-[#4A5F7A]/10 text-[#7A8FAD] border-[#4A5F7A]/20' },
  otimizar: { label: 'Otimizar', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  pausar: { label: 'Pausar', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function ScoreCircle({ score }: { score: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? '#22D07A' : score >= 50 ? '#F5A623' : '#F05252';

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#1E2A42" strokeWidth="5" />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-text-primary">{score}</span>
        <span className="text-[8px] text-text-muted uppercase">Score</span>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-text-muted hover:text-text-primary transition-colors p-0.5"
      title="Copiar"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function GeneratedAdsSection({ ads, generating, onGenerate }: { ads: GeneratedAd[]; generating: boolean; onGenerate: () => void }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#6C63FF]" />
          AI Ad Generator
        </h4>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-[#6C63FF]/15 text-[#8B85FF] hover:bg-[#6C63FF]/25 transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {generating ? 'Gerando...' : 'Gerar Anúncios'}
        </button>
      </div>

      {ads.length > 0 && (
        <div className="space-y-3">
          {ads.map((ad, i) => (
            <div key={i} className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-4 hover:border-[#2A3A5C] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-[#8B85FF] bg-[#6C63FF]/10 px-2 py-0.5 rounded">Anúncio {i + 1}</span>
                <span className="text-[9px] text-text-muted bg-[#080B14] px-2 py-0.5 rounded">{ad.angulo}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[9px] text-text-muted uppercase w-16 flex-shrink-0 pt-0.5">Hook</span>
                  <p className="text-[12px] font-semibold text-text-primary flex-1">{ad.hook}</p>
                  <CopyButton text={ad.hook} />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[9px] text-text-muted uppercase w-16 flex-shrink-0 pt-0.5">Título</span>
                  <p className="text-[11px] text-text-primary flex-1">{ad.headline}</p>
                  <CopyButton text={ad.headline} />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[9px] text-text-muted uppercase w-16 flex-shrink-0 pt-0.5">Body</span>
                  <p className="text-[11px] text-text-muted flex-1">{ad.body}</p>
                  <CopyButton text={ad.body} />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[9px] text-text-muted uppercase w-16 flex-shrink-0 pt-0.5">CTA</span>
                  <p className="text-[11px] font-semibold text-emerald-400 flex-1">{ad.cta}</p>
                  <CopyButton text={ad.cta} />
                </div>
                {ad.copy_b && (
                  <div className="mt-2 pt-2 border-t border-[#1E2A42]">
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] text-text-muted uppercase w-16 flex-shrink-0 pt-0.5">Copy B</span>
                      <p className="text-[11px] text-text-muted flex-1">{ad.copy_b}</p>
                      <CopyButton text={ad.copy_b} />
                    </div>
                    <div className="flex items-start gap-2 mt-1">
                      <span className="text-[9px] text-text-muted uppercase w-16 flex-shrink-0 pt-0.5">Teste</span>
                      <p className="text-[10px] text-[#8B85FF] flex-1">{ad.teste}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#6C63FF]" />
        <span className="text-sm text-text-muted">Calculando scores de criativos...</span>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">🎨</div>
        <p className="text-sm text-text-muted">Execute a análise para ver os scores de criativos.</p>
      </div>
    );
  }

  return (
    <div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {creatives.map((c, i) => {
        const badge = STATUS_BADGES[c.status] || STATUS_BADGES.monitorar;
        const showAction = c.status !== 'monitorar' && onAction;
        return (
          <div
            key={c.id}
            className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-4 flex gap-4 animate-fade-up hover:border-[#2A3A5C] transition-colors"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <ScoreCircle score={c.score} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary truncate">{c.name}</p>
                  {c.campaignName && (
                    <p className="text-[10px] text-text-muted truncate">{c.campaignName}</p>
                  )}
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[10px] text-text-muted mb-2 line-clamp-1">{c.reasoning}</p>
              <div className="flex items-center gap-3 text-[10px] text-text-muted flex-wrap">
                <span>CTR <b className="text-text-primary">{c.ctr.toFixed(1)}%</b></span>
                <span>CPM <b className="text-text-primary">{currencySymbol}{c.cpm.toFixed(0)}</b></span>
                <span>ROAS <b className={c.roas >= 3 ? 'text-emerald-400' : c.roas >= 1 ? 'text-amber-400' : 'text-red-400'}>{c.roas.toFixed(1)}x</b></span>
                <span>Gasto <b className="text-text-primary">{currencySymbol}{c.spend.toFixed(0)}</b></span>
              </div>
              {showAction && (
                <button
                  onClick={() => onAction!(c)}
                  className={`mt-2 text-[10px] font-semibold px-3 py-1 rounded transition-colors ${
                    c.status === 'pausar'
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : c.status === 'escalavel' || c.status === 'top_performer'
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  {c.action}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {/* AI Ad Generator */}
    {onGenerateAds && (
      <GeneratedAdsSection ads={generatedAds} generating={generating} onGenerate={onGenerateAds} />
    )}
    </div>
  );
}
