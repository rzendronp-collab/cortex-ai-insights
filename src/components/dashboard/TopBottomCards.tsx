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

  const maxTopRoas = top3.length > 0 ? top3[0].roas! : 1;
  const maxBottomRoas = bottom3.length > 0 ? bottom3[0].roas! : 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top 3 */}
      <div className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#16A34A]" />
          <h3 className="text-[13px] font-semibold text-[#0F1523]">Top 3 Campanhas</h3>
        </div>
        <div className="space-y-2.5">
          {top3.map((c, i) => (
            <div key={i} className="flex flex-col gap-0">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-display font-bold text-[#5A6478] w-5">#{i + 1}</span>
                <span className="text-[12px] text-[#0F1523] font-medium truncate flex-1">{c.name.slice(0, 25)}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#16A34A]/10 text-[#16A34A]">{c.roas!.toFixed(1)}x</span>
                <span className="text-[10px] text-[#5A6478]">{currencySymbol}{c.spend.toFixed(0)}</span>
              </div>
              <div className="w-full h-[3px] rounded-full mt-1.5" style={{ background: '#E4E7EF' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((c.roas! / maxTopRoas) * 100, 100)}%`, background: '#16A34A' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom 3 */}
      <div className="bg-[#FFFFFF] border border-[#E4E7EF] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-[#DC2626]" />
          <h3 className="text-[13px] font-semibold text-[#0F1523]">Bottom 3 Campanhas</h3>
        </div>
        <div className="space-y-2.5">
          {bottom3.map((c, i) => (
            <div key={i} className="flex flex-col gap-0">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-display font-bold text-[#5A6478] w-5">#{i + 1}</span>
                <span className="text-[12px] text-[#0F1523] font-medium truncate flex-1">{c.name.slice(0, 25)}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#DC2626]/10 text-[#DC2626]">{c.roas!.toFixed(1)}x</span>
                <span className="text-[10px] text-[#5A6478]">{currencySymbol}{c.spend.toFixed(0)}</span>
              </div>
              <div className="w-full h-[3px] rounded-full mt-1.5" style={{ background: '#E4E7EF' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((c.roas! / maxBottomRoas) * 100, 100)}%`, background: '#DC2626' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
