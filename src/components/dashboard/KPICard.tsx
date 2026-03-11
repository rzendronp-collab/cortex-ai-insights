import { ArrowUp, ArrowDown } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: number;
  valueClassName?: string;
  isHero?: boolean;
  icon?: LucideIcon;
  sparklineData?: number[];
  sparklineColor?: string;
}

export default function KPICard({ label, value, subtitle, delta, valueClassName, isHero, icon: Icon, sparklineData, sparklineColor = '#4F8EF7' }: KPICardProps) {
  const resolvedValueClass = valueClassName || 'text-[#F0F4FF]';

  const chartData = sparklineData?.map(v => ({ v }));

  return (
    <div className={`relative rounded-xl p-4 transition-all duration-150 group cursor-default border ${
      isHero
        ? 'bg-gradient-to-br from-[#4F8EF7]/[0.06] to-[#0E1420] border-[#4F8EF7]/20 hover:border-[#4F8EF7]/40'
        : 'bg-[#0E1420] border-[#1E2A42] hover:border-[#2A3A5C]'
    }`}>
      {/* Delta badge */}
      {delta !== undefined && (
        <div className={`absolute top-3 right-3 inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
          delta >= 0
            ? 'text-[#22D07A] bg-[#22D07A]/10'
            : 'text-[#F05252] bg-[#F05252]/10'
        }`}>
          {delta >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {Math.abs(delta)}%
        </div>
      )}

      <p className="text-[10px] font-semibold text-[#4A5F7A] uppercase tracking-wider mb-2">{label}</p>
      <p className={`font-display font-bold ${isHero ? 'text-[28px]' : 'text-[24px]'} ${resolvedValueClass} leading-none mb-1`}>
        {value}
      </p>
      {subtitle && <p className="text-[10px] text-[#4A5F7A] mt-1">{subtitle}</p>}

      {/* Sparkline */}
      {chartData && chartData.length >= 2 && (
        <div className="mt-3 h-[40px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={sparklineColor}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
