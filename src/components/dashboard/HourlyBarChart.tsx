import { Flame, Snowflake } from 'lucide-react';

interface HourlyBarChartProps {
  data: Array<{ hour: string; spend: number; [key: string]: any }>;
  emptyMessage?: string;
}

/**
 * Parse any hour format to a number 0-23.
 * Supports Meta API format: "14-15", "14:00", "14h", "14", etc.
 */
function parseHourToNumber(hour: string): number {
  const str = String(hour || '');
  // "14-15" → take first part "14"
  // "14:00" → take first part "14"  
  // "14h" → remove non-digits
  const cleaned = str.split('-')[0].split(':')[0].replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? -1 : num;
}

export function HourlyBarChart({ data, emptyMessage }: HourlyBarChartProps) {
  // Build a map from hour number → spend
  const hourMap = new Map<number, number>();
  
  if (data && data.length > 0) {
    data.forEach(d => {
      const h = parseHourToNumber(d.hour);
      if (h >= 0 && h <= 23) {
        hourMap.set(h, (hourMap.get(h) || 0) + (d.spend || 0));
      }
    });
  }

  const hasAnyData = Array.from(hourMap.values()).some(v => v > 0);

  // Show empty state message
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
  const fullHourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    spend: hourMap.get(i) || 0,
  }));

  const spends = fullHourlyData.map(h => h.spend);
  const maxSpend = Math.max(...spends, 0.01);
  const posSpends = spends.filter(s => s > 0);
  const minSpend = posSpends.length > 0 ? Math.min(...posSpends) : 0;
  const threshold60 = maxSpend * 0.6;

  const getBarStyle = (spend: number, isMax: boolean, isMin: boolean) => {
    if (spend <= 0) {
      return { color: 'bg-muted/40', heightPx: 6, emoji: null };
    }
    if (isMax) {
      return {
        color: 'bg-success brightness-125',
        heightPx: null,
        emoji: <Flame className="w-2.5 h-2.5 text-success absolute -top-3.5 left-1/2 -translate-x-1/2" />,
      };
    }
    if (spend >= threshold60) {
      return { color: 'bg-success', heightPx: null, emoji: null };
    }
    if (isMin) {
      return {
        color: 'bg-destructive',
        heightPx: null,
        emoji: <Snowflake className="w-2.5 h-2.5 text-destructive absolute -top-3.5 left-1/2 -translate-x-1/2" />,
      };
    }
    return { color: 'bg-muted-foreground/40', heightPx: null, emoji: null };
  };

  return (
    <div className="w-full h-[150px] flex items-end justify-between gap-[2px] pt-4">
      {fullHourlyData.map((item) => {
        const isMax = item.spend === maxSpend && item.spend > 0;
        const isMin = item.spend === minSpend && item.spend > 0 && item.spend < maxSpend;
        const style = getBarStyle(item.spend, isMax, isMin);
        const pct = item.spend > 0 ? (item.spend / maxSpend) * 100 : 0;
        const height = style.heightPx !== null ? `${style.heightPx}px` : `${Math.max(pct, 4)}%`;

        return (
          <div key={item.hour} className="flex-1 flex flex-col items-center gap-0.5 h-full">
            <div className="flex-1 w-full flex items-end justify-center relative">
              <div
                className={`w-full max-w-[14px] mx-auto ${style.color} rounded-t transition-all relative`}
                style={{ height }}
              >
                {style.emoji}
              </div>
            </div>
            <span className="text-[7px] text-muted-foreground font-mono leading-none">
              {item.hour}
            </span>
          </div>
        );
      })}
    </div>
  );
}
