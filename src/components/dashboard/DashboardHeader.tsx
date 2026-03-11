import { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, RefreshCw, Menu, Circle, Calendar } from 'lucide-react';
import AlertsPanel from './AlertsPanel';
import PeriodSelector from '@/components/ui/PeriodSelector';

const tabLabels: Record<string, string> = {
  overview: 'Visão Geral',
  campaigns: 'Campanhas',
  'action-plan': 'CORTEX IA',
  comparison: 'Comparação',
  consolidated: 'Relatórios',
  rules: 'Regras',
  chat: 'Chat',
  report: 'Notificações',
};

interface DashboardHeaderProps {
  onOpenSidebar?: () => void;
}

export default function DashboardHeader({ onOpenSidebar }: DashboardHeaderProps) {
  const {
    activeTab, activeAccountIds, selectedAccountId, selectedPeriod, setSelectedPeriod,
    cacheTimestamp, selectedAccountName,
  } = useDashboard();
  const { isConnected, isTokenExpired, connectMeta } = useMetaConnection();
  const { analyze, loading } = useMetaData();
  const isMobile = useIsMobile();
  const { profile } = useProfile();

  const handleAtualizar = useCallback(async () => {
    if (activeAccountIds.length === 0) return;
    await Promise.all(activeAccountIds.map(id => analyze(id)));
  }, [activeAccountIds, analyze]);

  const initials = profile?.name
    ? profile.name.trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const lastUpdatedText = cacheTimestamp
    ? (() => {
        const diffMs = Date.now() - cacheTimestamp;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Agora';
        if (diffMin < 60) return `${diffMin}min atrás`;
        return `${Math.floor(diffMin / 60)}h atrás`;
      })()
    : null;

  return (
    <div className="sticky top-0 z-30 h-14 bg-[#080B14] border-b border-[#1E2A42] flex items-center justify-between px-6">
      {/* Left: section title */}
      <div className="flex items-center gap-3">
        {isMobile && onOpenSidebar && (
          <button onClick={onOpenSidebar} className="p-1 text-[#4A5F7A] hover:text-[#F0F4FF] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="font-display font-semibold text-[16px] text-[#F0F4FF] tracking-tight">
          {tabLabels[activeTab] || 'Dashboard'}
        </h1>
        {(selectedAccountName || activeAccountIds.length > 0) && (
          <span
            className="text-[11px] text-[#7A8FAD] hidden md:inline-block px-2 py-0.5 rounded-full"
            style={{ background: '#0E1420', border: '1px solid #1E2A42' }}
          >
            {activeAccountIds.length > 1
              ? `${activeAccountIds.length} contas`
              : selectedAccountName || 'Conta activa'}
          </span>
        )}
      </div>

      {/* Right: status + period + alerts + refresh */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <Circle className={`w-2 h-2 flex-shrink-0 ${
            isTokenExpired
              ? 'fill-[#F05252] text-[#F05252] animate-pulse-dot'
              : isConnected
                ? 'fill-[#22D07A] text-[#22D07A] animate-pulse-dot'
                : 'fill-[#4A5F7A] text-[#4A5F7A]'
          }`} />
          {isTokenExpired ? (
            <button onClick={() => connectMeta()} className="text-[11px] text-[#F05252] font-medium hover:underline">
              Reconectar
            </button>
          ) : isConnected ? (
            <span className="text-[11px] text-[#7A8FAD] hidden sm:inline">Conectado</span>
          ) : (
            <span className="text-[11px] text-[#4A5F7A] hidden sm:inline">Desconectado</span>
          )}
        </div>

        <div className="w-px h-5 bg-[#1E2A42]" />

        {/* Period Selector */}
        <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />

        <div className="w-px h-5 bg-[#1E2A42]" />

        <AlertsPanel />

        {/* Last Updated Text */}
        {lastUpdatedText && (
          <span className="text-[11px] text-[#4A5F7A] hidden sm:inline">Atualizado: {lastUpdatedText}</span>
        )}

        {/* Refresh button — PRIMARY BLUE */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white rounded-lg transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
          style={{
            backgroundColor: loading ? '#3A7AD9' : '#4F8EF7',
          }}
          onClick={handleAtualizar}
          disabled={loading || (activeAccountIds.length === 0 && !selectedAccountId)}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4080E0')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#4F8EF7')}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {!isMobile && (loading ? 'Atualizando' : 'Atualizar')}
        </button>
      </div>
    </div>
  );
}
