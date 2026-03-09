import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import { mockCampaigns, formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUp, ArrowDown, Inbox } from 'lucide-react';

const chartColors = {
  primary: 'hsl(216, 91%, 64%)',
  secondary: 'hsl(250, 90%, 71%)',
};

export default function ComparisonTab() {
  const { analysisData } = useDashboard();
  const { profile } = useProfile();
  const currency = currencySymbol;

  const campaigns = analysisData?.campaigns || mockCampaigns.map(c => ({
    ...c, purchases: c.sales, cpv: c.spend / c.sales,
  }));
  const campaignsPrev = analysisData?.campaignsPrev || [];

  if (analysisData && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Sem dados de comparação</h3>
        <p className="text-xs text-muted-foreground">Analise os dados primeiro clicando em Analisar.</p>
      </div>
    );
  }

  const comparisonData = campaigns.map(c => {
    const prev = campaignsPrev.find(p => p.id === c.id);
    return {
      name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
      'ROAS Atual': parseFloat(c.roas.toFixed(1)),
      'ROAS Anterior': prev ? parseFloat(prev.roas.toFixed(1)) : 0,
      'Gasto Atual': c.spend,
      'Gasto Anterior': prev ? prev.spend : 0,
      revenue: c.revenue,
      revenuePrev: prev ? prev.revenue : 0,
      ctr: c.ctr,
      ctrPrev: prev ? prev.ctr : 0,
      cpm: c.cpm,
      cpmPrev: prev ? prev.cpm : 0,
    };
  });

  const Delta = ({ current, previous }: { current: number; previous: number }) => {
    if (previous === 0) return <span className="text-[10px] text-muted-foreground">--</span>;
    const delta = ((current - previous) / previous * 100);
    return (
      <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
        {delta >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
        {Math.abs(delta).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Período atual vs período anterior</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {comparisonData.map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 animate-fade-up">
            <p className="text-sm font-semibold text-foreground mb-3">{c.name}</p>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'ROAS', current: c['ROAS Atual'], prev: c['ROAS Anterior'], suffix: 'x' },
                { label: 'Gasto', current: c['Gasto Atual'], prev: c['Gasto Anterior'], prefix: currency },
                { label: 'Receita', current: c.revenue, prev: c.revenuePrev, prefix: currency },
                { label: 'CTR', current: c.ctr, prev: c.ctrPrev, suffix: '%' },
                { label: 'CPM', current: c.cpm, prev: c.cpmPrev, prefix: currency },
              ].map(m => (
                <div key={m.label}>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="text-xs font-bold text-foreground">{m.prefix ? m.prefix + ' ' : ''}{typeof m.current === 'number' ? m.current.toFixed(m.suffix === 'x' || m.suffix === '%' ? 1 : 0) : m.current}{m.suffix || ''}</p>
                  <Delta current={m.current} previous={m.prev} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">ROAS: Atual vs Anterior</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(218,25%,38%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
              <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="ROAS Atual" fill={chartColors.primary} radius={[3, 3, 0, 0]} />
              <Bar dataKey="ROAS Anterior" fill={chartColors.secondary} radius={[3, 3, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">Gasto: Atual vs Anterior</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(218,25%,38%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
              <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Gasto Atual" fill={chartColors.primary} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gasto Anterior" fill={chartColors.secondary} radius={[3, 3, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
