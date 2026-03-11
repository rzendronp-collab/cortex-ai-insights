import React, { useId } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  /** Signed percentage, e.g. 4.2 → +4.2%, -1.8 → −1.8% */
  delta?: number;
  valueClassName?: string;
  /** Renders a subtle blue-tinted gradient background */
  isHero?: boolean;
  icon?: LucideIcon;
  sparklineData?: number[];
  /** Defaults to accent blue; override per card if needed */
  sparklineColor?: string;
}

// ---------------------------------------------------------------------------
// V5 palette tokens (literal values, not Tailwind classes)
// ---------------------------------------------------------------------------

const C = {
  bgCard:        '#0E1420',
  border:        '#1E2A42',
  borderHover:   '#2A3A5C',
  borderHero:    'rgba(79,142,247,0.25)',
  borderHeroHov: 'rgba(79,142,247,0.5)',
  heroGradStart: 'rgba(79,142,247,0.07)',
  textPrimary:   '#F0F4FF',
  textMuted:     '#7A8FAD',
  accent:        '#4F8EF7',
  green:         '#22D07A',
  greenBg:       'rgba(34,208,122,0.15)',
  red:           '#F05252',
  redBg:         'rgba(240,82,82,0.15)',
} as const;

// ---------------------------------------------------------------------------
// DeltaPill
// ---------------------------------------------------------------------------

function DeltaPill({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span
      className="inline-flex items-center gap-[3px] rounded-full px-2 py-[3px] text-[11px] font-semibold leading-none whitespace-nowrap"
      style={{
        background: positive ? C.greenBg : C.redBg,
        color:      positive ? C.green   : C.red,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {positive
        ? <ArrowUp   className="w-2.5 h-2.5 shrink-0" />
        : <ArrowDown className="w-2.5 h-2.5 shrink-0" />}
      {Math.abs(delta)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sparkline (Area with gradient fill)
// ---------------------------------------------------------------------------

function Sparkline({
  data,
  color,
  gradientId,
}: {
  data: number[];
  color: string;
  gradientId: string;
}) {
  const chartData = data.map(v => ({ v }));

  return (
    <div className="mt-2 h-[36px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.28} />
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

// ---------------------------------------------------------------------------
// KPICard
// ---------------------------------------------------------------------------

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
  // useId gives a stable, unique id per component instance → safe for SVG gradient
  const uid = useId();
  const gradientId = `kpi-grad-${uid.replace(/:/g, '')}`;

  const lineColor    = sparklineColor ?? C.accent;
  const hasSparkline = Array.isArray(sparklineData) && sparklineData.length >= 2;

  const borderDefault = isHero ? C.borderHero  : C.border;
  const borderHovered = isHero ? C.borderHeroHov : C.borderHover;

  return (
    <div
      className="relative flex flex-col rounded-2xl p-3 transition-colors duration-150 cursor-default"
      style={{
        background: isHero
          ? `linear-gradient(135deg, ${C.heroGradStart} 0%, ${C.bgCard} 100%)`
          : C.bgCard,
        border: `1px solid ${borderDefault}`,
      }}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLElement).style.borderColor = borderHovered)
      }
      onMouseLeave={e =>
        ((e.currentTarget as HTMLElement).style.borderColor = borderDefault)
      }
    >
      {/* ── Header: label + optional icon ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && (
            <Icon
              className="w-[14px] h-[14px] shrink-0"
              style={{ color: C.textMuted }}
            />
          )}
          <p
            className="text-[11px] uppercase tracking-[0.1em] truncate"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 500,
              color:      C.textMuted,
            }}
          >
            {label}
          </p>
        </div>

        {delta !== undefined && <DeltaPill delta={delta} />}
      </div>

      {/* ── KPI value ──────────────────────────────────────────────────────── */}
      <p
        className="leading-none tabular-nums"
        style={{
          fontFamily:    "'Space Grotesk', 'Inter', sans-serif",
          fontWeight:    700,
          fontSize:      isHero ? '2rem' : '1.75rem',
          color:         C.textPrimary,
          letterSpacing: '-0.025em',
        }}
      >
        {value}
      </p>

      {/* ── Optional subtitle ──────────────────────────────────────────────── */}
      {subtitle && (
        <p
          className="mt-1.5 text-[11px] leading-snug"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 400,
            color:      C.textMuted,
          }}
        >
          {subtitle}
        </p>
      )}

      {/* ── Sparkline ──────────────────────────────────────────────────────── */}
      {hasSparkline && (
        <Sparkline
          data={sparklineData!}
          color={lineColor}
          gradientId={gradientId}
        />
      )}
    </div>
  );
}
