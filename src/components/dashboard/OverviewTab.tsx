import { useState } from 'react';
import KPICard from './KPICard';
import { mockCampaigns, mockDailyData, mockHourlyData, mockGenderData, mockAgeData, mockPlatformData, getRoasColor, getRecommendation } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, PieChart, Pie, Cell, ReferenceLine } from 'recharts';

const chartColors = {
  primary: 'hsl(216, 91%, 64%)',
  secondary: 'hsl(250, 90%, 71%)',
  success: 'hsl(152, 72%, 44%)',
  warning: 'hsl(34, 87%, 53%)',
  destructive: 'hsl(349, 83%, 62%)',
  muted: 'hsl(218, 25%, 38%)',
};

const roasTarget = 3.0;

export default function OverviewTab() {
  const [dailyMetric, setDailyMetric] = useState('roas');
  const totalSpend = mockCampaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = mockCampaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSales = mockCampaigns.reduce((s, c) => s + c.sales, 0);
  const avgRoas = totalRevenue / totalSpend;
  const avgCtr = mockCampaigns.reduce((s, c) => s + c.ctr, 0) / mockCampaigns.length;
  const costPerSale = totalSpend / totalSales;

  const roasCampaignData = mockCampaigns.map(c => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
    roas: c.roas,
    fill: c.roas >= roasTarget * 1.2 ? chartColors.success : c.roas >= roasTarget ? chartColors.primary : c.roas >= roasTarget * 0.7 ? chartColors.warning : chartColors.destructive,
  }));

  const funnelData = [
    { name: 'Impressões', value: mockCampaigns.reduce((s, c) => s + c.impressions, 0) },
    { name: 'Cliques', value: mockCampaigns.reduce((s, c) => s + c.clicks, 0) },
    { name: 'Vendas', value: totalSales },
  ];

  const actions = mockCampaigns.map(c => {
    const rec = getRecommendation(c);
    return { ...c, recommendation: rec };
  }).sort((a, b) => {
    const order = { '⏸ Pausar': 0, '⚠ Zero Vendas': 1, '🔧 Otimizar': 2, '🚀 Escalar': 3 };
    return (order[a.recommendation.label as keyof typeof order] ?? 4) - (order[b.recommendation.label as keyof typeof order] ?? 4);
  });

  const dailyMetrics = ['roas', 'spend', 'revenue', 'ctr', 'sales'] as const;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="ROAS" value={`${avgRoas.toFixed(1)}x`} subtitle="Retorno sobre investimento" delta={12} valueClassName={getRoasColor(avgRoas)} isHero />
        <KPICard label="Investido" value={`R$ ${(totalSpend / 1000).toFixed(1)}k`} subtitle="Período selecionado" delta={-5} />
        <KPICard label="Receita" value={`R$ ${(totalRevenue / 1000).toFixed(1)}k`} subtitle="Total gerado" delta={18} valueClassName="text-success" />
        <KPICard label="Vendas" value={totalSales.toString()} subtitle="Conversões" delta={8} />
        <KPICard label="CTR Médio" value={`${avgCtr.toFixed(1)}%`} subtitle="Taxa de cliques" delta={3} />
        <KPICard label="Custo/Venda" value={`R$ ${costPerSale.toFixed(2)}`} subtitle="CPV médio" delta={-7} valueClassName="text-warning" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ROAS por campanha */}
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">ROAS por Campanha</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roasCampaignData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(218,25%,38%)' }} width={90} />
              <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
              <ReferenceLine x={roasTarget} stroke={chartColors.muted} strokeDasharray="5 5" label={{ value: 'Meta', fontSize: 9, fill: chartColors.muted }} />
              <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
                {roasCampaignData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funil */}
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">Funil de Conversão</h3>
          <div className="space-y-3 mt-4">
        {funnelData.map((item, i) => {
              const maxVal = funnelData[0].value;
              const width = Math.max((item.value / maxVal) * 100, 3);
              const rate = i > 0 ? ((item.value / funnelData[i - 1].value) * 100).toFixed(1) : null;
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-secondary">{item.name}</span>
                    <span className="text-foreground font-semibold">{item.value.toLocaleString()}</span>
                  </div>
                  <div className="h-7 bg-muted rounded-md overflow-hidden">
                    <div className="h-full gradient-primary rounded-md transition-all" style={{ width: `${width}%` }} />
                  </div>
                  {rate && <p className="text-[10px] text-primary mt-0.5">{i === 1 ? 'CTR' : 'CVR'}: {rate}%</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Origem tráfego */}
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">Origem do Tráfego</h3>
          <div className="space-y-2.5 mt-2">
            {mockPlatformData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: [chartColors.primary, chartColors.secondary, chartColors.warning, chartColors.muted][i] }} />
                <span className="text-[11px] text-text-secondary flex-1">{p.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.value}%`, background: [chartColors.primary, chartColors.secondary, chartColors.warning, chartColors.muted][i] }} />
                </div>
                <span className="text-[11px] text-foreground font-semibold w-8 text-right">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground">Evolução Diária</h3>
          <div className="flex gap-1">
            {dailyMetrics.map(m => (
              <button key={m} onClick={() => setDailyMetric(m)} className={`px-2 py-1 text-[10px] rounded-md ${dailyMetric === m ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground bg-muted'}`}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={mockDailyData}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            <Area type="monotone" dataKey={dailyMetric} stroke={chartColors.primary} fill="url(#areaGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">Desempenho por Hora</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={mockHourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(218,25%,38%)' }} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="spend" radius={[3, 3, 0, 0]}>
              {mockHourlyData.map((entry, i) => <Cell key={i} fill={entry.isPeak ? chartColors.primary : 'hsl(224,30%,20%)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">Gênero</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={mockGenderData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                {mockGenderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {mockGenderData.map(g => (
              <span key={g.name} className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{g.value}%</span> {g.name}</span>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">Faixa Etária</h3>
          <div className="space-y-2.5 mt-2">
            {mockAgeData.map(a => (
              <div key={a.age} className="flex items-center gap-2">
                <span className="text-[10px] text-text-secondary w-10">{a.age}</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full gradient-primary rounded-full" style={{ width: `${a.percentage}%` }} />
                </div>
                <span className="text-[10px] text-foreground font-semibold w-7 text-right">{a.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">Gasto vs Receita</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={[{ name: 'Gasto', value: totalSpend }, { name: 'Receita', value: totalRevenue }]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                <Cell fill={chartColors.destructive} />
                <Cell fill={chartColors.success} />
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            <span className="text-[10px] text-muted-foreground"><span className="text-destructive font-semibold">R$ {(totalSpend / 1000).toFixed(1)}k</span> Gasto</span>
            <span className="text-[10px] text-muted-foreground"><span className="text-success font-semibold">R$ {(totalRevenue / 1000).toFixed(1)}k</span> Receita</span>
          </div>
        </div>
      </div>

      {/* Action plan */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">🎯 Plano de Ação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {actions.map(a => (
            <div key={a.id} className={`border rounded-lg p-3 ${a.recommendation.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold ${a.recommendation.color}`}>{a.recommendation.label}</span>
                <span className="text-[10px] text-muted-foreground">ROAS {a.roas}x</span>
              </div>
              <p className="text-xs text-foreground font-medium">{a.name}</p>
              <p className="text-[10px] text-text-secondary mt-1">
                Gasto R$ {a.spend.toFixed(0)} • {a.sales} vendas • CTR {a.ctr}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
