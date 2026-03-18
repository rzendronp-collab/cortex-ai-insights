import { useDashboard } from '@/context/DashboardContext';
import { mockCampaigns } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUp, ArrowDown, Inbox } from 'lucide-react';

const DATA_BLUE = '#2563EB';
const DATA_GREEN = '#16A34A';
const DATA_PURPLE = '#7C3AED';
const CHART_GRID = 'hsl(var(--chart-grid-dark))';
const CHART_AXIS = 'hsl(var(--chart-axis-dark))';
const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: 'hsl(var(--tooltip-surface))',
  border: '1px solid hsl(var(--tooltip-edge))',
  borderRadius: 8,
  fontSize: 11,
  color: '#E2E8F0',
  padding: '10px 12px',
};

export default function ComparisonTab() {
  const { analysisData, currencySymbol } = useDashboard();
  const currency = currencySymbol;

  const campaigns = analysisData?.campaigns || mockCampaigns.map((c) => ({
    ...c,
    purchases: c.sales,
    cpv: c.spend / c.sales,
  }));
  const campaignsPrev = analysisData?.campaignsPrev || [];

  if (analysisData && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[hsl(var(--surface-edge)/0.05)] bg-[hsl(var(--surface-panel))] py-20 text-center">
        <Inbox className="mb-4 h-12 w-12 text-text-muted" />
        <h3 className="mb-1 text-sm font-semibold text-white">Sem dados de comparação</h3>
        <p className="text-xs text-text-muted">Analise os dados primeiro clicando em Analisar.</p>
      </div>
    );
  }

  const comparisonData = campaigns.map((c) => {
    const prev = campaignsPrev.find((p) => p.id === c.id);
    return {
      name: c.name.length > 15 ? `${c.name.slice(0, 15)}...` : c.name,
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
    if (previous === 0) return <span className="text-[10px] text-text-muted">--</span>;
    const delta = (current - previous) / previous * 100;
    const isPositive = delta >= 0;
    return (
      <span
        className={isPositive
          ? 'inline-flex items-center gap-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400'
          : 'inline-flex items-center gap-0.5 rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400'}
      >
        {isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
        {Math.abs(delta).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Comparação de Períodos</h3>
        <div className="mt-2 h-px bg-[hsl(var(--surface-edge)/0.06)]" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {comparisonData.map((c, i) => (
          <div key={i} className="animate-fade-up rounded-xl border border-[hsl(var(--surface-edge)/0.05)] bg-[hsl(var(--surface-panel))] p-4 transition-colors duration-200 hover:border-primary/30">
            <p className="mb-3 text-sm font-semibold text-white">{c.name}</p>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'ROAS', current: c['ROAS Atual'], prev: c['ROAS Anterior'], suffix: 'x' },
                { label: 'Gasto', current: c['Gasto Atual'], prev: c['Gasto Anterior'], prefix: currency },
                { label: 'Receita', current: c.revenue, prev: c.revenuePrev, prefix: currency },
                { label: 'CTR', current: c.ctr, prev: c.ctrPrev, suffix: '%' },
                { label: 'CPM', current: c.cpm, prev: c.cpmPrev, prefix: currency },
              ].map((m) => (
                <div key={m.label}>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">{m.label}</p>
                  <p className="text-xs font-bold text-white">
                    {m.prefix ? `${m.prefix} ` : ''}
                    {typeof m.current === 'number' ? m.current.toFixed(m.suffix === 'x' || m.suffix === '%' ? 1 : 0) : m.current}
                    {m.suffix || ''}
                  </p>
                  <Delta current={m.current} previous={m.prev} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Gráficos Comparativos</h3>
        <div className="mt-2 h-px bg-[hsl(var(--surface-edge)/0.06)]" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="animate-fade-up rounded-xl border border-[hsl(var(--surface-edge)/0.05)] bg-[hsl(var(--surface-panel))] p-5">
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-text-muted">ROAS: Atual vs Anterior</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, color: CHART_AXIS }} />
              <Bar dataKey="ROAS Atual" fill={DATA_BLUE} radius={[6, 6, 0, 0]} />
              <Bar dataKey="ROAS Anterior" fill={DATA_PURPLE} radius={[6, 6, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="animate-fade-up rounded-xl border border-[hsl(var(--surface-edge)/0.05)] bg-[hsl(var(--surface-panel))] p-5">
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Gasto: Atual vs Anterior</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, color: CHART_AXIS }} />
              <Bar dataKey="Gasto Atual" fill={DATA_BLUE} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Gasto Anterior" fill={DATA_PURPLE} radius={[6, 6, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
