import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, Clock, AlertTriangle, RefreshCw, Menu, X as XIcon, Calendar } from 'lucide-react';
import AlertsPanel from './AlertsPanel';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { getRoasColor } from '@/lib/mockData';

const periods = ['Hoje', '3d', '7d', '14d', '30d'];

const tabLabels: Record<string, string> = {
  overview: 'Resumo',
  campaigns: 'Campanhas',
  'action-plan': '⚡ CORTEX',
  comparison: 'Comparação',
  consolidated: 'Relatórios',
  rules: 'Regras',
  chat: 'Cortex Chat',
  report: 'Notificações',
};

interface DashboardHeaderProps {
  onOpenSidebar?: () => void;
}

export default function DashboardHeader({ onOpenSidebar }: DashboardHeaderProps) {
  const {
    selectedPeriod, setSelectedPeriod,
    selectedAccountId, setSelectedAccountId,
    dateRange, setDateRange,
    analysisData, isFromCache, cacheTimestamp, currencySymbol,
    activeTab, activeAccountIds,
  } = useDashboard();
  const { isTokenExpired, isTokenExpiringSoon, daysUntilExpiry, connectMeta, adAccounts } = useMetaConnection();
  const { analyze, loading, roasTarget } = useMetaData();
  const isMobile = useIsMobile();

  const [isStale, setIsStale] = useState(false);

  const handleAtualizar = useCallback(async () => {
    if (activeAccountIds.length === 0) return;
    for (const id of activeAccountIds) {
      await analyze(id);
    }
  }, [activeAccountIds, analyze]);

  const checkStale = useCallback(() => {
    if (!analysisData?.lastUpdated) { setIsStale(false); return; }
    const age = Date.now() - new Date(analysisData.lastUpdated).getTime();
    setIsStale(age > 60 * 60 * 1000);
  }, [analysisData?.lastUpdated]);

  useEffect(() => {
    checkStale();
    const interval = setInterval(checkStale, 60_000);
    return () => clearInterval(interval);
  }, [checkStale]);

  const ad = analysisData;
  const totalSpend = ad?.campaigns.reduce((s, c) => s + c.spend, 0) || 0;
  const totalRevenue = ad?.campaigns.reduce((s, c) => s + c.revenue, 0) || 0;
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const aboveMeta = ad?.campaigns.filter(c => c.roas >= roasTarget).length || 0;
  const belowMeta = ad?.campaigns.filter(c => c.roas < roasTarget && c.spend > 0).length || 0;
  const delta: number | null = ad && ad.campaignsPrev.length > 0
    ? (() => {
        const prevSpend = ad.campaignsPrev.reduce((s, c) => s + c.spend, 0);
        const prevRevenue = ad.campaignsPrev.reduce((s, c) => s + c.revenue, 0);
        const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
        if (prevRoas === 0) return null;
        return ((avgRoas - prevRoas) / prevRoas * 100);
      })()
    : null;

  const lastTime = ad?.lastUpdated ? new Date(ad.lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
  const cacheTime = cacheTimestamp ? new Date(cacheTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  const pageTitle = tabLabels[activeTab] || 'Dashboard';
  const isCustomActive = selectedPeriod === 'custom' && !!dateRange;
  const periodLabel = isCustomActive ? `${dateRange!.from} → ${dateRange!.to}` : (selectedPeriod === 'Hoje' ? 'Hoje' : `Últimos ${selectedPeriod}`);
  const subtitle = `Meta Ads · ${periodLabel}`;

  // Period selector JSX
  const periodSelector = (
    <div className="flex items-center gap-0.5">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => setSelectedPeriod(p)}
          className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
            selectedPeriod === p && !isCustomActive
              ? 'bg-data-blue text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {p}
        </button>
      ))}
      <DateRangePicker
        isActive={isCustomActive}
        dateRange={dateRange}
        onApply={(range) => setDateRange(range)}
        onClear={() => setDateRange(null)}
      />
    </div>
  );

  return (
    <div className="sticky top-0 z-30 bg-bg-sidebar/90 backdrop-blur-xl border-b border-border-subtle">
      {/* Token expired banner */}
      {isTokenExpired && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 md:px-6 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-[11px] text-destructive font-medium truncate">❌ Conexão Meta expirada</span>
          <button onClick={() => connectMeta()} className="text-[11px] text-destructive underline font-semibold ml-1 shrink-0">Reconectar →</button>
        </div>
      )}

      {/* Token expiring soon banner */}
      {!isTokenExpired && isTokenExpiringSoon && (
        <div className="bg-data-yellow/10 border-b border-data-yellow/30 px-4 md:px-6 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-data-yellow shrink-0" />
          <span className="text-[11px] text-data-yellow font-medium truncate">
            ⚠️ Conexão Meta expira em {daysUntilExpiry} dia{daysUntilExpiry !== 1 ? 's' : ''}
          </span>
          <button onClick={() => connectMeta()} className="text-[11px] text-data-yellow underline font-semibold ml-1 shrink-0">Reconectar →</button>
        </div>
      )}

      {/* Main header row */}
      <div className="h-[56px] flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {isMobile && onOpenSidebar && (
            <button onClick={onOpenSidebar} className="p-1 text-text-muted hover:text-text-primary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-[15px] font-semibold text-text-primary">{pageTitle}</h1>
            <p className="text-[11px] text-text-muted">
              {subtitle}
              {!isMobile && lastTime && <span className="ml-2"><Clock className="w-3 h-3 inline" /> {lastTime}</span>}
              {!isMobile && isFromCache && cacheTime && (
                <span className="ml-2 text-data-blue">
                  <RefreshCw className="w-3 h-3 inline" /> cache {cacheTime}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Desktop: full control bar */}
        {!isMobile && (
          <div className="flex items-center bg-bg-card border border-border-default rounded-[10px] p-[6px] gap-1">
            {periodSelector}
            {isCustomActive && dateRange && (
              <>
                <div className="w-px h-5 bg-border-default" />
                <div className="flex items-center gap-1 bg-data-blue/10 border border-data-blue/30 rounded-full px-2.5 py-0.5">
                  <Calendar className="w-3 h-3 text-data-blue" />
                  <span className="text-[10px] text-data-blue font-medium whitespace-nowrap">
                    📅 {dateRange.from.split('-').reverse().slice(0, 2).join('/')} → {dateRange.to.split('-').reverse().slice(0, 2).join('/')}
                  </span>
                  <button onClick={() => setDateRange(null)} className="text-data-blue hover:text-white transition-colors ml-0.5">
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
            <div className="w-px h-5 bg-border-default" />
            <AlertsPanel />
            <div className="w-px h-5 bg-border-default" />
            {isStale && (
              <button
                onClick={handleAtualizar}
                className="bg-data-yellow/10 border border-data-yellow/30 text-data-yellow text-[10px] px-2 py-0.5 rounded-full hover:bg-data-yellow/20 transition-colors"
              >
                ⚠ Dados desatualizados
              </button>
            )}
            <button
              className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold text-white rounded-lg gradient-blue transition-all hover:opacity-90 hover:-translate-y-px disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleAtualizar}
              disabled={loading || (activeAccountIds.length === 0 && !selectedAccountId)}
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Atualizando...</>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5" />Atualizar</>
              )}
            </button>
          </div>
        )}

        {/* Mobile: only alerts + update button */}
        {isMobile && (
          <div className="flex items-center gap-2">
            <AlertsPanel />
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-lg gradient-blue transition-all disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleAtualizar}
              disabled={loading || (activeAccountIds.length === 0 && !selectedAccountId)}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile: second row with account + period */}
      {isMobile && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-border-subtle overflow-x-auto">
          {periodSelector}
        </div>
      )}

      {/* Metrics bar */}
      <div className="h-9 flex items-center gap-2 md:gap-4 px-4 md:px-6 bg-bg-card border-t border-border-subtle text-[11px] md:text-[12px] overflow-x-auto">
        {ad ? (
          <>
            <span className={`font-bold whitespace-nowrap ${getRoasColor(avgRoas, roasTarget)}`}>
              ROAS {avgRoas.toFixed(1)}x
              {delta !== null && delta !== 0 && <span className="opacity-70 ml-1">{delta >= 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(0)}%</span>}
            </span>
            <span className="text-border-default">|</span>
            <span className="text-text-primary whitespace-nowrap">Gasto: <span className="font-semibold">{currencySymbol} {(totalSpend / 1000).toFixed(1)}k</span></span>
            <span className="text-border-default hidden sm:inline">|</span>
            <span className="text-text-primary whitespace-nowrap hidden sm:inline">Receita: <span className="font-semibold text-data-green">{currencySymbol} {(totalRevenue / 1000).toFixed(1)}k</span></span>
            <span className="text-border-default hidden md:inline">|</span>
            <span className="text-text-primary whitespace-nowrap hidden md:inline">{aboveMeta} acima • {belowMeta} abaixo</span>
          </>
        ) : (
          <span className="text-text-muted">
            Clique em Atualizar para carregar dados
          </span>
        )}
      </div>
    </div>
  );
}
