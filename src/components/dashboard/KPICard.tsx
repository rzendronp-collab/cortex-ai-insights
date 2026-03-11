import { ArrowUp, ArrowDown } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: number;
  valueClassName?: string;
  isHero?: boolean;
  icon?: LucideIcon;
}

export default function KPICard({ label, value, subtitle, delta, valueClassName, isHero, icon: Icon }: KPICardProps) {
  const resolvedValueClass = valueClassName || 'text-[#F0F4FF]';

  return (
    <div className={`relative rounded-xl p-5 transition-all duration-150 group cursor-default border ${
      isHero
        ? 'bg-gradient-to-br from-[#4F8EF7]/[0.06] to-[#0E1420] border-[#4F8EF7]/20 hover:border-[#4F8EF7]/40'
        : 'bg-[#0E1420] border-[#1E2A42] hover:border-[#2A3A5C] hover:shadow-lg'
    }`}>
      {/* Delta badge */}
      {delta !== undefined && (
        <div className={`absolute top-4 right-4 flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
          delta >= 0
            ? 'text-[#22D07A] bg-[#22D07A]/10'
            : 'text-[#F05252] bg-[#F05252]/10'
        }`}>
          {delta >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {Math.abs(delta)}%
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-5 h-5 text-[#4F8EF7]" />}
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#4A5F7A] font-medium">{label}</p>
      </div>
      <p className={`font-display ${isHero ? 'text-[28px]' : 'text-[24px]'} font-bold ${resolvedValueClass} leading-none tracking-tight`}>
        {value}
      </p>
      {subtitle && <p className="text-[10px] text-[#4A5F7A] mt-2">{subtitle}</p>}
    </div>
  );
}
