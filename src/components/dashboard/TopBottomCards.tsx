import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Campaign {
  name: string;
  spend: number;
  revenue: number;
  roas?: number;
}

interface Props {
  campaigns: Campaign[];
  currencySymbol: string;
}

export default function TopBottomCards({ campaigns, currencySymbol }: Props) {
  const { top3, bottom3 } = useMemo(() => {
    const withRoas = campaigns
      .filter((c) => c.spend > 0)
      .map((c) => ({ ...c, roas: c.revenue / c.spend }))
      .sort((a, b) => b.roas - a.roas);
    return {
      top3: withRoas.slice(0, 3),
      bottom3: withRoas.slice(-3).reverse(),
    };
  }, [campaigns]);

  if (campaigns.length === 0) return null;

  const maxTopRoas = top3.length > 0 ? top3[0].roas! : 1;
  const maxBottomRoas = bottom3.length > 0 ? bottom3[0].roas! : 1;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-panel))] p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <h3 className="text-[13px] font-semibold text-white">Top 3 Campanhas</h3>
        </div>
        <div className="space-y-2.5">
          {top3.map((c, i) => (
            <div key={i} className="flex flex-col gap-0">
              <div className="flex items-center gap-3">
                <span className="w-5 text-[12px] font-bold text-text-muted">#{i + 1}</span>
                <span className="flex-1 truncate text-[12px] font-medium text-white">{c.name.slice(0, 25)}</span>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">{c.roas!.toFixed(1)}x</span>
                <span className="text-[10px] text-text-muted">{currencySymbol}{c.spend.toFixed(0)}</span>
              </div>
              <div className="mt-1.5 h-[3px] w-full rounded-full bg-[hsl(var(--chart-grid-dark))]">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min((c.roas! / maxTopRoas) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-panel))] p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-400" />
          <h3 className="text-[13px] font-semibold text-white">Bottom 3 Campanhas</h3>
        </div>
        <div className="space-y-2.5">
          {bottom3.map((c, i) => (
            <div key={i} className="flex flex-col gap-0">
              <div className="flex items-center gap-3">
                <span className="w-5 text-[12px] font-bold text-text-muted">#{i + 1}</span>
                <span className="flex-1 truncate text-[12px] font-medium text-white">{c.name.slice(0, 25)}</span>
                <span className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400">{c.roas!.toFixed(1)}x</span>
                <span className="text-[10px] text-text-muted">{currencySymbol}{c.spend.toFixed(0)}</span>
              </div>
              <div className="mt-1.5 h-[3px] w-full rounded-full bg-[hsl(var(--chart-grid-dark))]">
                <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min((c.roas! / maxBottomRoas) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
