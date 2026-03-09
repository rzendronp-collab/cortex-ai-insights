import { useState } from 'react';

interface HourlyBarChartProps {
  data: Array<{ hour: string; spend: number; sales?: number; [key: string]: any }>;
  emptyMessage?: string;
  currency?: string;
}

function parseHourToNumber(hour: string): number {
  const str = String(hour || '');
  const cleaned = str.split('-')[0].split(':')[0].replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? -1 : num;
}

const BAR_COLORS = {
  peak: '#34D399',
  high: '#60A5FA',
  normal: '#A78BFA',
  low: '#232D45',
};

export function HourlyBarChart({ data, emptyMessage, currency = '€' }: HourlyBarChartProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const hourSpend = new Map<number, number>();
  const hourSales = new Map<number, number>();

  if (data && data.length > 0) {
    data.forEach(d => {
      const h = parseHourToNumber(d.hour);
      if (h >= 0 && h <= 23) {
        hourSpend.set(h, (hourSpend.get(h) || 0) + (d.spend || 0));
        hourSales.set(h, (hourSales.get(h) || 0) + (d.sales || 0));
      }
    });
  }

  const hasAnyData = Array.from(hourSpend.values()).some(v => v > 0);

  if (!hasAnyData) {
    return (
      <div className="h-[150px] flex items-center justify-center">
        <p className="text-[11px] text-text-muted text-center px-4">
          {emptyMessage || 'Dados horários não disponíveis para este período'}
        </p>
      </div>
    );
  }

  const fullData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    spend: hourSpend.get(i) || 0,
    sales: hourSales.get(i) || 0,
  }));

  const maxSpend = Math.max(...fullData.map(h => h.spend), 0.01);

  const getBarColor = (spend: number): string => {
    if (spend <= 0) return BAR_COLORS.low;
    if (spend === maxSpend) return BAR_COLORS.peak;
    if (spend >= maxSpend * 0.7) return BAR_COLORS.high;
    if (spend < maxSpend * 0.2) return BAR_COLORS.low;
    return BAR_COLORS.normal;
  };

  const getBarIcon = (spend: number): string | null => {
    if (spend === maxSpend && spend > 0) return '🔥';
    if (spend > 0 && spend < maxSpend * 0.2) return '❄️';
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="w-full h-[150px] flex items-end justify-between gap-[2px] pt-5">
        {fullData.map((item) => {
          const pct = item.spend > 0 ? (item.spend / maxSpend) * 100 : 0;
          const height = item.spend <= 0 ? '6px' : `${Math.max(pct, 4)}%`;
          const color = getBarColor(item.spend);
          const icon = getBarIcon(item.spend);
          const isHovered = hoveredHour === item.hour;
          const roas = item.spend > 0 ? (item.sales / item.spend) : 0;

          return (
            <div
              key={item.hour}
              className="flex-1 flex flex-col items-center gap-0.5 h-full relative"
              onMouseEnter={() => setHoveredHour(item.hour)}
              onMouseLeave={() => setHoveredHour(null)}
            >
              {icon && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] z-10 leading-none">
                  {icon}
                </span>
              )}

              {isHovered && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-chart-tooltip-bg border border-chart-tooltip-border rounded-lg px-2.5 py-2 shadow-xl whitespace-nowrap pointer-events-none">
                  <p className="text-[10px] font-semibold text-text-primary mb-1">
                    {item.hour}h - {item.hour + 1}h
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    Gasto: <span className="text-text-primary font-medium">{currency} {item.spend.toFixed(2)}</span>
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    Vendas: <span className="text-text-primary font-medium">{item.sales} vendas</span>
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    ROAS: <span className="font-medium" style={{ color: roas >= 1 ? BAR_COLORS.peak : '#F87171' }}>{roas.toFixed(2)}x</span>
                  </p>
                </div>
              )}

              <div className="flex-1 w-full flex items-end justify-center relative">
                <div
                  className={`w-full max-w-[14px] mx-auto transition-all duration-150 ${isHovered ? 'opacity-80 scale-x-110' : ''}`}
                  style={{
                    height,
                    borderRadius: '4px 4px 0 0',
                    backgroundColor: color,
                    boxShadow: item.spend === maxSpend && item.spend > 0
                      ? `0 0 12px ${BAR_COLORS.peak}44`
                      : undefined,
                  }}
                />
              </div>

              <span className="text-[7px] text-text-muted font-mono leading-none">
                {item.hour}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <span className="flex items-center gap-1 text-[9px] text-text-muted">🔥 Pico</span>
        <span className="flex items-center gap-1 text-[9px] text-text-muted">💰 Alta performance</span>
        <span className="flex items-center gap-1 text-[9px] text-text-muted">❄️ Menor atividade</span>
      </div>
    </div>
  );
}
