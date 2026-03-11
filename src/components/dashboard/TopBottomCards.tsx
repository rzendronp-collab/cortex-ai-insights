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
      .filter(c => c.spend > 0)
      .map(c => ({ ...c, roas: c.revenue / c.spend }))
      .sort((a, b) => b.roas - a.roas);
    return {
      top3: withRoas.slice(0, 3),
      bottom3: withRoas.slice(-3).reverse(),
    };
  }, [campaigns]);

  if (campaigns.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top 3 */}
      <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#22D07A]" />
          <h3 className="text-[13px] font-semibold text-[#F0F4FF]">Top 3 Campanhas</h3>
        </div>
        <div className="space-y-2.5">
          {top3.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[12px] font-display font-bold text-[#4A5F7A] w-5">#{i + 1}</span>
              <span className="text-[12px] text-[#F0F4FF] font-medium truncate flex-1">{c.name.slice(0, 25)}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#22D07A]/10 text-[#22D07A]">{c.roas!.toFixed(1)}x</span>
              <span className="text-[10px] text-[#4A5F7A]">{currencySymbol}{c.spend.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom 3 */}
      <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-[#F05252]" />
          <h3 className="text-[13px] font-semibold text-[#F0F4FF]">Bottom 3 Campanhas</h3>
        </div>
        <div className="space-y-2.5">
          {bottom3.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[12px] font-display font-bold text-[#4A5F7A] w-5">#{i + 1}</span>
              <span className="text-[12px] text-[#F0F4FF] font-medium truncate flex-1">{c.name.slice(0, 25)}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F05252]/10 text-[#F05252]">{c.roas!.toFixed(1)}x</span>
              <span className="text-[10px] text-[#4A5F7A]">{currencySymbol}{c.spend.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
