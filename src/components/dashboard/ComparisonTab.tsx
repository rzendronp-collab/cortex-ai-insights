import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import { mockCampaigns, formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUp, ArrowDown, Inbox } from 'lucide-react';

const DATA_BLUE = '#4F8EF7';
const DATA_GREEN = '#22D07A';
const DATA_PURPLE = '#6C63FF';
const CHART_GRID = '#1E2A42';
const CHART_AXIS = '#4A5F7A';
const chartTooltipStyle: React.CSSProperties = {
  background: '#0E1420',
  border: '1px solid #4F8EF7',
  borderRadius: 8,
  fontSize: 11,
  color: '#F0F4FF',
  fontFamily: 'Inter, sans-serif',
  padding: '10px',
};

export default function ComparisonTab() {
  const { analysisData, currencySymbol } = useDashboard();
  const { profile } = useProfile();
  const currency = currencySymbol;

  const campaigns = analysisData?.campaigns || mockCampaigns.map(c => ({
    ...c, purchases: c.sales, cpv: c.spend / c.sales,
  }));
  const campaignsPrev = analysisData?.campaignsPrev || [];

  if (analysisData && campaigns.length === 0) {
    return (
      <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-text-muted mb-4" />
        <h3 className="text-sm font-semibold text-text-primary mb-1">Sem dados de comparação</h3>
        <p className="text-xs text-text-muted">Analise os dados primeiro clicando em Analisar.</p>
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
    if (previous === 0) return <span className="text-[10px] text-text-muted">--</span>;
    const delta = ((current - previous) / previous * 100);
    const isPositive = delta >= 0;
    return (
      <span
        className="text-[10px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded"
        style={{
          color: isPositive ? '#22D07A' : '#F05252',
          backgroundColor: isPositive ? 'rgba(34,208,122,0.1)' : 'rgba(240,82,82,0.1)',
        }}
      >
        {isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
        {Math.abs(delta).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Section title */}
      <div>
        <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">Comparação de Períodos</h3>
        <div className="h-px bg-[#1E2A42] mt-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {comparisonData.map((c, i) => (
          <div key={i} className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-4 animate-fade-up hover:border-[#4F8EF7]/30 transition-colors duration-200">
            <p className="text-sm font-semibold text-text-primary mb-3">{c.name}</p>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'ROAS', current: c['ROAS Atual'], prev: c['ROAS Anterior'], suffix: 'x' },
                { label: 'Gasto', current: c['Gasto Atual'], prev: c['Gasto Anterior'], prefix: currency },
                { label: 'Receita', current: c.revenue, prev: c.revenuePrev, prefix: currency },
                { label: 'CTR', current: c.ctr, prev: c.ctrPrev, suffix: '%' },
                { label: 'CPM', current: c.cpm, prev: c.cpmPrev, prefix: currency },
              ].map(m => (
                <div key={m.label}>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">{m.label}</p>
                  <p className="text-xs font-bold text-text-primary">{m.prefix ? m.prefix + ' ' : ''}{typeof m.current === 'number' ? m.current.toFixed(m.suffix === 'x' || m.suffix === '%' ? 1 : 0) : m.current}{m.suffix || ''}</p>
                  <Delta current={m.current} previous={m.prev} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Section title */}
      <div>
        <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">Gráficos Comparativos</h3>
        <div className="h-px bg-[#1E2A42] mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-5 animate-fade-up">
          <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-4">ROAS: Atual vs Anterior</h3>
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
        <div className="bg-[#0E1420] border border-[#1E2A42] rounded-xl p-5 animate-fade-up">
          <h3 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-4">Gasto: Atual vs Anterior</h3>
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
