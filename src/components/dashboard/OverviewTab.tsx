import { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useProfile } from '@/hooks/useProfile';
import KPICard from './KPICard';
import { mockCampaigns, mockDailyData, mockHourlyData, mockGenderData, mockAgeData, mockPlatformData, getRoasColor, formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, ReferenceLine, Line, ComposedChart } from 'recharts';
import { HourlyBarChart } from './HourlyBarChart';
import { Inbox, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const chartColors = {
  primary: 'hsl(216, 91%, 64%)',
  secondary: 'hsl(250, 90%, 71%)',
  success: 'hsl(152, 72%, 44%)',
  warning: 'hsl(34, 87%, 53%)',
  destructive: 'hsl(349, 83%, 62%)',
  muted: 'hsl(218, 25%, 38%)',
};

const dailyMetricConfig: Record<string, { label: string; color: string; type: 'line' | 'bar'; yAxisId: 'left' | 'right' }> = {
  roas: { label: 'ROAS', color: chartColors.primary, type: 'line', yAxisId: 'right' },
  spend: { label: 'Gasto', color: chartColors.secondary, type: 'bar', yAxisId: 'left' },
  revenue: { label: 'Receita', color: chartColors.success, type: 'line', yAxisId: 'left' },
  ctr: { label: 'CTR', color: chartColors.warning, type: 'line', yAxisId: 'right' },
  sales: { label: 'Vendas', color: 'hsl(180, 60%, 50%)', type: 'bar', yAxisId: 'left' },
  cpm: { label: 'CPM', color: chartColors.destructive, type: 'line', yAxisId: 'right' },
};

export default function OverviewTab() {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(['roas', 'spend']));
  const { analysisData, selectedAccountId, currencySymbol } = useDashboard();
  const { isConnected } = useMetaConnection();
  const { analyze, loading } = useMetaData();
  const { profile } = useProfile();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = currencySymbol;

  const toggleMetric = (m: string) => {
    setVisibleMetrics(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  // Show empty state if account selected but no data
  if (selectedAccountId && !analysisData && isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
        <div className="w-20 h-20 rounded-2xl gradient-subtle flex items-center justify-center mb-6">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Pronto para analisar</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">Selecione um período e clique em Analisar para carregar os dados desta conta.</p>
        <Button
          onClick={() => analyze()}
          disabled={loading}
          className="h-11 px-8 text-sm gradient-primary text-primary-foreground gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analisando...</> : <><Zap className="w-4 h-4" />Analisar Agora</>}
        </Button>
      </div>
    );
  }

  // Use real or mock data (mock only when not connected)
  const campaigns = analysisData?.campaigns || (!isConnected ? mockCampaigns.map(c => ({
    ...c, purchases: c.sales, cpv: c.spend / c.sales,
  })) : []);
  const campaignsPrev = analysisData?.campaignsPrev || [];
  const dailyData = analysisData?.dailyData || (!isConnected ? mockDailyData : []);
  const hourlyData = analysisData?.hourlyData || (!isConnected ? mockHourlyData : []);
  const platformData = analysisData?.platformData || (!isConnected ? mockPlatformData : []);
  const genderData = analysisData?.genderData || (!isConnected ? mockGenderData : []);
  const ageData = analysisData?.ageData || (!isConnected ? mockAgeData : []);

  const normalizeStatus = (s: unknown) => String(s ?? '').trim().toUpperCase();

  // Only campaigns with real spend for aggregations (include paused if they had spend in the period)
  const activeCampaigns = campaigns.filter(c => c.spend > 0);

  // Plano de Ação: considerar SOMENTE campanhas realmente ativas
  const actionPlanCampaigns = campaigns.filter(c =>
    c.spend > 0 && normalizeStatus((c as any).status ?? (c as any).effective_status) === 'ACTIVE'
  );

  const totalSpend = activeCampaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = activeCampaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSales = activeCampaigns.reduce((s, c) => s + (('purchases' in c ? c.purchases : (c as any).sales) || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr = activeCampaigns.length > 0 ? activeCampaigns.reduce((s, c) => s + c.ctr, 0) / activeCampaigns.length : 0;
  const costPerSale = totalSales > 0 ? totalSpend / totalSales : 0;

  // Deltas from prev period — only campaigns with real spend
  const activePrev = campaignsPrev.filter(c => c.spend > 0);
  const prevSpend = activePrev.reduce((s, c) => s + c.spend, 0);
  const prevRevenue = activePrev.reduce((s, c) => s + c.revenue, 0);
  const prevSales = activePrev.reduce((s, c) => s + c.purchases, 0);
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
  const prevCtr = activePrev.length > 0 ? activePrev.reduce((s, c) => s + c.ctr, 0) / activePrev.length : 0;
  const prevCpv = prevSales > 0 ? prevSpend / prevSales : 0;

  // Fix #4: Only show delta when prev has meaningful data
  const calcDelta = (curr: number, prev: number): number | undefined => {
    if (!prev || prev === 0) return undefined;
    const d = Math.round(((curr - prev) / Math.abs(prev)) * 100);
    return d;
  };

  // Fix #1: Top 10 campaigns by spend, with full name in tooltip
  const top10Campaigns = [...activeCampaigns].sort((a, b) => b.spend - a.spend).slice(0, 10);
  const roasCampaignData = top10Campaigns.map(c => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
    fullName: c.name,
    roas: parseFloat(c.roas.toFixed(1)),
    fill: c.roas >= roasTarget * 1.2 ? chartColors.success : c.roas >= roasTarget ? chartColors.primary : c.roas >= roasTarget * 0.7 ? chartColors.warning : chartColors.destructive,
  }));

  const funnelData = [
    { name: 'Impressões', value: activeCampaigns.reduce((s, c) => s + c.impressions, 0) },
    { name: 'Cliques', value: activeCampaigns.reduce((s, c) => s + c.clicks, 0) },
    { name: 'Vendas', value: totalSales },
  ];

  // Plano de Ação: somente campanhas ACTIVE (ignora PAUSED)
  const actions = actionPlanCampaigns.map(c => {
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

  // Fix #3: Determine active metrics for chart
  const activeMetrics = visibleMetrics.size > 0 ? Array.from(visibleMetrics) : Object.keys(dailyMetricConfig);

  if (analysisData && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Sem dados para este período</h3>
        <p className="text-xs text-muted-foreground">Tente selecionar um período maior ou verifique se a conta possui campanhas ativas.</p>
      </div>
    );
  }

  // Custom tooltip for ROAS chart showing full name
  const RoasTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-[11px] text-foreground font-medium mb-0.5">{data.fullName}</p>
        <p className="text-[11px] text-muted-foreground">ROAS: <span className="text-foreground font-semibold">{data.roas}x</span></p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
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
        {/* Fix #1: ROAS por campanha — top 10, fixed height, full name tooltip */}
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">ROAS por Campanha <span className="text-muted-foreground font-normal">(top 10)</span></h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={roasCampaignData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(218,25%,38%)' }} width={90} />
              <Tooltip content={<RoasTooltip />} />
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
              const width = Math.max((item.value / maxVal) * 100, 15);
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

      {/* Fix #3: Daily chart — multi-metric with checkboxes and dual Y axis */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-foreground">Evolução Diária</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(dailyMetricConfig).map(([key, cfg]) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
                <Checkbox
                  checked={visibleMetrics.has(key)}
                  onCheckedChange={() => toggleMetric(key)}
                  className="h-3.5 w-3.5"
                />
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: cfg.color }} />
                  <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={dailyData}>
            <defs>
              {Object.entries(dailyMetricConfig).map(([key, cfg]) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.08} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(224,30%,16%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(218,25%,38%)' }} />
            <Tooltip contentStyle={{ background: 'hsl(228,20%,7%)', border: '1px solid hsl(224,30%,16%)', borderRadius: 8, fontSize: 11 }} />
            {activeMetrics.map(key => {
              const cfg = dailyMetricConfig[key];
              if (!cfg) return null;
              if (cfg.type === 'bar') {
                return <Bar key={key} dataKey={key} yAxisId={cfg.yAxisId} fill={cfg.color} fillOpacity={0.6} radius={[3, 3, 0, 0]} barSize={16} />;
              }
              return <Line key={key} type="monotone" dataKey={key} yAxisId={cfg.yAxisId} stroke={cfg.color} strokeWidth={2} dot={false} />;
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly */}
      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">Desempenho por Hora</h3>
        <HourlyBarChart data={hourlyData} currency={currency} />
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

      {/* Fix #2: Action plan — only campaigns with spend > 0 */}
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
