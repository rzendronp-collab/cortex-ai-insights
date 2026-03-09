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
  peak: '#10B981',
  high: '#3B82F6',
  normal: '#8B5CF6',
  low: '#1E2D4A',
};

export function HourlyBarChart({ data, emptyMessage, currency = 'R$' }: HourlyBarChartProps) {
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
        <p className="text-[11px] text-muted-foreground text-center px-4">
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
      {/* Title */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">⏰ Desempenho por Hora</h3>
        <p className="text-[10px] text-muted-foreground">Distribuição de gasto e vendas nas 24h</p>
      </div>

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
              {/* Icon above bar */}
              {icon && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] z-10 leading-none">
                  {icon}
                </span>
              )}

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-lg px-2.5 py-2 shadow-lg whitespace-nowrap pointer-events-none">
                  <p className="text-[10px] font-semibold text-foreground mb-1">
                    {item.hour}h - {item.hour + 1}h
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Gasto: <span className="text-foreground font-medium">{currency} {item.spend.toFixed(2)}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Vendas: <span className="text-foreground font-medium">{item.sales} vendas</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    ROAS: <span className="font-medium" style={{ color: roas >= 1 ? BAR_COLORS.peak : '#ef4444' }}>{roas.toFixed(2)}x</span>
                  </p>
                </div>
              )}

              {/* Bar */}
              <div className="flex-1 w-full flex items-end justify-center relative">
                <div
                  className={`w-full max-w-[14px] mx-auto transition-all ${isHovered ? 'opacity-80 scale-x-110' : ''}`}
                  style={{
                    height,
                    borderRadius: '3px 3px 0 0',
                    backgroundColor: color,
                    boxShadow: item.spend === maxSpend && item.spend > 0
                      ? `0 0 8px ${BAR_COLORS.peak}66`
                      : undefined,
                  }}
                />
              </div>

              <span className="text-[7px] text-muted-foreground font-mono leading-none">
                {item.hour}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          🔥 Pico de investimento
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          💰 Alta performance
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          ❄️ Menor atividade
        </span>
      </div>
    </div>
  );
}
