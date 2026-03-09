import { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useProfile } from '@/hooks/useProfile';
import KPICard from './KPICard';
import { mockCampaigns, mockDailyData, mockHourlyData, mockGenderData, mockAgeData, mockPlatformData, getRoasColor, formatCurrency, formatNumber } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, ReferenceLine, Line, ComposedChart, Legend } from 'recharts';
import { HourlyBarChart } from './HourlyBarChart';
import { Inbox, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// ─── Chart theme constants ───
const CHART_GRID = '#1A2235';
const CHART_AXIS = '#475569';
const TOOLTIP_BG = '#1E2D45';
const TOOLTIP_BORDER = '#4F8EF7';

const DATA_BLUE = '#60A5FA';
const DATA_GREEN = '#34D399';
const DATA_RED = '#F87171';
const DATA_YELLOW = '#FBBF24';
const DATA_PURPLE = '#A78BFA';
const MUTED = '#475569';

const chartTooltipStyle = {
  background: TOOLTIP_BG,
  border: `1px solid ${TOOLTIP_BORDER}`,
  borderRadius: 8,
  fontSize: 11,
  color: '#F1F5F9',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  padding: '10px 12px',
};

const dailyMetricConfig: Record<string, { label: string; color: string; type: 'line' | 'bar'; yAxisId: 'left' | 'right' }> = {
  roas: { label: 'ROAS', color: DATA_BLUE, type: 'line', yAxisId: 'right' },
  spend: { label: 'Gasto', color: DATA_PURPLE, type: 'bar', yAxisId: 'left' },
  revenue: { label: 'Receita', color: DATA_GREEN, type: 'line', yAxisId: 'left' },
  ctr: { label: 'CTR', color: DATA_YELLOW, type: 'line', yAxisId: 'right' },
  sales: { label: 'Vendas', color: 'hsl(180, 60%, 50%)', type: 'bar', yAxisId: 'left' },
  cpm: { label: 'CPM', color: DATA_RED, type: 'line', yAxisId: 'right' },
};

export default function OverviewTab() {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(['roas', 'spend']));
  const { analysisData, isStale, selectedAccountId, currencySymbol, setActiveTab, analyzeRef } = useDashboard();
  const { isConnected, connectMeta } = useMetaConnection();
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

  // No account selected empty state
  if (!selectedAccountId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="text-[80px] leading-none mb-6 opacity-[0.15] select-none">📊</div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Selecione uma conta</h3>
        <p className="text-sm text-text-muted mb-6 max-w-xs">
          Escolha uma conta no header para ver os dados
        </p>
        {!isConnected && (
          <Button
            onClick={() => connectMeta()}
            className="h-11 px-8 text-sm bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white hover:opacity-90 rounded-lg gap-2 font-semibold"
          >
            Conectar Meta
          </Button>
        )}
      </div>
    );
  }

  // Account selected but loading/no data
  if (selectedAccountId && !analysisData && isConnected) {
    if (loading) {
      return <OverviewSkeleton />;
    }
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-data-blue/10 flex items-center justify-center mb-6">
          <Zap className="w-10 h-10 text-data-blue" />
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-2">Pronto para analisar</h3>
        <p className="text-sm text-text-secondary mb-6 max-w-xs">Selecione um período e clique em Analisar para carregar os dados desta conta.</p>
        <Button
          onClick={() => analyze()}
          disabled={loading}
          className="h-11 px-8 text-sm gradient-blue text-white gap-2"
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
  const demoByGender = analysisData?.demoByGender || [];
  const demoByAge = analysisData?.demoByAge || [];

  const normalizeStatus = (s: unknown) => String(s ?? '').trim().toUpperCase();

  const activeCampaigns = campaigns.filter(c => c.spend > 0);
  const actionPlanCampaigns = campaigns.filter(c =>
    c.spend > 0 && normalizeStatus((c as any).status ?? (c as any).effective_status) === 'ACTIVE'
  );

  const totalSpend = activeCampaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = activeCampaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSales = activeCampaigns.reduce((s, c) => s + (('purchases' in c ? c.purchases : (c as any).sales) || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr = activeCampaigns.length > 0 ? activeCampaigns.reduce((s, c) => s + c.ctr, 0) / activeCampaigns.length : 0;
  const costPerSale = totalSales > 0 ? totalSpend / totalSales : 0;

  const activePrev = campaignsPrev.filter(c => c.spend > 0);
  const prevSpend = activePrev.reduce((s, c) => s + c.spend, 0);
  const prevRevenue = activePrev.reduce((s, c) => s + c.revenue, 0);
  const prevSales = activePrev.reduce((s, c) => s + c.purchases, 0);
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
  const prevCtr = activePrev.length > 0 ? activePrev.reduce((s, c) => s + c.ctr, 0) / activePrev.length : 0;
  const prevCpv = prevSales > 0 ? prevSpend / prevSales : 0;

  const calcDelta = (curr: number, prev: number): number | undefined => {
    if (!prev || prev === 0) return undefined;
    const d = Math.round(((curr - prev) / Math.abs(prev)) * 100);
    return d;
  };

  const top10Campaigns = [...activeCampaigns].sort((a, b) => b.spend - a.spend).slice(0, 10);
  const roasCampaignData = top10Campaigns.map(c => ({
    name: c.name.length > 16 ? c.name.slice(0, 16) + '…' : c.name,
    fullName: c.name,
    roas: parseFloat(c.roas.toFixed(1)),
    fill: c.roas >= roasTarget ? DATA_GREEN : DATA_RED,
  }));

  const funnelData = [
    { name: 'Impressões', value: activeCampaigns.reduce((s, c) => s + c.impressions, 0), color: DATA_BLUE },
    { name: 'Cliques', value: activeCampaigns.reduce((s, c) => s + c.clicks, 0), color: DATA_PURPLE },
    { name: 'Vendas', value: totalSales, color: DATA_GREEN },
  ];

  const actions = (() => {
    // Active campaigns with spend > 0 get normal recommendations
    const withSpend = actionPlanCampaigns.map(c => {
      const roas = c.roas;
      const rec = roas >= roasTarget * 1.5
        ? { label: '🚀 Escalar', color: 'text-data-green', bg: 'bg-data-green/10 border-data-green/20' }
        : roas >= roasTarget
          ? { label: '🔧 Otimizar', color: 'text-data-blue', bg: 'bg-data-blue/10 border-data-blue/20' }
          : roas > 0
            ? { label: '⚠ Atenção', color: 'text-data-yellow', bg: 'bg-data-yellow/10 border-data-yellow/20' }
            : { label: '⏸ Pausar', color: 'text-data-red', bg: 'bg-data-red/10 border-data-red/20' };
      return { ...c, recommendation: rec, purchases: 'purchases' in c ? c.purchases : (c as any).sales };
    });
    // Active campaigns with zero spend get a "no spend" warning
    const zeroSpendActive = campaigns
      .filter(c => c.spend === 0 && normalizeStatus((c as any).status ?? (c as any).effective_status) === 'ACTIVE')
      .map(c => ({
        ...c,
        recommendation: { label: '👻 Sem gasto', color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-600/30' },
        purchases: 0,
      }));
    return [...withSpend, ...zeroSpendActive].sort((a, b) => {
      const order: Record<string, number> = { '👻 Sem gasto': 0, '⏸ Pausar': 1, '⚠ Atenção': 2, '🔧 Otimizar': 3, '🚀 Escalar': 4 };
      return (order[a.recommendation.label] ?? 5) - (order[b.recommendation.label] ?? 5);
    });
  })();

  const activeMetrics = visibleMetrics.size > 0 ? Array.from(visibleMetrics) : Object.keys(dailyMetricConfig);

  if (analysisData && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-text-muted mb-4" />
        <h3 className="text-sm font-semibold text-text-primary mb-1">Sem dados para este período</h3>
        <p className="text-xs text-text-secondary">Tente selecionar um período maior ou verifique se a conta possui campanhas ativas.</p>
      </div>
    );
  }

  // Custom ROAS tooltip
  const RoasTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTooltipStyle} className="rounded-lg shadow-xl">
        <p className="text-[11px] text-text-primary font-medium mb-0.5">{data.fullName}</p>
        <p className="text-[11px] text-text-secondary">ROAS: <span className="text-text-primary font-semibold">{data.roas}x</span></p>
      </div>
    );
  };

  // Determine ROAS hero color class
  const roasValueClass = avgRoas >= roasTarget ? 'text-data-green' : 'text-data-red';

  return (
    <div className="space-y-4">
      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "ROAS", value: `${avgRoas.toFixed(1)}x`, subtitle: "Retorno sobre investimento", delta: calcDelta(avgRoas, prevRoas), valueClassName: roasValueClass, isHero: true },
          { label: "Investido", value: formatCurrency(totalSpend, currency), subtitle: "Período selecionado", delta: calcDelta(totalSpend, prevSpend) },
          { label: "Receita", value: formatCurrency(totalRevenue, currency), subtitle: "Total gerado", delta: calcDelta(totalRevenue, prevRevenue), valueClassName: "text-data-green" },
          { label: "Vendas", value: totalSales.toString(), subtitle: "Conversões", delta: calcDelta(totalSales, prevSales) },
          { label: "CTR Médio", value: `${avgCtr.toFixed(1)}%`, subtitle: "Taxa de cliques", delta: calcDelta(avgCtr, prevCtr) },
          { label: "Custo/Venda", value: `${currency} ${costPerSale.toFixed(2)}`, subtitle: "CPV médio", delta: calcDelta(costPerSale, prevCpv), valueClassName: "text-data-yellow" },
        ].map((kpi, i) => (
          <div key={kpi.label} style={{ animationDelay: `${i * 50}ms` }} className="animate-fade-in opacity-0 [animation-fill-mode:forwards]">
            <KPICard {...kpi} />
          </div>
        ))}
      </div>

      {/* ─── Charts Row 1 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ROAS por Campanha */}
        <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-in opacity-0 [animation-fill-mode:forwards]" style={{ animationDelay: '200ms' }}>
          <h3 className="text-xs font-semibold text-text-primary mb-4">ROAS por Campanha <span className="text-text-muted font-normal">(top 10)</span></h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roasCampaignData} layout="vertical" barSize={28}>
              <defs>
                <linearGradient id="barGreen" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={DATA_GREEN} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={DATA_GREEN} stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="barRed" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={DATA_RED} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={DATA_RED} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: CHART_AXIS }} width={85} axisLine={false} tickLine={false} />
              <Tooltip content={<RoasTooltip />} />
              <ReferenceLine x={roasTarget} stroke={MUTED} strokeDasharray="5 5" label={{ value: 'Meta', fontSize: 9, fill: MUTED }} />
              <Bar dataKey="roas" radius={[0, 6, 6, 0]} animationDuration={800} label={{ position: 'right', fontSize: 10, fill: '#F1F5F9', formatter: (v: number) => `${v}x` }}>
                {roasCampaignData.map((entry, i) => (
                  <Cell key={i} fill={entry.roas >= roasTarget ? 'url(#barGreen)' : 'url(#barRed)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funil de Conversão */}
        <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up" style={{ minHeight: 180 }}>
          <h3 className="text-xs font-semibold text-text-primary mb-3">Funil de Conversão</h3>
          <div className="space-y-3">
            {funnelData.map((item, i) => {
              const maxVal = funnelData[0].value || 1;
              const width = Math.max((item.value / maxVal) * 100, 15);
              const rate = i > 0 ? ((item.value / (funnelData[i - 1].value || 1)) * 100).toFixed(1) : null;
              return (
                <div key={item.name} className="animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-secondary">{item.name}</span>
                    <span className="text-[14px] text-text-primary font-bold">{item.value.toLocaleString()}</span>
                  </div>
                  <div className="h-7 bg-bg-base rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500 absolute left-0 top-0"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                      }}
                    />
                  </div>
                  {rate && <p className="text-[10px] mt-0.5 font-medium" style={{ color: item.color }}>{i === 1 ? 'CTR' : 'CVR'}: {rate}%</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Origem tráfego */}
        <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up">
          <h3 className="text-xs font-semibold text-text-primary mb-4">Origem do Tráfego</h3>
          <div className="space-y-3 mt-2">
            {platformData.map((p, i) => {
              const colors = [DATA_BLUE, DATA_PURPLE, DATA_YELLOW, MUTED];
              const c = colors[i % colors.length];
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                  <span className="text-[11px] text-text-secondary flex-1 capitalize">{p.name}</span>
                  <div className="flex-1 h-2 bg-bg-base rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.value}%`, background: c }} />
                  </div>
                  <span className="text-[11px] text-text-primary font-semibold w-8 text-right">{p.value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Gasto vs Receita (Area Chart) ─── */}
      <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up">
        <h3 className="text-xs font-semibold text-text-primary mb-4">Gasto vs Receita</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="gradSpendArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DATA_BLUE} stopOpacity={0.15} />
                <stop offset="95%" stopColor={DATA_BLUE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRevenueArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DATA_GREEN} stopOpacity={0.15} />
                <stop offset="95%" stopColor={DATA_GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v < 1 ? v.toFixed(2) : String(Math.round(v))} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Area type="monotone" dataKey="spend" stroke={DATA_BLUE} strokeWidth={2} fill="url(#gradSpendArea)" dot={{ r: 3, fill: DATA_BLUE, strokeWidth: 2, stroke: '#161D2E' }} />
            <Area type="monotone" dataKey="revenue" stroke={DATA_GREEN} strokeWidth={2} fill="url(#gradRevenueArea)" dot={{ r: 3, fill: DATA_GREEN, strokeWidth: 2, stroke: '#161D2E' }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2">
          <span className="flex items-center gap-2 text-[11px] text-text-secondary"><span className="w-3 h-[2px] rounded-full inline-block" style={{ background: DATA_BLUE }} /> Gasto</span>
          <span className="flex items-center gap-2 text-[11px] text-text-secondary"><span className="w-3 h-[2px] rounded-full inline-block" style={{ background: DATA_GREEN }} /> Receita</span>
        </div>
      </div>

      {/* ─── Daily Evolution ─── */}
      <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up" style={{ minHeight: 320 }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-text-primary">Evolução Diária</h3>
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
                  <span className="text-[10px] text-text-secondary">{cfg.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dailyData}>
            <defs>
              {Object.entries(dailyMetricConfig).map(([key, cfg]) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} />
            {activeMetrics.map(key => {
              const cfg = dailyMetricConfig[key];
              if (!cfg) return null;
              if (cfg.type === 'bar') {
                return <Bar key={key} dataKey={key} yAxisId={cfg.yAxisId} fill={cfg.color} fillOpacity={0.6} radius={[4, 4, 0, 0]} barSize={16} />;
              }
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  yAxisId={cfg.yAxisId}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: cfg.color, strokeWidth: 2, stroke: '#161D2E' }}
                  activeDot={{ r: 6, fill: cfg.color, strokeWidth: 2, stroke: '#161D2E' }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Hourly ─── */}
      <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up">
        <h3 className="text-xs font-semibold text-text-primary mb-4">Desempenho por Hora</h3>
        <HourlyBarChart data={hourlyData} currency={currency} />
      </div>

      {/* ─── Demographics Section ─── */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">👥 Demográficos</h3>
        {demoByGender.length === 0 && demoByAge.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
              <p className="text-xs text-muted-foreground text-center">Dados demográficos não disponíveis para esta conta</p>
            </div>
            <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
              <p className="text-xs text-muted-foreground text-center">Dados demográficos não disponíveis para esta conta</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* CARD 1 — Por Gênero */}
            <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up">
              <h4 className="text-xs font-semibold text-text-primary mb-4">Por Gênero</h4>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0" style={{ width: 140, height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demoByGender.map(g => ({ name: g.name, value: g.spend, fill: g.fill }))}
                        cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                        dataKey="value" strokeWidth={0}
                      >
                        {demoByGender.map((g, i) => <Cell key={i} fill={g.fill} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: number) => formatCurrency(value, currency)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5">
                  {demoByGender.map(g => (
                    <div key={g.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.fill }} />
                      <span className="text-[11px] text-text-secondary">{g.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Gender table */}
              <div className="mt-4 border-t border-[#2A3850] pt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-text-muted uppercase">
                      <th className="text-left py-1 font-semibold">Gênero</th>
                      <th className="text-right py-1 font-semibold">Gasto</th>
                      <th className="text-right py-1 font-semibold">Vendas</th>
                      <th className="text-right py-1 font-semibold">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoByGender.map(g => (
                      <tr key={g.name} className="border-t border-[#2A3850]/50">
                        <td className="py-1.5 text-text-primary font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.fill }} />
                          {g.name}
                        </td>
                        <td className="py-1.5 text-right text-text-primary">{formatCurrency(g.spend, currency)}</td>
                        <td className="py-1.5 text-right text-text-primary">{g.purchases}</td>
                        <td className="py-1.5 text-right">
                          <span className={`font-bold ${g.roas >= roasTarget ? 'text-data-green' : g.roas >= roasTarget * 0.7 ? 'text-data-yellow' : 'text-data-red'}`}>
                            {g.roas.toFixed(2)}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARD 2 — Por Faixa Etária */}
            <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up">
              <h4 className="text-xs font-semibold text-text-primary mb-4">Por Faixa Etária</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={demoByAge} layout="vertical" margin={{ top: 0, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: CHART_AXIS }} tickFormatter={(v) => formatCurrency(v, currency)} />
                  <YAxis type="category" dataKey="age" tick={{ fontSize: 10, fill: '#94A3B8' }} width={45} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number, name: string) => [formatCurrency(value, currency), 'Gasto']}
                    labelFormatter={(label) => `Faixa: ${label}`}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={chartTooltipStyle} className="rounded-lg shadow-xl">
                          <p className="text-[11px] font-medium text-text-primary mb-1">Faixa: {d.age}</p>
                          <p className="text-[10px] text-text-secondary">Gasto: <span className="text-text-primary font-semibold">{formatCurrency(d.spend, currency)}</span></p>
                          <p className="text-[10px] text-text-secondary">ROAS: <span className={`font-bold ${d.roas >= roasTarget ? 'text-data-green' : 'text-data-red'}`}>{d.roas.toFixed(2)}x</span></p>
                          <p className="text-[10px] text-text-secondary">Vendas: <span className="text-text-primary font-semibold">{d.purchases}</span></p>
                        </div>
                      );
                    }}
                  />
                  <defs>
                    <linearGradient id="ageGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={DATA_BLUE} />
                      <stop offset="100%" stopColor={DATA_PURPLE} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="spend" fill="url(#ageGradient)" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ─── Gasto vs Receita ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up">
          <h3 className="text-xs font-semibold text-text-primary mb-4">Gasto vs Receita</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={[{ name: 'Gasto', value: totalSpend }, { name: 'Receita', value: totalRevenue }]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                <Cell fill={DATA_BLUE} />
                <Cell fill={DATA_GREEN} />
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            <span className="text-[10px] text-text-secondary"><span className="text-data-blue font-semibold">{formatCurrency(totalSpend, currency)}</span> Gasto</span>
            <span className="text-[10px] text-text-secondary"><span className="text-data-green font-semibold">{formatCurrency(totalRevenue, currency)}</span> Receita</span>
          </div>
        </div>
      </div>

      {/* ─── Action Plan Summary (top 3) ─── */}
      <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl p-5 animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-primary">🎯 Plano de Ação</h3>
          <button onClick={() => setActiveTab('action-plan')} className="text-[11px] text-data-blue hover:underline cursor-pointer font-medium">
            Ver todas →
          </button>
        </div>
        <div className="space-y-2">
          {actions.slice(0, 3).map(a => {
            const isPausar = a.recommendation.label.includes('Pausar');
            const isEscalar = a.recommendation.label.includes('Escalar');
            const isOtimizar = a.recommendation.label.includes('Otimizar');
            const borderColor = isPausar ? DATA_RED : isEscalar ? DATA_GREEN : isOtimizar ? DATA_BLUE : DATA_YELLOW;
            const roasColor = isPausar ? 'text-data-red' : isEscalar ? 'text-data-green' : isOtimizar ? 'text-data-blue' : 'text-data-yellow';
            return (
              <div key={a.id} className="flex items-center gap-3 bg-bg-base border border-border-default rounded-lg px-3 py-2.5" style={{ borderLeftWidth: 3, borderLeftColor: borderColor, maxHeight: 60 }}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.recommendation.bg} border whitespace-nowrap`}>{a.recommendation.label}</span>
                <p className="text-[12px] text-text-primary font-semibold truncate flex-1">{a.name}</p>
                <span className="text-[10px] text-text-muted whitespace-nowrap">{currency} {a.spend.toFixed(0)} • {a.purchases}v</span>
                <span className={`text-[11px] font-bold ${roasColor} whitespace-nowrap`}>{a.roas.toFixed(1)}x</span>
              </div>
            );
           })}
         </div>
       </div>
    </div>
  );
}

/* ═══ SKELETON LOADING STATE ═══ */
function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* KPI skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#1C2538] border border-[#2A3850] rounded-xl py-5 px-6 animate-pulse"
            style={{ animationDelay: `${i * 80}ms`, minHeight: 100 }}
          >
            <div className="h-2.5 w-16 bg-[#2A3850] rounded mb-3" />
            <div className="h-7 w-24 bg-[#2A3850] rounded mb-2" />
            <div className="h-2 w-20 bg-[#2A3850] rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeletons row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#1C2538] border border-[#2A3850] rounded-xl p-5 animate-pulse"
            style={{ animationDelay: `${(i + 6) * 80}ms`, minHeight: 260 }}
          >
            <div className="h-3 w-32 bg-[#2A3850] rounded mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-3 bg-[#2A3850] rounded flex-1" style={{ maxWidth: `${60 - j * 8}%` }} />
                  <div className="h-3 w-8 bg-[#2A3850] rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Large chart skeleton */}
      <div className="bg-[#1C2538] border border-[#2A3850] rounded-xl p-5 animate-pulse" style={{ minHeight: 240 }}>
        <div className="h-3 w-28 bg-[#2A3850] rounded mb-6" />
        <div className="flex items-end gap-2 h-[180px] pb-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[#2A3850] rounded-t"
              style={{ height: `${30 + Math.sin(i * 0.8) * 40 + 30}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
