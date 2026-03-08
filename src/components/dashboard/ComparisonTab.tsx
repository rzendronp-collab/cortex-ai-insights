import { mockCampaigns } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

const chartColors = {
  primary: 'hsl(216, 91%, 64%)',
  secondary: 'hsl(250, 90%, 71%)',
};

export default function ComparisonTab() {
  const comparisonData = mockCampaigns.map(c => ({
    name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
    'ROAS Atual': c.roas,
    'ROAS Anterior': +(c.roas * (0.7 + Math.random() * 0.5)).toFixed(1),
    'Gasto Atual': c.spend,
    'Gasto Anterior': +(c.spend * (0.8 + Math.random() * 0.4)).toFixed(0),
    revenue: c.revenue,
    revenuePrev: +(c.revenue * (0.75 + Math.random() * 0.4)).toFixed(0),
    ctr: c.ctr,
    ctrPrev: +(c.ctr * (0.8 + Math.random() * 0.4)).toFixed(1),
    cpm: c.cpm,
    cpmPrev: +(c.cpm * (0.8 + Math.random() * 0.4)).toFixed(1),
  }));

  const Delta = ({ current, previous }: { current: number; previous: number }) => {
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

      {/* Campaign comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {comparisonData.map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 animate-fade-up">
            <p className="text-sm font-semibold text-foreground mb-3">{c.name}</p>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'ROAS', current: c['ROAS Atual'], prev: c['ROAS Anterior'], suffix: 'x' },
                { label: 'Gasto', current: c['Gasto Atual'], prev: c['Gasto Anterior'], prefix: 'R$' },
                { label: 'Receita', current: c.revenue, prev: c.revenuePrev, prefix: 'R$' },
                { label: 'CTR', current: c.ctr, prev: c.ctrPrev, suffix: '%' },
                { label: 'CPM', current: c.cpm, prev: c.cpmPrev, prefix: 'R$' },
              ].map(m => (
                <div key={m.label}>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="text-xs font-bold text-foreground">{m.prefix || ''}{typeof m.current === 'number' ? m.current.toFixed(m.suffix === 'x' || m.suffix === '%' ? 1 : 0) : m.current}{m.suffix || ''}</p>
                  <Delta current={m.current} previous={m.prev} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
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
