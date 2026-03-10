import { ForecastResult } from '@/hooks/useCortexForecast';
import { useDashboard } from '@/context/DashboardContext';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_GRID = '#1F2937';
const CHART_AXIS = '#6B7280';
const chartTooltipStyle = {
  background: '#111827',
  border: '1px solid #6366F1',
  borderRadius: 8,
  fontSize: 11,
  color: '#F9FAFB',
  fontFamily: "'Inter', sans-serif",
  padding: '10px 12px',
};

const TREND_CONFIG = {
  crescente: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Crescente' },
  estavel: { icon: Minus, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Estável' },
  decrescente: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Decrescente' },
};

const CONFIDENCE_CONFIG = {
  alta: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  media: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  baixa: { color: 'text-red-400', bg: 'bg-red-500/10' },
};

interface Props {
  forecast: ForecastResult | null;
  loading: boolean;
  historicalData?: { date: string; roas: number; spend: number; revenue: number }[];
}

export default function CortexForecast({ forecast, loading, historicalData }: Props) {
  const { currencySymbol } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#6366F1]" />
        <span className="text-sm text-text-muted">Gerando previsão de ROAS...</span>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">📈</div>
        <p className="text-sm text-text-muted">Execute a análise para ver a previsão de 7 dias.</p>
      </div>
    );
  }

  // Build chart data: historical + forecast
  const chartData = [
    ...(historicalData || []).map(d => ({
      date: d.date,
      roas: d.roas,
      roas_expected: null as number | null,
      roas_min: null as number | null,
      roas_max: null as number | null,
      type: 'historical',
    })),
    ...forecast.forecast.map(d => ({
      date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      roas: null as number | null,
      roas_expected: d.roas_expected,
      roas_min: d.roas_min,
      roas_max: d.roas_max,
      type: 'forecast',
    })),
  ];

  // Connect last historical to first forecast
  if (historicalData && historicalData.length > 0 && forecast.forecast.length > 0) {
    const lastHistorical = historicalData[historicalData.length - 1];
    const firstForecastIdx = historicalData.length;
    if (chartData[firstForecastIdx]) {
      chartData[firstForecastIdx].roas_expected = lastHistorical.roas;
      chartData[firstForecastIdx].roas_min = lastHistorical.roas;
      chartData[firstForecastIdx].roas_max = lastHistorical.roas;
    }
  }

  const trend = TREND_CONFIG[forecast.trend] || TREND_CONFIG.estavel;
  const confidence = CONFIDENCE_CONFIG[forecast.confidence] || CONFIDENCE_CONFIG.media;
  const TrendIcon = trend.icon;

  const avgExpectedRoas = forecast.forecast.reduce((s, d) => s + d.roas_expected, 0) / forecast.forecast.length;
  const totalExpectedRevenue = forecast.forecast.reduce((s, d) => s + d.revenue_expected, 0);

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
        <h4 className="text-xs font-semibold text-text-primary mb-4">Previsão ROAS — Próximos 7 Dias</h4>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip contentStyle={chartTooltipStyle} />
            {/* Confidence band */}
            <Area type="monotone" dataKey="roas_max" stroke="none" fill="url(#forecastBand)" />
            <Area type="monotone" dataKey="roas_min" stroke="none" fill="#111827" />
            {/* Historical line */}
            <Line type="monotone" dataKey="roas" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} connectNulls={false} />
            {/* Forecast line */}
            <Line type="monotone" dataKey="roas_expected" stroke="#6366F1" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#6366F1' }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5"><span className="w-4 h-[2px] bg-[#10B981] rounded inline-block" /> Histórico</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-[2px] bg-[#6366F1] rounded inline-block" style={{ borderTop: '2px dashed #6366F1' }} /> Previsão</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#6366F1]/15 rounded inline-block" /> Banda de confiança</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">ROAS Esperado</p>
          <p className="text-xl font-bold text-[#6366F1]">{avgExpectedRoas.toFixed(1)}x</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Receita Projetada</p>
          <p className="text-xl font-bold text-emerald-400">{currencySymbol} {(totalExpectedRevenue / 1000).toFixed(1)}k</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Tendência</p>
          <div className={`flex items-center gap-1.5 ${trend.color}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-bold">{trend.label}</span>
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Confiança</p>
          <span className={`text-sm font-bold ${confidence.color}`}>{forecast.confidence.charAt(0).toUpperCase() + forecast.confidence.slice(1)}</span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl p-4">
        <p className="text-[11px] text-[#818CF8] font-medium mb-1">Análise da IA</p>
        <p className="text-[12px] text-text-primary leading-relaxed">{forecast.reasoning}</p>
      </div>
    </div>
  );
}
