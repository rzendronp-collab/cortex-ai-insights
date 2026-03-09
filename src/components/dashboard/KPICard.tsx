import { ArrowUp, ArrowDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: number;
  valueClassName?: string;
  isHero?: boolean;
}

export default function KPICard({ label, value, subtitle, delta, valueClassName, isHero }: KPICardProps) {
  // Determine hero color based on valueClassName
  const isGreen = valueClassName?.includes('green') || valueClassName?.includes('success');
  const isRed = valueClassName?.includes('red') || valueClassName?.includes('destructive');

  const heroAccent = isRed
    ? { border: 'border-data-red/30', glow: 'shadow-[0_0_40px_hsl(var(--data-red)/0.1)]', gradFrom: 'from-data-red/[0.06]' }
    : isGreen
      ? { border: 'border-data-green/30', glow: 'shadow-[0_0_40px_hsl(var(--data-green)/0.1)]', gradFrom: 'from-data-green/[0.06]' }
      : { border: 'border-data-blue/30', glow: 'shadow-[0_0_40px_hsl(var(--data-blue)/0.1)]', gradFrom: 'from-data-blue/[0.06]' };

  const resolvedValueClass = valueClassName || 'text-text-primary';

  return (
    <div className={`rounded-xl p-4 transition-all duration-200 animate-fade-up group cursor-default ${
      isHero
        ? `bg-gradient-to-br ${heroAccent.gradFrom} to-bg-card border ${heroAccent.border} ${heroAccent.glow} shadow-kpi-hero`
        : 'bg-bg-card border border-border-default hover:border-border-focus hover:-translate-y-0.5 hover:shadow-card-hover'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">{label}</p>
        {delta !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
            delta >= 0
              ? 'text-data-green bg-data-green/10'
              : 'text-data-red bg-data-red/10'
          }`}>
            {delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <p className={`${isHero ? 'text-[32px]' : 'text-xl'} font-extrabold ${resolvedValueClass} leading-tight`}
         style={{ letterSpacing: '-0.5px' }}>
        {value}
      </p>
      {subtitle && <p className="text-[11px] text-text-muted mt-1">{subtitle}</p>}
    </div>
  );
}
