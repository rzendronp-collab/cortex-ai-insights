import { ArrowUp, ArrowDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: number;
  valueClassName?: string;
  isHero?: boolean;
}

export default function KPICard({ label, value, subtitle, delta, valueClassName = 'text-foreground', isHero }: KPICardProps) {
  return (
    <div className={`rounded-xl p-4 transition-all duration-200 animate-fade-up hover:-translate-y-0.5 ${
      isHero 
        ? 'bg-[#0E1420] border border-[#3B82F6]/30 shadow-kpi-hero glow-blue' 
        : 'bg-[#0E1420] border border-[#1E2D4A] hover:shadow-card-hover'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-[1px] text-muted-foreground font-medium">{label}</p>
        {delta !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
            {delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <p className={`${isHero ? 'text-[32px]' : 'text-xl'} font-extrabold ${valueClassName} leading-tight tracking-tight`}
         style={{ letterSpacing: '-0.5px' }}>
        {value}
      </p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
