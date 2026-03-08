import { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import KPICard from './KPICard';
import { mockCampaigns, mockDailyData, mockHourlyData, mockGenderData, mockAgeData, mockPlatformData, getRoasColor, getRecommendation, formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { Inbox } from 'lucide-react';

const chartColors = {
  primary: 'hsl(216, 91%, 64%)',
  secondary: 'hsl(250, 90%, 71%)',
  success: 'hsl(152, 72%, 44%)',
  warning: 'hsl(34, 87%, 53%)',
  destructive: 'hsl(349, 83%, 62%)',
  muted: 'hsl(218, 25%, 38%)',
};

const dailyMetricLabels: Record<string, string> = {
  roas: 'ROAS',
  spend: 'Gasto',
  revenue: 'Receita',
  ctr: 'CTR',
  sales: 'Vendas',
  cpm: 'CPM',
};

export default function OverviewTab() {
  const [dailyMetric, setDailyMetric] = useState('roas');
  const { analysisData } = useDashboard();
  const { profile } = useProfile();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = profile?.currency || 'R$';

  // Use real or mock data
  const campaigns = analysisData?.campaigns || mockCampaigns.map(c => ({
    ...c, purchases: c.sales, cpv: c.spend / c.sales,
  }));
  const campaignsPrev = analysisData?.campaignsPrev || [];
  const dailyData = analysisData?.dailyData || mockDailyData;
  const hourlyData = analysisData?.hourlyData || mockHourlyData;
  const platformData = analysisData?.platformData || mockPlatformData;
  const genderData = analysisData?.genderData || mockGenderData;
  const ageData = analysisData?.ageData || mockAgeData;

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSales = campaigns.reduce((s, c) => s + (('purchases' in c ? c.purchases : (c as any).sales) || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.ctr, 0) / campaigns.length : 0;
  const costPerSale = totalSales > 0 ? totalSpend / totalSales : 0;

  // Deltas from prev period
  const prevSpend = campaignsPrev.reduce((s, c) => s + c.spend, 0);
  const prevRevenue = campaignsPrev.reduce((s, c) => s + c.revenue, 0);
  const prevSales = campaignsPrev.reduce((s, c) => s + c.purchases, 0);
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
  const prevCtr = campaignsPrev.length > 0 ? campaignsPrev.reduce((s, c) => s + c.ctr, 0) / campaignsPrev.length : 0;
  const prevCpv = prevSales > 0 ? prevSpend / prevSales : 0;

  const calcDelta = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : undefined;

  const roasCampaignData = campaigns.map(c => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
    roas: parseFloat(c.roas.toFixed(1)),
    fill: c.roas >= roasTarget * 1.2 ? chartColors.success : c.roas >= roasTarget ? chartColors.primary : c.roas >= roasTarget * 0.7 ? chartColors.warning : chartColors.destructive,
  }));

  const funnelData = [
    { name: 'Impressões', value: campaigns.reduce((s, c) => s + c.impressions, 0) },
    { name: 'Cliques', value: campaigns.reduce((s, c) => s + c.clicks, 0) },
    { name: 'Vendas', value: totalSales },
  ];

  const actions = campaigns.map(c => {
    const roas = c.roas;
    const rec = roas >= roasTarget * 1.5
      ? { label: '🚀 Escalar', color: 'text-success', bg: 'bg-success/10 border-success/20' }
      : roas >= roasTarget
        ? { label: '🔧 Otimizar', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' }
        : roas > 0
          ? { label: '⚠ Atenção', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' }
          : { label: '⏸ Pausar', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
    return { ...c, recommendation: rec, purchases: 'purchases' in c ? c.purchases : (c as any).sales };
  }).sort((a, b) => {
    const order: Record<string, number> = { '⏸ Pausar': 0, '⚠ Atenção': 1, '🔧 Otimizar': 2, '🚀 Escalar': 3 };
    return (order[a.recommendation.label] ?? 4) - (order[b.recommendation.label] ?? 4);
  });

  const dailyMetrics = Object.keys(dailyMetricLabels);

  if (analysisData && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Sem dados para este período</h3>
        <p className="text-xs text-muted-foreground">Tente selecionar um período maior ou verifique se a conta possui campanhas ativas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="ROAS" value={`${avgRoas.toFixed(1)}x`} subtitle="Retorno sobre investimento" delta={calcDelta(avgRoas, prevRoas)} valueClassName={getRoasColor(avgRoas, roasTarget)} isHero />
        <KPICard label="Investido" value={formatCurrency(totalSpend, currency)} subtitle="Período selecionado" delta={calcDelta(totalSpend, prevSpend)} />
        <KPICard label="Receita" value={formatCurrency(totalRevenue, currency)} subtitle="Total gerado" delta={calcDelta(totalRevenue, prevRevenue)} valueClassName="text-success" />
        <KPICard label="Vendas" value={totalSales.toString()} subtitle="Conversões" delta={calcDelta(totalSales, prevSales)} />
        <KPICard label="CTR Médio" value={`${avgCtr.toFixed(1)}%`} subtitle="Taxa de cliques" delta={calcDelta(avgCtr, prevCtr)} />
        <KPICard label="Custo/Venda" value={`${currency} ${costPerSale.toFixed(2)}`} subtitle="CPV médio" delta={calcDelta(costPerSale, prevCpv)} valueClassName="text-warning" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ROAS por campanha */}
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">ROAS por Campanha</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, roasCampaignData.length * 32)}>
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
              const maxVal = funnelData[0].value || 1;
              const width = Math.max((item.value / maxVal) * 100, 15); // min 15% width
              const rate = i > 0 ? ((item.value / (funnelData[i - 1].value || 1)) * 100).toFixed(1) : null;
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">{item.name}</span>
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
            {platformData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: [chartColors.primary, chartColors.secondary, chartColors.warning, chartColors.muted][i % 4] }} />
                <span className="text-[11px] text-muted-foreground flex-1 capitalize">{p.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p.value}%`, background: [chartColors.primary, chartColors.secondary, chartColors.warning, chartColors.muted][i % 4] }} />
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
                {dailyMetricLabels[m]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            <Area type="monotone" dataKey={dailyMetric} stroke="#4F8EF7" fill="url(#areaGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">Desempenho por Hora</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(218,25%,38%)' }} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="spend" radius={[3, 3, 0, 0]}>
              {hourlyData.map((entry, i) => <Cell key={i} fill={entry.isPeak ? chartColors.primary : 'hsl(224,30%,20%)'} />)}
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
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {genderData.map(g => (
              <span key={g.name} className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{g.value}%</span> {g.name}</span>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">Faixa Etária</h3>
          <div className="space-y-2.5 mt-2">
            {ageData.map(a => (
              <div key={a.age} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-10">{a.age}</span>
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
            <span className="text-[10px] text-muted-foreground"><span className="text-destructive font-semibold">{formatCurrency(totalSpend, currency)}</span> Gasto</span>
            <span className="text-[10px] text-muted-foreground"><span className="text-success font-semibold">{formatCurrency(totalRevenue, currency)}</span> Receita</span>
          </div>
        </div>
      </div>

      {/* Action plan */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">🎯 Plano de Ação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {actions.map(a => (
            <div key={a.id} className={`border rounded-lg p-3 ${a.recommendation.bg} border-l-[3px] ${a.recommendation.label.includes('Pausar') ? 'border-l-destructive' : a.recommendation.label.includes('Atenção') ? 'border-l-warning' : a.recommendation.label.includes('Otimizar') ? 'border-l-primary' : 'border-l-success'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold ${a.recommendation.color}`}>{a.recommendation.label}</span>
                <span className="text-[10px] text-muted-foreground">ROAS {a.roas.toFixed(1)}x</span>
              </div>
              <p className="text-xs text-foreground font-medium truncate">{a.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Gasto {currency} {a.spend.toFixed(0)} • {a.purchases} vendas • CTR {a.ctr.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
