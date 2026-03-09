import { useState } from 'react';
import { Flame, Snowflake } from 'lucide-react';

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

export function HourlyBarChart({ data, emptyMessage, currency = 'R$' }: HourlyBarChartProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Build maps from hour number → spend + sales
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

  // Build full 24-hour array
  const fullData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    spend: hourSpend.get(i) || 0,
    sales: hourSales.get(i) || 0,
  }));

  const spends = fullData.map(h => h.spend);
  const maxSpend = Math.max(...spends, 0.01);
  const posSpends = spends.filter(s => s > 0);
  const minSpend = posSpends.length > 0 ? Math.min(...posSpends) : 0;
  const threshold60 = maxSpend * 0.6;

  // Hour with most sales
  const maxSales = Math.max(...fullData.map(h => h.sales), 0);

  const getBarStyle = (spend: number, isMax: boolean, isMin: boolean) => {
    if (spend <= 0) {
      return { color: 'bg-muted/40', heightPx: 6, icon: null };
    }
    if (isMax) {
      return {
        color: 'bg-success brightness-125',
        heightPx: null,
        icon: <Flame className="w-2.5 h-2.5 text-success absolute -top-3.5 left-1/2 -translate-x-1/2" />,
      };
    }
    if (spend >= threshold60) {
      return { color: 'bg-success', heightPx: null, icon: null };
    }
    if (isMin) {
      return {
        color: 'bg-destructive',
        heightPx: null,
        icon: <Snowflake className="w-2.5 h-2.5 text-destructive absolute -top-3.5 left-1/2 -translate-x-1/2" />,
      };
    }
    return { color: 'bg-muted-foreground/40', heightPx: null, icon: null };
  };

  return (
    <div className="space-y-2">
      {/* Chart area */}
      <div className="w-full h-[150px] flex items-end justify-between gap-[2px] pt-5">
        {fullData.map((item) => {
          const isMax = item.spend === maxSpend && item.spend > 0;
          const isMin = item.spend === minSpend && item.spend > 0 && item.spend < maxSpend;
          const isTopSales = item.sales > 0 && item.sales === maxSales;
          const hasSales = item.sales > 0;
          const style = getBarStyle(item.spend, isMax, isMin);
          const pct = item.spend > 0 ? (item.spend / maxSpend) * 100 : 0;
          const height = style.heightPx !== null ? `${style.heightPx}px` : `${Math.max(pct, 4)}%`;
          const roas = item.spend > 0 ? (item.sales > 0 ? (item.sales / item.spend) : null) : null;
          const isHovered = hoveredHour === item.hour;

          return (
            <div
              key={item.hour}
              className="flex-1 flex flex-col items-center gap-0.5 h-full relative"
              onMouseEnter={() => setHoveredHour(item.hour)}
              onMouseLeave={() => setHoveredHour(null)}
            >
              {/* Sales label above bar */}
              {hasSales && (
                <span
                  className={`absolute top-0 text-[7px] font-bold leading-none z-10 ${isTopSales ? 'text-success' : 'text-muted-foreground'}`}
                  style={{ top: '-1px' }}
                >
                  {item.sales}v
                </span>
              )}

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-lg px-2 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
                  <p className="text-[10px] font-semibold text-foreground mb-0.5">{item.hour}h–{item.hour + 1}h</p>
                  <p className="text-[10px] text-muted-foreground">Gasto: <span className="text-foreground font-medium">{currency} {item.spend.toFixed(2)}</span></p>
                  <p className="text-[10px] text-muted-foreground">Vendas: <span className="text-foreground font-medium">{item.sales}</span></p>
                  {roas !== null && (
                    <p className="text-[10px] text-muted-foreground">ROAS: <span className="text-success font-medium">{(item.sales / item.spend * 1).toFixed(2)}x</span></p>
                  )}
                </div>
              )}

              {/* Bar column */}
              <div className="flex-1 w-full flex items-end justify-center relative">
                <div
                  className={`w-full max-w-[14px] mx-auto ${style.color} transition-all relative ${hasSales ? 'border-t-2 border-t-success' : ''} ${isHovered ? 'opacity-80' : ''}`}
                  style={{
                    height,
                    borderRadius: '3px 3px 0 0',
                    boxShadow: isTopSales ? '0 -2px 6px hsl(var(--success) / 0.5)' : undefined,
                  }}
                >
                  {style.icon}
                </div>
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
          <Flame className="w-2.5 h-2.5 text-success" /> Maior gasto
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="text-[9px]">💰</span> Maior conversão
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Snowflake className="w-2.5 h-2.5 text-destructive" /> Menor gasto
        </span>
      </div>
    </div>
  );
}
