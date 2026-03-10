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
  const resolvedValueClass = valueClassName || 'text-text-primary';

  return (
    <div className={`relative rounded-xl px-5 py-4 transition-all duration-150 group cursor-default ${
      isHero
        ? 'bg-gradient-to-br from-[#6366F1]/[0.08] to-[#111827] border border-[#6366F1]/20'
        : 'bg-[#111827] border border-[#1F2937] hover:border-[#374151] hover:shadow-card-hover'
    }`}>
      {/* Delta badge - top right */}
      {delta !== undefined && (
        <div className={`absolute top-3 right-3 flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
          delta >= 0
            ? 'text-[#10B981] bg-[#10B981]/10'
            : 'text-[#EF4444] bg-[#EF4444]/10'
        }`}>
          {delta >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {Math.abs(delta)}%
        </div>
      )}

      <p className="text-[10px] uppercase tracking-[0.08em] text-[#9CA3AF] font-medium mb-2">{label}</p>
      <p className={`${isHero ? 'text-[32px]' : 'text-xl'} font-bold ${resolvedValueClass} leading-none tracking-tight`}>
        {value}
      </p>
      {subtitle && <p className="text-[10px] text-[#6B7280] mt-1.5">{subtitle}</p>}
    </div>
  );
}
