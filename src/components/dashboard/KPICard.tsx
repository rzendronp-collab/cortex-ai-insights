import React, { useId } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

// ── Types ───────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  /** Signed percentage, e.g. 4.2 → +4.2%, -1.8 → −1.8% */
  delta?: number;
  valueClassName?: string;
  /** Renders a subtle accent background */
  isHero?: boolean;
  icon?: LucideIcon;
  sparklineData?: number[];
  sparklineColor?: string;
}

// ── Palette tokens ──────────────────────────────────────────────────────────

const C = {
  bg:          '#FFFFFF',
  bgHero:      '#F5F8FF',
  border:      '#E4E7EF',
  borderHover: '#C9D0E0',
  borderHero:  '#C7D7FD',
  textPrimary: '#0F1523',
  textMuted:   '#9BA5B7',
  accent:      '#2563EB',
  green:       '#16A34A',
  greenBg:     '#F0FDF4',
  greenBorder: '#BBF7D0',
  red:         '#DC2626',
  redBg:       '#FEF2F2',
  redBorder:   '#FECACA',
} as const;

// ── DeltaPill ───────────────────────────────────────────────────────────────

function DeltaPill({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span
      className="inline-flex items-center gap-[3px] whitespace-nowrap"
      style={{
        fontSize: 11, fontWeight: 600, lineHeight: 1,
        fontFamily: "'DM Sans', sans-serif",
        background: positive ? C.greenBg : C.redBg,
        color:      positive ? C.green   : C.red,
        border:     `1px solid ${positive ? C.greenBorder : C.redBorder}`,
        borderRadius: 20, padding: '2px 7px',
      }}
    >
      {positive
        ? <ArrowUp   className="w-2.5 h-2.5 shrink-0" />
        : <ArrowDown className="w-2.5 h-2.5 shrink-0" />}
      {Math.abs(delta)}%
    </span>
  );
}

// ── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, color, gradientId }: { data: number[]; color: string; gradientId: string }) {
  const chartData = data.map(v => ({ v }));
  return (
    <div style={{ marginTop: 10, height: 36, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
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

// ── KPICard ─────────────────────────────────────────────────────────────────

export default function KPICard({
  label,
  value,
  subtitle,
  delta,
  isHero = false,
  icon: Icon,
  sparklineData,
  sparklineColor,
}: KPICardProps) {
  const uid        = useId();
  const gradientId = `kpi-grad-${uid.replace(/:/g, '')}`;
  const lineColor  = sparklineColor ?? C.accent;
  const hasSparkline = Array.isArray(sparklineData) && sparklineData.length >= 2;

  return (
    <div
      className="relative flex flex-col cursor-default"
      style={{
        background:   isHero ? C.bgHero : C.bg,
        border:       `1px solid ${isHero ? C.borderHero : C.border}`,
        borderRadius: 10,
        padding:      '16px 20px',
        transition:   'all 150ms ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = isHero ? '#A5C0F8' : C.borderHover;
        el.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.06)';
        el.style.transform   = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = isHero ? C.borderHero : C.border;
        el.style.boxShadow   = 'none';
        el.style.transform   = 'translateY(0)';
      }}
    >
      {/* Header: label + icon */}
      <div className="flex items-start justify-between gap-2" style={{ marginBottom: 10 }}>
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon style={{ width: 13, height: 13, color: C.textMuted, flexShrink: 0 }} />}
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600, fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: C.textMuted,
          }} className="truncate">
            {label}
          </p>
        </div>
        {delta !== undefined && <DeltaPill delta={delta} />}
      </div>

      {/* KPI value — DM Mono */}
      <p
        className="leading-none tabular-nums"
        style={{
          fontFamily:    "'DM Mono', monospace",
          fontWeight:    isHero ? 700 : 600,
          fontSize:      isHero ? 36 : 28,
          color:         C.textPrimary,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </p>

      {/* Optional subtitle */}
      {subtitle && (
        <p style={{ marginTop: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.textMuted }}>
          {subtitle}
        </p>
      )}

      {/* Sparkline */}
      {hasSparkline && (
        <Sparkline data={sparklineData!} color={lineColor} gradientId={gradientId} />
      )}
    </div>
  );
}
