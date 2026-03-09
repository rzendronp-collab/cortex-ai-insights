import { Flame, Snowflake } from 'lucide-react';

interface HourlyBarChartProps {
  data: Array<{ hour: string; spend: number }>;
}

export function HourlyBarChart({ data }: HourlyBarChartProps) {
  // Ensure we have all 24 hours (0-23)
  const fullHourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = `${i}h`;
    const existing = data.find(d => d.hour === hour);
    return {
      hour,
      spend: existing?.spend || 0,
    };
  });

  const spends = fullHourlyData.map(h => h.spend);
  const maxSpend = Math.max(...spends, 1);
  const minSpend = Math.min(...spends.filter(s => s > 0));
  
  // Calculate 60% threshold
  const threshold60 = maxSpend * 0.6;

  const getBarStyle = (spend: number) => {
    if (spend === 0) {
      // No data - minimal dark gray bar
      return {
        color: 'bg-muted/40',
        height: 8, // minimal height in pixels
        emoji: null,
      };
    }

    if (spend === maxSpend && maxSpend > 0) {
      // Highest spend - bright green + 🔥
      return {
        color: 'bg-success brightness-125',
        height: null, // use percentage
        emoji: <Flame className="w-2.5 h-2.5 text-success absolute -top-3 left-1/2 -translate-x-1/2" />,
      };
    }

    if (spend >= threshold60) {
      // Above 60% - normal green
      return {
        color: 'bg-success',
        height: null,
        emoji: null,
      };
    }

    if (spend === minSpend && minSpend > 0) {
      // Lowest spend - red + ❄️
      return {
        color: 'bg-destructive',
        height: null,
        emoji: <Snowflake className="w-2.5 h-2.5 text-destructive absolute -top-3 left-1/2 -translate-x-1/2" />,
      };
    }

    // Below 60% - gray
    return {
      color: 'bg-muted-foreground/40',
      height: null,
      emoji: null,
    };
  };

  return (
    <div className="w-full h-[150px] flex items-end justify-between gap-[2px] relative">
      {fullHourlyData.map((item) => {
        const style = getBarStyle(item.spend);
        const heightPercent = item.spend > 0 ? (item.spend / maxSpend) * 100 : 0;
        const actualHeight = style.height !== null ? style.height : `${Math.max(heightPercent, 3)}%`;

        return (
          <div key={item.hour} className="flex-1 flex flex-col items-center gap-1 relative">
            <div className="flex-1 w-full flex items-end relative">
              <div
                className={`w-full ${style.color} rounded-t transition-all relative`}
                style={{ height: actualHeight }}
              >
                {style.emoji}
              </div>
            </div>
            <span className="text-[8px] text-muted-foreground font-mono">
              {item.hour.replace('h', '')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
