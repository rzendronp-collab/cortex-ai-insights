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
    <div className="bg-card border border-border rounded-lg p-4 hover:border-border-hover transition-all animate-fade-up">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
      <p className={`${isHero ? 'text-[28px]' : 'text-xl'} font-extrabold ${valueClassName} leading-tight`}>
        {value}
      </p>
      {subtitle && <p className="text-[11px] text-text-secondary mt-0.5">{subtitle}</p>}
      {delta !== undefined && (
        <div className={`flex items-center gap-0.5 mt-1.5 text-[11px] font-semibold ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
          {delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(delta)}% vs anterior
        </div>
      )}
    </div>
  );
}
