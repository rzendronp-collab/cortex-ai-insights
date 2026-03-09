import { useDashboard } from '@/context/DashboardContext';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useProfile } from '@/hooks/useProfile';
import { getRoasColor, formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Inbox } from 'lucide-react';

export default function ConsolidatedTab() {
  const { analysisData, currencySymbol } = useDashboard();
  const { adAccounts } = useMetaConnection();
  const { profile } = useProfile();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = currencySymbol;

  // If we have real data, show for current account
  const campaigns = analysisData?.campaigns || [];

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Sem dados consolidados</h3>
        <p className="text-xs text-muted-foreground">Analise os dados primeiro clicando em Analisar.</p>
      </div>
    );
  }

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSales = campaigns.reduce((s, c) => s + c.purchases, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const chartData = campaigns
    .filter(c => c.spend > 0)
    .map(c => ({
      name: c.name.length > 20 ? c.name.slice(0, 20) + '...' : c.name,
      roas: parseFloat(c.roas.toFixed(1)),
    }));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <p className="text-[10px] text-muted-foreground uppercase">ROAS Total</p>
          <p className={`text-2xl font-extrabold ${getRoasColor(avgRoas, roasTarget)}`}>{avgRoas.toFixed(1)}x</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <p className="text-[10px] text-muted-foreground uppercase">Vendas Total</p>
          <p className="text-2xl font-extrabold text-foreground">{totalSales}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <p className="text-[10px] text-muted-foreground uppercase">Gasto Total</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalSpend, currency)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <p className="text-[10px] text-muted-foreground uppercase">Receita Total</p>
          <p className="text-xl font-bold text-success">{formatCurrency(totalRevenue, currency)}</p>
        </div>
      </div>

      {/* ROAS by campaign chart */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">ROAS por Campanha</h3>
        <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 30)}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(218,25%,38%)' }} width={120} />
            <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            <ReferenceLine x={roasTarget} stroke="hsl(218,25%,38%)" strokeDasharray="5 5" label={{ value: 'Meta', fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
              {chartData.map((a, i) => {
                const fill = a.roas >= roasTarget * 1.2 ? 'hsl(152, 72%, 44%)' : a.roas >= roasTarget ? 'hsl(216, 91%, 64%)' : 'hsl(349, 83%, 62%)';
                return <Cell key={i} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Campaign detail table */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">Detalhes por Campanha</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Campanha</th>
                <th className="text-right py-2 text-muted-foreground font-medium">ROAS</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Gasto</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Receita</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Vendas</th>
                <th className="text-right py-2 text-muted-foreground font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.filter(c => c.spend > 0).map(c => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="py-2 text-foreground font-medium truncate max-w-[200px]">{c.name}</td>
                  <td className={`py-2 text-right font-bold ${getRoasColor(c.roas, roasTarget)}`}>{c.roas.toFixed(1)}x</td>
                  <td className="py-2 text-right text-foreground">{formatCurrency(c.spend, currency)}</td>
                  <td className="py-2 text-right text-success">{formatCurrency(c.revenue, currency)}</td>
                  <td className="py-2 text-right text-foreground">{c.purchases}</td>
                  <td className="py-2 text-right text-foreground">{c.ctr.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
