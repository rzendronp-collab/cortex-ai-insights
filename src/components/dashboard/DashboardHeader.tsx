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
  'action-plan': 'CORTEX',
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
    activeTab, activeAccountIds, selectedAccountName,
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
  const isCustomActive = selectedPeriod === 'custom' && !!dateRange;

  // Account name — use selectedAccountName from context, or look up from adAccounts
  const selectedAccount = adAccounts.find(a => a.account_id === selectedAccountId);
  const accountName = selectedAccountName || selectedAccount?.account_name || (selectedAccountId ? `act_${selectedAccountId}` : 'Selecione uma conta');

  // Period pills
  const periodPills = (
    <div className="flex items-center gap-0.5">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => setSelectedPeriod(p)}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all duration-150 ${
            selectedPeriod === p && !isCustomActive
              ? 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30'
              : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937]/50'
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
    <div className="sticky top-0 z-30 bg-[#070B16]/95 backdrop-blur-xl border-b border-[#1F2937]/60">
      {/* Token expired banner */}
      {isTokenExpired && (
        <div className="bg-[#EF4444]/8 border-b border-[#EF4444]/20 px-4 md:px-6 py-1.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
          <span className="text-[10px] text-[#EF4444] font-medium truncate">Conexão Meta expirada</span>
          <button onClick={() => connectMeta()} className="text-[10px] text-[#EF4444] underline font-semibold ml-1 shrink-0">Reconectar</button>
        </div>
      )}

      {/* Token expiring soon banner */}
      {!isTokenExpired && isTokenExpiringSoon && (
        <div className="bg-[#F59E0B]/8 border-b border-[#F59E0B]/20 px-4 md:px-6 py-1.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
          <span className="text-[10px] text-[#F59E0B] font-medium truncate">
            Conexão Meta expira em {daysUntilExpiry} dia{daysUntilExpiry !== 1 ? 's' : ''}
          </span>
          <button onClick={() => connectMeta()} className="text-[10px] text-[#F59E0B] underline font-semibold ml-1 shrink-0">Reconectar</button>
        </div>
      )}

      {/* Main header — 52px */}
      <div className="h-[52px] flex items-center justify-between px-4 md:px-5">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && onOpenSidebar && (
            <button onClick={onOpenSidebar} className="p-1 text-[#6B7280] hover:text-[#F9FAFB] transition-colors">
              <Menu className="w-4.5 h-4.5" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-semibold text-[#F9FAFB] truncate">{accountName}</h1>
              {lastTime && !isMobile && (
                <span className="flex items-center gap-1 text-[9px] text-[#6B7280]">
                  <Clock className="w-2.5 h-2.5" /> {lastTime}
                </span>
              )}
            </div>
            {!isMobile && (
              <p className="text-[10px] text-[#6B7280] mt-0.5">{tabLabels[activeTab] || 'Dashboard'}</p>
            )}
          </div>
        </div>

        {/* Desktop controls */}
        {!isMobile && (
          <div className="flex items-center gap-2">
            {periodPills}

            {isCustomActive && dateRange && (
              <div className="flex items-center gap-1 bg-[#6366F1]/10 border border-[#6366F1]/25 rounded-md px-2 py-0.5">
                <Calendar className="w-2.5 h-2.5 text-[#818CF8]" />
                <span className="text-[9px] text-[#818CF8] font-medium whitespace-nowrap">
                  {dateRange.from.split('-').reverse().slice(0, 2).join('/')} → {dateRange.to.split('-').reverse().slice(0, 2).join('/')}
                </span>
                <button onClick={() => setDateRange(null)} className="text-[#818CF8] hover:text-white transition-colors ml-0.5">
                  <XIcon className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            <div className="w-px h-4 bg-[#1F2937]" />

            <AlertsPanel />

            {isStale && (
              <button
                onClick={handleAtualizar}
                className="text-[9px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/25 px-2 py-0.5 rounded-md hover:bg-[#F59E0B]/15 transition-colors"
              >
                Desatualizado
              </button>
            )}

            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white rounded-lg bg-[#6366F1] hover:bg-[#5558E6] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
              onClick={handleAtualizar}
              disabled={loading || (activeAccountIds.length === 0 && !selectedAccountId)}
            >
              {loading ? (
                <><Loader2 className="w-3 h-3 animate-spin" />Atualizando</>
              ) : (
                <><RefreshCw className="w-3 h-3" />Atualizar</>
              )}
            </button>
          </div>
        )}

        {/* Mobile controls */}
        {isMobile && (
          <div className="flex items-center gap-2">
            <AlertsPanel />
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white rounded-lg bg-[#6366F1] disabled:opacity-40"
              onClick={handleAtualizar}
              disabled={loading || (activeAccountIds.length === 0 && !selectedAccountId)}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile period row */}
      {isMobile && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-t border-[#1F2937]/40 overflow-x-auto hide-scrollbar">
          {periodPills}
        </div>
      )}

      {/* Metrics bar — compact */}
      {ad && (
        <div className="h-7 flex items-center gap-3 px-4 md:px-5 bg-[#0D1117] border-t border-[#1F2937]/40 text-[10px] overflow-x-auto hide-scrollbar">
          <span className={`font-bold whitespace-nowrap ${getRoasColor(avgRoas, roasTarget)}`}>
            ROAS {avgRoas.toFixed(1)}x
            {delta !== null && delta !== 0 && <span className="opacity-60 ml-1">{delta >= 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(0)}%</span>}
          </span>
          <span className="text-[#1F2937]">·</span>
          <span className="text-[#9CA3AF] whitespace-nowrap">Gasto <span className="font-semibold text-[#F9FAFB]">{currencySymbol} {(totalSpend / 1000).toFixed(1)}k</span></span>
          <span className="text-[#1F2937] hidden sm:inline">·</span>
          <span className="text-[#9CA3AF] whitespace-nowrap hidden sm:inline">Receita <span className="font-semibold text-[#10B981]">{currencySymbol} {(totalRevenue / 1000).toFixed(1)}k</span></span>
          {isFromCache && (
            <>
              <span className="text-[#1F2937] hidden md:inline">·</span>
              <span className="text-[#6366F1]/60 hidden md:inline whitespace-nowrap">cache</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
