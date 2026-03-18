import React, { useId } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

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

function DeltaPill({ delta }: { delta: number }) {
  const positive = delta >= 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold tabular-nums',
        positive
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          : 'border-red-500/20 bg-red-500/10 text-red-400',
      )}
    >
      {positive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(delta)}%
    </span>
  );
}

function Sparkline({ data, color, gradientId }: { data: number[]; color: string; gradientId: string }) {
  const chartData = data.map((value) => ({ value }));

  return (
    <div className="mt-4 h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function KPICard({
  label,
  value,
  subtitle,
  delta,
  valueClassName,
  isHero = false,
  icon: Icon,
  sparklineData,
  sparklineColor,
}: KPICardProps) {
  const uid = useId();
  const gradientId = `kpi-grad-${uid.replace(/:/g, '')}`;
  const lineColor = sparklineColor ?? 'hsl(var(--primary))';
  const hasSparkline = Array.isArray(sparklineData) && sparklineData.length >= 2;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[1.5rem] border border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-panel))] p-4 transition-all duration-200 md:p-5',
        isHero
          ? 'shadow-[0_24px_55px_-34px_hsl(var(--primary)/0.28)]'
          : 'hover:border-[hsl(var(--surface-edge)/0.1)] hover:shadow-[0_18px_40px_-34px_hsl(var(--foreground)/0.28)]',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          {Icon ? (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-elevated))] text-text-muted">
              <Icon className="size-4" />
            </span>
          ) : null}

          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
            {subtitle ? <p className="mt-1 truncate text-xs text-text-secondary">{subtitle}</p> : null}
          </div>
        </div>

        {delta !== undefined ? <DeltaPill delta={delta} /> : null}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p
          className={cn(
            'min-w-0 truncate font-mono leading-none tracking-[-0.04em] text-white tabular-nums',
            isHero ? 'text-[2rem] md:text-[2.4rem]' : 'text-[1.65rem] md:text-[1.85rem]',
            valueClassName,
          )}
        >
          {value}
        </p>
      </div>

      {hasSparkline ? <Sparkline data={sparklineData!} color={lineColor} gradientId={gradientId} /> : null}
    </div>
  );
}
