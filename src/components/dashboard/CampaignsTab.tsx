import React, { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Inbox, Loader2, Sparkles, Clock, BarChart3, TrendingUp, TrendingDown, LineChart, ArrowUpDown, ArrowDown, ArrowUp, Pencil, Download } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { getRoasColor, formatCurrency, formatNumber } from '@/lib/mockData';
import { ProcessedCampaign } from '@/hooks/useMetaData';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { HourlyBarChart } from './HourlyBarChart';

function getMetricSemaphore(value: number, thresholds: { good: number; warn: number; higher?: boolean }) {
  const { good, warn, higher = true } = thresholds;
  if (higher) {
    if (value >= good) return 'bg-success';
    if (value >= warn) return 'bg-warning';
    return 'bg-destructive';
  }
  if (value <= good) return 'bg-success';
  if (value <= warn) return 'bg-warning';
  return 'bg-destructive';
}

function Sparkline({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 120, h = 28, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2" fill={color} />
    </svg>
  );
}


type SortColumn = 'status' | 'name' | 'spend' | 'budget' | 'revenue' | 'profit' | 'roas' | 'purchases' | 'cpa' | 'ctr' | 'cpm' | 'impressions' | 'clicks';

export default function CampaignsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [activeTodayFilter, setActiveTodayFilter] = useState(false);
  const [roasFilter, setRoasFilter] = useState<'all' | 'above' | 'near' | 'below' | 'scaling'>('all');
  const [roasDropdownOpen, setRoasDropdownOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const tableRef = React.useRef<HTMLDivElement>(null);
  
  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('spend');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [aiLoadingIds, setAiLoadingIds] = useState<Set<string>>(new Set());
  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; name: string; currentStatus: string } | null>(null);
  
  // Budget dialog state
  const [budgetDialog, setBudgetDialog] = useState<{ id: string; name: string; currentSpend: number } | null>(null);
  const [budgetValue, setBudgetValue] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  
  // Budget cache: campaignId -> daily budget in display currency (already /100)
  const [budgetCache, setBudgetCache] = useState<Record<string, number | null>>({});
  const [budgetFetching, setBudgetFetching] = useState<Set<string>>(new Set());

  const { analysisData, selectedAccountId, currencySymbol } = useDashboard();
  const { profile } = useProfile();
  const { callMetaApi, isConnected } = useMetaConnection();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = currencySymbol;

  const rawCampaigns: ProcessedCampaign[] = analysisData?.campaigns || [];
  const prevCampaigns = analysisData?.campaignsPrev || [];
  const prevMap = useMemo(() => {
    const map: Record<string, ProcessedCampaign> = {};
    prevCampaigns.forEach(c => { map[c.id] = c; });
    return map;
  }, [prevCampaigns]);

  const dailyData = analysisData?.dailyData || [];
  const hourlyData = analysisData?.hourlyData || [];

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredCampaigns = useMemo(() => {
    return rawCampaigns.filter(c => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      const effStatus = localStatuses[c.id] || c.status;
      if (statusFilter === 'active' && effStatus !== 'ACTIVE') return false;
      if (statusFilter === 'paused' && effStatus !== 'PAUSED') return false;
      if (activeTodayFilter && c.spend <= 0) return false;
      // ROAS filter
      if (roasFilter === 'above' && c.roas < roasTarget) return false;
      if (roasFilter === 'near' && (c.roas < roasTarget * 0.7 || c.roas >= roasTarget)) return false;
      if (roasFilter === 'below' && c.roas >= roasTarget * 0.7) return false;
      if (roasFilter === 'scaling' && c.roas < roasTarget * 1.5) return false;
      return true;
    });
  }, [rawCampaigns, searchQuery, statusFilter, activeTodayFilter, localStatuses, roasFilter, roasTarget]);

  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      const effStatusA = localStatuses[a.id] || a.status;
      const effStatusB = localStatuses[b.id] || b.status;
      
      const cpaA = a.purchases > 0 ? a.spend / a.purchases : 0;
      const cpaB = b.purchases > 0 ? b.spend / b.purchases : 0;

      let valA: any, valB: any;
      switch (sortColumn) {
        case 'status': valA = effStatusA === 'ACTIVE' ? 1 : 0; valB = effStatusB === 'ACTIVE' ? 1 : 0; break;
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'spend': valA = a.spend; valB = b.spend; break;
        case 'budget': valA = (analysisData?.budgetByCampaignId?.[a.id] ?? 0); valB = (analysisData?.budgetByCampaignId?.[b.id] ?? 0); break;
        case 'revenue': valA = a.revenue; valB = b.revenue; break;
        case 'profit': valA = a.revenue - a.spend; valB = b.revenue - b.spend; break;
        case 'roas': valA = a.roas; valB = b.roas; break;
        case 'purchases': valA = a.purchases; valB = b.purchases; break;
        case 'cpa': valA = cpaA; valB = cpaB; break;
        case 'ctr': valA = a.ctr; valB = b.ctr; break;
        case 'cpm': valA = a.cpm; valB = b.cpm; break;
        case 'impressions': valA = a.impressions; valB = b.impressions; break;
        case 'clicks': valA = a.clicks; valB = b.clicks; break;
        default: valA = a.spend; valB = b.spend;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCampaigns, sortColumn, sortDirection, localStatuses]);

  const roasTrend = useMemo(() => {
    if (dailyData.length < 3) return 'stable';
    const last = dailyData[dailyData.length - 1]?.roas ?? 0;
    const prev2 = dailyData[dailyData.length - 3]?.roas ?? 0;
    if (last > prev2 * 1.05) return 'up';
    if (last < prev2 * 0.95) return 'down';
    return 'stable';
  }, [dailyData]);

  const hourlySorted = useMemo(() => {
    return [...hourlyData].sort((a, b) => b.spend - a.spend);
  }, [hourlyData]);
  
  const topHours = useMemo(() => {
    return hourlySorted.filter(h => h.spend > 0).slice(0, 3).map(h => h.hour);
  }, [hourlySorted]);

  const toggleCampaignStatus = useCallback(async (campaignId: string, currentStatus: string) => {
    if (!isConnected || !selectedAccountId) {
      toast.error('Conecte sua conta Meta primeiro.');
      return;
    }
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingIds(prev => new Set(prev).add(campaignId));
    try {
      await callMetaApi(campaignId, { status: newStatus, _method: 'POST' });
      setLocalStatuses(prev => ({ ...prev, [campaignId]: newStatus }));
      toast.success(newStatus === 'ACTIVE' ? 'Campanha ativada ✓' : 'Campanha pausada ✓');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar status da campanha.');
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
    }
  }, [isConnected, selectedAccountId, callMetaApi]);

  const generateAiAnalysis = useCallback(async (campaign: ProcessedCampaign) => {
    setAiLoadingIds(prev => new Set(prev).add(campaign.id));
    try {
      const prev = prevMap[campaign.id];
      const hourlyCtx = topHours.length > 0 ? `\nHorários com mais gasto: ${topHours.join(', ')}` : '';
      const prompt = `Analise esta campanha Meta Ads e responda em JSON com as chaves: diagnostico (2-3 frases com números reais), acao_principal (1 ação com valor exato, ex: "Aumentar budget de ${currency}X para ${currency}Y (+Z%)"), budget_por_hora (string com distribuição, ex: "00h-08h: 10% | 08h-12h: 25% | 12h-18h: 40% | 18h-24h: 25%"), previsao_roas_7d (número estimado), budget_recomendado (valor em ${currency}).

Dados da campanha:
- Nome: ${campaign.name}
- Status: ${campaign.status}
- ROAS: ${campaign.roas.toFixed(2)}x (meta: ${roasTarget}x)
- Gasto: ${currency} ${campaign.spend.toFixed(2)}
- Receita: ${currency} ${campaign.revenue.toFixed(2)}
- Vendas: ${campaign.purchases}
- CTR: ${campaign.ctr.toFixed(2)}%
- CPC: ${currency} ${campaign.cpc.toFixed(2)}
- CPM: ${currency} ${campaign.cpm.toFixed(2)}
- Impressões: ${campaign.impressions}
- Cliques: ${campaign.clicks}${hourlyCtx}
${prev ? `\nPeríodo anterior: ROAS ${prev.roas.toFixed(2)}x, Gasto ${currency} ${prev.spend.toFixed(2)}, Receita ${currency} ${prev.revenue.toFixed(2)}, Vendas ${prev.purchases}` : ''}

Responda SOMENTE com o JSON, sem markdown.`;

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          system: 'Você é um especialista em Meta Ads. Responda SOMENTE com JSON válido, sem backticks ou markdown.',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      let parsed;
      try {
        const content = data.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(content);
      } catch {
        parsed = { diagnostico: data.content, acao_principal: 'Verifique os dados manualmente.', previsao_roas_7d: campaign.roas, budget_recomendado: campaign.spend };
      }

      setAiResults(prev => ({ ...prev, [campaign.id]: parsed }));
    } catch (err: any) {
      toast.error('Erro ao gerar análise IA: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setAiLoadingIds(prev => { const n = new Set(prev); n.delete(campaign.id); return n; });
    }
  }, [prevMap, roasTarget, currency, topHours]);

  const fetchBudget = useCallback(async (campaignId: string) => {
    if (budgetCache[campaignId] !== undefined || budgetFetching.has(campaignId)) return;
    setBudgetFetching(prev => new Set(prev).add(campaignId));
    try {
      const res = await callMetaApi(`${campaignId}/adsets`, {
        fields: 'id,daily_budget,lifetime_budget',
      });
      const adsets = res?.data || [];
      const withBudget = adsets.find((a: any) => a.daily_budget);
      if (withBudget) {
        setBudgetCache(prev => ({ ...prev, [campaignId]: parseInt(withBudget.daily_budget, 10) / 100 }));
      } else {
        const campRes = await callMetaApi(campaignId, { fields: 'daily_budget,lifetime_budget' });
        const db = campRes?.daily_budget;
        setBudgetCache(prev => ({ ...prev, [campaignId]: db ? parseInt(db, 10) / 100 : null }));
      }
    } catch {
      setBudgetCache(prev => ({ ...prev, [campaignId]: null }));
    } finally {
      setBudgetFetching(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
    }
  }, [budgetCache, budgetFetching, callMetaApi]);

  // Loading skeleton state
  if (selectedAccountId && !analysisData) {
    return <CampaignsTableSkeleton />;
  }

  if (analysisData && rawCampaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="text-[80px] leading-none mb-6 opacity-[0.15] select-none">🎯</div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma campanha encontrada</h3>
        <p className="text-xs text-muted-foreground">Tente outro período ou verifique os filtros</p>
      </div>
    );
  }

  const maxHourlySpend = Math.max(...hourlyData.map(h => h.spend), 1);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const getRecommendation = (campaign: ProcessedCampaign) => {
    if (campaign.roas >= roasTarget * 1.3) return { label: 'Escalar', bg: 'rgba(52,211,153,0.1)', text: '#34D399', border: 'rgba(52,211,153,0.25)' };
    if (campaign.roas < roasTarget * 0.5 && campaign.spend > 10) return { label: 'Pausar', bg: 'rgba(248,113,113,0.1)', text: '#F87171', border: 'rgba(248,113,113,0.25)' };
    return { label: 'Otimizar', bg: 'rgba(96,165,250,0.1)', text: '#60A5FA', border: 'rgba(96,165,250,0.25)' };
  };

  const columns = [
    { key: 'status', label: 'Status', align: 'left' },
    { key: 'name', label: 'Campanha', align: 'left' },
    { key: 'spend', label: 'Gastos', align: 'right' },
    { key: 'budget', label: 'Orçamento', align: 'right' },
    { key: 'revenue', label: 'Faturamento', align: 'right' },
    { key: 'profit', label: 'Lucro', align: 'right' },
    { key: 'roas', label: 'ROAS', align: 'right' },
    { key: 'purchases', label: 'Vendas', align: 'right' },
    { key: 'cpa', label: 'CPA', align: 'right' },
    { key: 'ctr', label: 'CTR', align: 'right' },
    { key: 'cpm', label: 'CPM', align: 'right' },
    { key: 'impressions', label: 'Impr.', align: 'right' },
    { key: 'clicks', label: 'Cliques', align: 'right' },
    { key: 'recommendation', label: 'Recom.', align: 'center' },
  ] as const;

  // Pagination logic
  const totalPages = Math.ceil(sortedCampaigns.length / PAGE_SIZE);
  const paginatedCampaigns = sortedCampaigns.length > PAGE_SIZE
    ? sortedCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : sortedCampaigns;

  // Reset page when filters change
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, activeTodayFilter, roasFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // CSV Export
  const exportCsv = () => {
    const accountName = selectedAccountId || 'conta';
    const date = new Date().toISOString().slice(0, 10);
    const headers = ['Nome', 'Gasto', 'Orçamento', 'Faturamento', 'Lucro', 'ROAS', 'Vendas', 'CPA', 'CTR', 'CPM', 'Impressões', 'Cliques'];
    const rows = sortedCampaigns.map(c => {
      const budget = analysisData?.budgetByCampaignId?.[c.id] ?? '';
      const profit = c.revenue - c.spend;
      const cpa = c.purchases > 0 ? (c.spend / c.purchases).toFixed(2) : '0';
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        c.spend.toFixed(2), budget !== '' ? Number(budget).toFixed(2) : '',
        c.revenue.toFixed(2), profit.toFixed(2), c.roas.toFixed(2),
        c.purchases, cpa, c.ctr.toFixed(2), c.cpm.toFixed(2),
        c.impressions, c.clicks,
      ].join(',');
    });
    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campanhas_${accountName}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado ✓');
  };

  const roasFilterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'scaling', label: '🚀 Escalando' },
    { value: 'above', label: '✅ Acima da meta' },
    { value: 'near', label: '⚠️ Próximo da meta' },
    { value: 'below', label: '❌ Abaixo da meta' },
  ] as const;

  const roasFilterLabel = roasFilterOptions.find(o => o.value === roasFilter)?.label || 'ROAS';

  // Pagination bar component
  const PaginationBar = () => {
    if (sortedCampaigns.length <= PAGE_SIZE) return null;
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, sortedCampaigns.length);
    const maxVisible = 5;
    const pages: (number | string)[] = [];
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-[#1C2538]">
        <span className="text-[11px] text-text-muted">Mostrando {start}-{end} de {sortedCampaigns.length} campanhas</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-[11px] font-medium border border-border-default rounded-md text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            ← Anterior
          </button>
          {pages.map((p, i) =>
            typeof p === 'string' ? (
              <span key={`dots-${i}`} className="px-1 text-[11px] text-text-muted">...</span>
            ) : (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-7 h-7 text-[11px] font-medium rounded-md transition-colors ${
                  currentPage === p
                    ? 'bg-data-blue text-white'
                    : 'border border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-[11px] font-medium border border-border-default rounded-md text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Próximo →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" ref={tableRef}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input 
            placeholder="Buscar campanha..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 h-8 text-xs bg-[#0E1420]"
          />
          <div className="flex items-center bg-[#0E1420] border border-[#1E2D4A] rounded-md">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 text-xs font-medium border-l border-border transition-colors ${statusFilter === 'active' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Ativo
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 text-xs font-medium border-l border-border transition-colors ${statusFilter === 'paused' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pausado
            </button>
          </div>
          <button
            onClick={() => setActiveTodayFilter(!activeTodayFilter)}
            className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${activeTodayFilter ? 'bg-primary/15 text-primary border-primary/40' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
          >
            Ativas hoje
          </button>

          {/* ROAS Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoasDropdownOpen(!roasDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${
                roasFilter !== 'all'
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {roasFilterLabel}
              <ChevronDown className={`w-3 h-3 transition-transform ${roasDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {roasDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRoasDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-48 bg-bg-card border border-border-default rounded-lg shadow-xl z-50 py-1">
                  {roasFilterOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setRoasFilter(opt.value); setRoasDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        roasFilter === opt.value ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Export CSV */}
        <button
          onClick={exportCsv}
          disabled={sortedCampaigns.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default rounded-md text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedCampaigns.length === 0 ? (
          <p className="text-center py-8 text-xs text-muted-foreground">Nenhuma campanha encontrada com os filtros atuais.</p>
        ) : (
          sortedCampaigns.map((c, idx) => {
            const effectiveStatus = localStatuses[c.id] || c.status;
            const isActive = effectiveStatus === 'ACTIVE';
            const isToggling = togglingIds.has(c.id);
            const profit = c.revenue - c.spend;
            const cpa = c.purchases > 0 ? c.spend / c.purchases : 0;
            const rec = getRecommendation(c);

            let badgeBg: string, badgeText: string, badgeBorder: string;
            if (c.roas >= roasTarget) {
              badgeBg = 'rgba(52,211,153,0.12)'; badgeText = '#34D399'; badgeBorder = 'rgba(52,211,153,0.25)';
            } else if (c.roas >= roasTarget * 0.7) {
              badgeBg = 'rgba(251,191,36,0.12)'; badgeText = '#FBBF24'; badgeBorder = 'rgba(251,191,36,0.25)';
            } else {
              badgeBg = 'rgba(248,113,113,0.12)'; badgeText = '#F87171'; badgeBorder = 'rgba(248,113,113,0.25)';
            }

            return (
              <div
                key={c.id}
                className={`bg-[#0E1420] border border-[#1E2D4A] rounded-lg p-4 animate-fade-in opacity-0 [animation-fill-mode:forwards] ${!isActive ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Header: name + toggle */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[12px] font-bold inline-block"
                        style={{ background: badgeBg, color: badgeText, border: `1px solid ${badgeBorder}`, borderRadius: 6, padding: '2px 8px' }}
                      >
                        {c.roas.toFixed(2)}x
                      </span>
                      <span
                        className="text-[10px] font-semibold inline-block whitespace-nowrap"
                        style={{ background: rec.bg, color: rec.text, border: `1px solid ${rec.border}`, borderRadius: 20, padding: '2px 8px' }}
                      >
                        {rec.label}
                      </span>
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <button
                        onClick={() => setConfirmDialog({ id: c.id, name: c.name, currentStatus: effectiveStatus })}
                        className="relative inline-flex items-center cursor-pointer"
                        style={{ width: 36, height: 20, borderRadius: 10 }}
                      >
                        <span
                          className="block w-full h-full rounded-[10px] transition-colors duration-200 ease-in-out"
                          style={{ backgroundColor: isActive ? '#10B981' : '#374151' }}
                        />
                        <span
                          className="absolute block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out"
                          style={{ top: 2, left: isActive ? 18 : 2 }}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-text-muted">Gasto</p>
                    <p className="text-[12px] font-semibold text-text-primary">{formatCurrency(c.spend, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted">Receita</p>
                    <p className="text-[12px] font-semibold text-data-green">{formatCurrency(c.revenue, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted">Vendas</p>
                    <p className="text-[12px] font-semibold text-text-primary">{c.purchases}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-[#0E1420] border border-[#1E2D4A] rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-[#1C2538] bg-[#0D1121] sticky top-0 z-10">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.key !== 'recommendation' ? handleSort(col.key as SortColumn) : undefined}
                  className={`px-3 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider ${col.key !== 'recommendation' ? 'cursor-pointer hover:bg-[#111827]' : ''} transition-colors select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {col.label}
                    {col.key !== 'recommendation' && <SortIcon column={col.key as SortColumn} />}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sortedCampaigns.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma campanha encontrada com os filtros atuais.
                </td>
              </tr>
            ) : (
              sortedCampaigns.map((c, rowIndex) => {
                const expanded = expandedId === c.id;
                const effectiveStatus = localStatuses[c.id] || c.status;
                const isActive = effectiveStatus === 'ACTIVE';
                const isToggling = togglingIds.has(c.id);
                

                const profit = c.revenue - c.spend;
                const cpa = c.purchases > 0 ? c.spend / c.purchases : 0;
                
                const prev = prevMap[c.id];
                const ai = aiResults[c.id];
                const aiLoading = aiLoadingIds.has(c.id);
                const sparkData = dailyData.map(d => d.roas);

                const computeDelta = (curr: number, prevVal: number | undefined): number | null => {
                  if (!prev || (prev.spend || 0) === 0 || prevVal === undefined || prevVal === null) return null;
                  if (prevVal === 0 && curr === 0) return null;
                  if (prevVal === 0) return null;
                  return ((curr - prevVal) / Math.abs(prevVal)) * 100;
                };

                const metrics = [
                  { label: 'Gasto', value: formatCurrency(c.spend, currency), sem: getMetricSemaphore(c.spend, { good: c.spend * 0.5, warn: c.spend * 1.5, higher: false }), delta: computeDelta(c.spend, prev?.spend), invert: true },
                  { label: 'Receita', value: formatCurrency(c.revenue, currency), sem: getMetricSemaphore(c.revenue, { good: c.spend * roasTarget, warn: c.spend, higher: true }), delta: computeDelta(c.revenue, prev?.revenue), invert: false },
                  { label: 'Lucro Bruto', value: formatCurrency(profit, currency), sem: getMetricSemaphore(profit, { good: 0, warn: -c.spend * 0.2, higher: true }), delta: prev ? computeDelta(profit, prev.revenue - prev.spend) : null, invert: false },
                  { label: 'CPC', value: `${currency} ${c.cpc.toFixed(2)}`, sem: getMetricSemaphore(c.cpc, { good: 1.0, warn: 2.5, higher: false }), delta: computeDelta(c.cpc, prev?.cpc), invert: true },
                  { label: 'CPV', value: `${currency} ${(c.cpv || 0).toFixed(2)}`, sem: getMetricSemaphore(c.cpv, { good: 30, warn: 80, higher: false }), delta: computeDelta(c.cpv, prev?.cpv), invert: true },
                  { label: 'Impressões', value: formatNumber(c.impressions), sem: getMetricSemaphore(c.impressions, { good: 10000, warn: 2000, higher: true }), delta: computeDelta(c.impressions, prev?.impressions), invert: false },
                  { label: 'Cliques', value: formatNumber(c.clicks), sem: getMetricSemaphore(c.clicks, { good: 500, warn: 100, higher: true }), delta: computeDelta(c.clicks, prev?.clicks), invert: false },
                  { label: 'CPM', value: `${currency} ${c.cpm.toFixed(2)}`, sem: getMetricSemaphore(c.cpm, { good: 20, warn: 40, higher: false }), delta: computeDelta(c.cpm, prev?.cpm), invert: true },
                  { label: 'CTR', value: `${c.ctr.toFixed(2)}%`, sem: getMetricSemaphore(c.ctr, { good: 2.0, warn: 1.0, higher: true }), delta: computeDelta(c.ctr, prev?.ctr), invert: false },
                ];

                const rec = getRecommendation(c);

                return (
                  <React.Fragment key={c.id}>
                    <tr 
                      onClick={() => setExpandedId(expanded ? null : c.id)}
                      className={`border-b border-[#1C2538] bg-[#0E1420] cursor-pointer transition-colors duration-150 ${!isActive ? 'opacity-60' : ''} ${expanded ? 'bg-[#111827]' : ''} animate-fade-in opacity-0 [animation-fill-mode:forwards]`}
                      style={{ height: 52, animationDelay: `${rowIndex * 30}ms` }}
                      onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(96,165,250,0.04)'; }}
                      onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                    >
                      {/* Switch Toggle */}
                      <td className="px-3" onClick={e => e.stopPropagation()}>
                        {isToggling ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
                        ) : (
                          <button
                            onClick={() => setConfirmDialog({ id: c.id, name: c.name, currentStatus: effectiveStatus })}
                            className="relative inline-flex items-center cursor-pointer"
                            style={{ width: 36, height: 20, borderRadius: 10 }}
                          >
                            <span
                              className="block w-full h-full rounded-[10px] transition-colors duration-200 ease-in-out"
                              style={{ backgroundColor: isActive ? '#10B981' : '#374151' }}
                            />
                            <span
                              className="absolute block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out"
                              style={{ top: 2, left: isActive ? 18 : 2 }}
                            />
                          </button>
                        )}
                      </td>
                      {/* Name */}
                      <td className="px-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-[13px] font-semibold text-text-primary truncate max-w-[200px] cursor-default">{c.name}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{c.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      {/* Spend */}
                      <td className="px-3 text-right">
                        <p className="text-[13px] text-text-primary">{formatCurrency(c.spend, currency)}</p>
                      </td>
                      {/* Budget */}
                      <td className="px-3 text-right" onClick={e => e.stopPropagation()}>
                        {(() => {
                          const rawBudget = analysisData?.budgetByCampaignId?.[c.id];
                          const bVal = rawBudget != null && rawBudget > 0 ? rawBudget : null;
                          return (
                            <div className="flex items-center justify-end gap-1 group/budget">
                              {bVal != null ? (
                                <p className="text-[13px] text-text-primary">{formatCurrency(bVal, currency)}</p>
                              ) : (
                                <p className="text-[13px] text-text-muted">—</p>
                              )}
                              <Pencil
                                className="w-3 h-3 text-muted-foreground/0 group-hover/budget:text-muted-foreground cursor-pointer hover:text-primary transition-all"
                                onClick={() => {
                                  setBudgetDialog({ id: c.id, name: c.name, currentSpend: bVal || 0 });
                                  setBudgetValue('');
                                }}
                              />
                            </div>
                          );
                        })()}
                      </td>
                      {/* Revenue */}
                      <td className="px-3 text-right">
                        <p className="text-[13px] text-text-primary">{formatCurrency(c.revenue, currency)}</p>
                      </td>
                      {/* Profit with arrow */}
                      <td className="px-3 text-right">
                        <span className={`text-[13px] font-medium inline-flex items-center gap-0.5 ${profit >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                          {profit >= 0 ? '↑' : '↓'}{profit > 0 ? '+' : ''}{formatCurrency(profit, currency)}
                        </span>
                      </td>
                      {/* ROAS Badge */}
                      <td className="px-3 text-right">
                        {(() => {
                          let badgeBg: string, badgeText: string, badgeBorder: string;
                          if (c.roas >= roasTarget) {
                            badgeBg = 'rgba(52,211,153,0.12)'; badgeText = '#34D399'; badgeBorder = 'rgba(52,211,153,0.25)';
                          } else if (c.roas >= roasTarget * 0.7) {
                            badgeBg = 'rgba(251,191,36,0.12)'; badgeText = '#FBBF24'; badgeBorder = 'rgba(251,191,36,0.25)';
                          } else {
                            badgeBg = 'rgba(248,113,113,0.12)'; badgeText = '#F87171'; badgeBorder = 'rgba(248,113,113,0.25)';
                          }
                          return (
                            <span
                              className="text-[13px] font-bold inline-block"
                              style={{ background: badgeBg, color: badgeText, border: `1px solid ${badgeBorder}`, borderRadius: 6, padding: '3px 8px' }}
                            >
                              {c.roas.toFixed(2)}x
                            </span>
                          );
                        })()}
                      </td>
                      {/* Purchases */}
                      <td className="px-3 text-right">
                        <p className="text-[13px] text-text-primary">{c.purchases}</p>
                      </td>
                      {/* CPA */}
                      <td className="px-3 text-right">
                        <p className="text-[13px] text-text-primary">{formatCurrency(cpa, currency)}</p>
                      </td>
                      {/* CTR */}
                      <td className="px-3 text-right">
                        <p className="text-[13px] text-text-primary">{c.ctr.toFixed(2)}%</p>
                      </td>
                      {/* CPM */}
                      <td className="px-3 text-right">
                        <p className="text-[13px] text-text-primary">{formatCurrency(c.cpm, currency)}</p>
                      </td>
                      {/* Impressions */}
                      <td className="px-3 text-right">
                        <p className="text-[13px] text-text-primary">{formatNumber(c.impressions)}</p>
                      </td>
                      {/* Clicks */}
                      <td className="px-3 text-right">
                        <p className="text-[13px] text-text-primary">{formatNumber(c.clicks)}</p>
                      </td>
                      {/* Recommendation */}
                      <td className="px-3 text-center">
                        <span
                          className="text-[11px] font-semibold inline-block whitespace-nowrap"
                          style={{ background: rec.bg, color: rec.text, border: `1px solid ${rec.border}`, borderRadius: 20, padding: '3px 10px' }}
                        >
                          {rec.label}
                        </span>
                      </td>
                      {/* Expand */}
                      <td className="px-3 text-center text-text-muted">
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                    </tr>
                    
                    {/* EXPANDED CONTENT */}
                    {expanded && (
                      <tr className="bg-[#080B14] border-b border-[#1C2538]">
                        <td colSpan={16} className="p-0">
                          <div className="p-4 border-l-2 border-l-primary/50 animate-fade-up">
                            {aiLoading ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[0,1,2,3].map(i => (
                                  <div key={i} className="bg-[#0E1420] border border-[#1E2D4A] rounded-lg p-4 space-y-3">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-20 w-full" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* BLOCO 1 — MÉTRICAS COMPLETAS */}
                                <div className="bg-[#0E1420] border border-[#1E2D4A] rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                                    <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Métricas Completas</h4>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                     {metrics.map(m => {
                                       const deltaVal = m.delta;
                                       const isNeutral = deltaVal !== null && Math.abs(deltaVal) < 0.05;
                                       const isGood = m.invert ? (deltaVal !== null && deltaVal <= 0) : (deltaVal !== null && deltaVal >= 0);
                                       return (
                                         <div key={m.label} className="flex items-start gap-2">
                                           <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${m.sem}`} />
                                           <div className="min-w-0">
                                             <p className="text-[10px] text-muted-foreground">{m.label}</p>
                                             <p className="text-xs font-bold text-foreground">{m.value}</p>
                                             {deltaVal !== null && (
                                               <p className={`text-[9px] ${isNeutral ? 'text-muted-foreground' : isGood ? 'text-success' : 'text-destructive'}`}>
                                                 {isNeutral ? '—' : (deltaVal >= 0 ? '▲' : '▼')} {Math.abs(deltaVal).toFixed(1)}% vs anterior
                                               </p>
                                             )}
                                           </div>
                                         </div>
                                       );
                                     })}
                                  </div>

                                  {sparkData.length >= 2 && (
                                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <LineChart className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">ROAS diário</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Sparkline data={sparkData} color={roasTrend === 'up' ? 'hsl(var(--success))' : roasTrend === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                                        {roasTrend === 'up' && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20 flex items-center gap-0.5">
                                            <TrendingUp className="w-2.5 h-2.5" /> Acelerando
                                          </span>
                                        )}
                                        {roasTrend === 'down' && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-0.5">
                                            <TrendingDown className="w-2.5 h-2.5" /> Desacelerando
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* BLOCO 2 — ANÁLISE IA */}
                                <div className="bg-[#0E1420] border border-[#1E2D4A] rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-3.5 h-3.5 text-secondary" />
                                      <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Análise IA</h4>
                                    </div>
                                    {!ai && (
                                      <Button
                                        onClick={() => generateAiAnalysis(c)}
                                        disabled={aiLoading}
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary/10"
                                      >
                                        <Sparkles className="w-2.5 h-2.5 mr-1" /> Gerar Análise IA
                                      </Button>
                                    )}
                                  </div>
                                  {ai ? (
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-[10px] text-primary font-semibold mb-1">Diagnóstico</p>
                                        <p className="text-[11px] text-foreground/80 leading-relaxed">{ai.diagnostico}</p>
                                      </div>
                                      <div className="bg-primary/5 border border-primary/10 rounded-md p-2">
                                        <p className="text-[10px] text-primary font-semibold mb-0.5">🎯 Ação Principal</p>
                                        <p className="text-[11px] text-foreground leading-relaxed">{ai.acao_principal}</p>
                                      </div>
                                      {ai.budget_por_hora && (
                                        <div className="bg-muted rounded-md p-2">
                                          <p className="text-[10px] text-muted-foreground mb-0.5">⏰ Budget por Hora</p>
                                          <p className="text-[11px] text-foreground font-mono">{ai.budget_por_hora}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-muted rounded-md p-2">
                                          <p className="text-[10px] text-muted-foreground">Previsão ROAS 7d</p>
                                          <p className={`text-sm font-bold ${getRoasColor(ai.previsao_roas_7d || c.roas, roasTarget)}`}>{(ai.previsao_roas_7d || c.roas).toFixed(1)}x</p>
                                        </div>
                                        <div className="bg-muted rounded-md p-2">
                                          <p className="text-[10px] text-muted-foreground">Budget Recomendado</p>
                                          <p className="text-sm font-bold text-foreground">{currency} {parseFloat(ai.budget_recomendado || c.spend).toFixed(0)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="py-6 text-center">
                                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Clique em "Gerar Análise IA" para diagnóstico completo, budget ideal e previsão de ROAS.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* BLOCO 3 — PERFORMANCE POR HORA */}
                                <div className="bg-[#0E1420] border border-[#1E2D4A] rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-3.5 h-3.5 text-success" />
                                    <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Performance por Hora</h4>
                                  </div>
                                  <HourlyBarChart 
                                    data={hourlyData} 
                                    emptyMessage="Performance por hora disponível na aba Visão Geral (dados agregados da conta)"
                                  />
                                </div>

                                {/* BLOCO 4 — EVOLUÇÃO DIÁRIA */}
                                <div className="bg-[#0E1420] border border-[#1E2D4A] rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <LineChart className="w-3.5 h-3.5 text-primary" />
                                    <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Evolução Diária</h4>
                                  </div>
                                  {dailyData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={180}>
                                      <RechartsLineChart data={dailyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                        <XAxis 
                                          dataKey="date" 
                                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                                          tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                        />
                                        <YAxis 
                                          yAxisId="left"
                                          tick={{ fontSize: 9, fill: 'hsl(var(--primary))' }}
                                          tickFormatter={(v) => `${v.toFixed(1)}x`}
                                        />
                                        <YAxis 
                                          yAxisId="right" 
                                          orientation="right"
                                          tick={{ fontSize: 9, fill: 'hsl(var(--success))' }}
                                          tickFormatter={(v) => `${currency}${v.toFixed(0)}`}
                                        />
                                         <RechartsTooltip 
                                           contentStyle={{ 
                                             background: 'hsl(var(--card))', 
                                             border: '1px solid hsl(var(--border))',
                                             borderRadius: '6px',
                                             fontSize: '10px'
                                           }}
                                           labelFormatter={(v) => new Date(v).toLocaleDateString('pt-BR')}
                                         />
                                        <Legend 
                                          wrapperStyle={{ fontSize: '10px' }}
                                          iconSize={8}
                                        />
                                        <Line 
                                          yAxisId="left"
                                          type="monotone" 
                                          dataKey="roas" 
                                          stroke="hsl(var(--primary))" 
                                          strokeWidth={2}
                                          name="ROAS"
                                          dot={{ r: 2 }}
                                        />
                                        <Line 
                                          yAxisId="right"
                                          type="monotone" 
                                          dataKey="spend" 
                                          stroke="hsl(var(--success))" 
                                          strokeWidth={2}
                                          name="Gasto"
                                          dot={{ r: 2 }}
                                        />
                                      </RechartsLineChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <p className="text-[11px] text-muted-foreground text-center py-6">
                                      Dados diários não disponíveis.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {confirmDialog?.currentStatus === 'ACTIVE' ? '⏸️ Pausar campanha?' : '▶️ Ativar campanha?'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {confirmDialog?.name}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant={confirmDialog?.currentStatus === 'ACTIVE' ? 'destructive' : 'default'}
              onClick={async () => {
                if (!confirmDialog) return;
                const { id, currentStatus } = confirmDialog;
                setConfirmDialog(null);
                setTogglingIds(prev => new Set(prev).add(id));
                try {
                  await callMetaApi(id, { status: currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE', _method: 'POST' });
                  const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
                  setLocalStatuses(prev => ({ ...prev, [id]: newStatus }));
                  toast.success(newStatus === 'ACTIVE' ? 'Campanha ativada ✓' : 'Campanha pausada ✓');
                } catch (err: any) {
                  toast.error(err?.message || 'Erro ao alterar status.');
                } finally {
                  setTogglingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
                }
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Dialog */}
      <Dialog open={!!budgetDialog} onOpenChange={(open) => { if (!open) setBudgetDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">💰 Ajustar Budget</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {budgetDialog?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Novo budget diário ({currency})
            </label>
            <Input
              type="number"
              step="0.01"
              min="1"
              placeholder={budgetDialog?.currentSpend?.toFixed(2) || '0.00'}
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setBudgetDialog(null)} disabled={budgetLoading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={budgetLoading || !budgetValue || parseFloat(budgetValue) <= 0}
              onClick={async () => {
                if (!budgetDialog || !budgetValue) return;
                const newBudget = parseFloat(budgetValue);
                if (isNaN(newBudget) || newBudget <= 0) {
                  toast.error('Informe um valor válido.');
                  return;
                }
                setBudgetLoading(true);
                try {
                  // Fetch adsets to check if ABO or CBO
                  const adSetsRes = await callMetaApi(`${budgetDialog.id}/adsets`, {
                    fields: 'id,name,daily_budget,lifetime_budget',
                  });
                  const adsets = adSetsRes?.data || [];
                  const budgetCents = String(Math.round(newBudget * 100));

                  // ABO: adsets have their own daily_budget
                  const aboAdsets = adsets.filter((a: any) => a.daily_budget || a.lifetime_budget);

                  if (aboAdsets.length > 0) {
                    await Promise.all(
                      aboAdsets.map((adset: any) =>
                        callMetaApi(adset.id, { daily_budget: budgetCents, _method: 'POST' })
                      )
                    );
                  } else {
                    // CBO: update campaign budget directly
                    await callMetaApi(budgetDialog.id, { daily_budget: budgetCents, _method: 'POST' });
                  }
                  toast.success('Budget atualizado ✓');
                  setBudgetDialog(null);
                } catch (err: any) {
                  toast.error(err?.message || 'Erro ao atualizar budget.');
                } finally {
                  setBudgetLoading(false);
                }
              }}
            >
              {budgetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══ TABLE SKELETON ═══ */
function CampaignsTableSkeleton() {
  const colWidths = [36, 200, 80, 80, 80, 80, 60, 50, 60, 50, 60, 60, 50];
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-64 bg-[#1C2538] rounded-md animate-pulse" />
        <div className="h-8 w-36 bg-[#1C2538] rounded-md animate-pulse" />
        <div className="h-8 w-24 bg-[#1C2538] rounded-md animate-pulse" />
      </div>
      {/* Table skeleton */}
      <div className="bg-[#0E1420] border border-[#1E2D4A] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0D1121] border-b border-[#1C2538]">
          {colWidths.map((w, i) => (
            <div key={i} className="h-3 bg-[#2A3850] rounded" style={{ width: w, flexShrink: 0 }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 border-b border-[#1C2538] animate-pulse"
            style={{ height: 52, animationDelay: `${i * 60}ms` }}
          >
            {colWidths.map((w, j) => (
              <div
                key={j}
                className="h-3.5 bg-[#1C2538] rounded"
                style={{ width: w + Math.random() * 20, flexShrink: 0 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}