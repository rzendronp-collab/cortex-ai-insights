import { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, RefreshCw, Menu, Circle } from 'lucide-react';
import AlertsPanel from './AlertsPanel';

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
    activeTab, activeAccountIds, selectedAccountId,
  } = useDashboard();
  const { isConnected, isTokenExpired, connectMeta } = useMetaConnection();
  const { analyze, loading } = useMetaData();
  const isMobile = useIsMobile();
  const { profile } = useDashboard() as any;

  const handleAtualizar = useCallback(async () => {
    if (activeAccountIds.length === 0) return;
    for (const id of activeAccountIds) {
      await analyze(id);
    }
  }, [activeAccountIds, analyze]);

  const initials = 'U';

  return (
    <div className="sticky top-0 z-30 h-14 bg-[#0E1420] border-b border-[#1E2A42] flex items-center justify-between px-5">
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
      </div>

      {/* Right: status + refresh + alerts */}
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

        <AlertsPanel />

        {/* Refresh button */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#7A8FAD] rounded-lg hover:bg-white/[0.04] hover:text-[#F0F4FF] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
          onClick={handleAtualizar}
          disabled={loading || (activeAccountIds.length === 0 && !selectedAccountId)}
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
