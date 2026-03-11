import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, RefreshCw, Menu, Bell } from 'lucide-react';
import AlertsPanel from './AlertsPanel';
import PeriodSelector from '@/components/ui/PeriodSelector';

const C = {
  bg:            '#FFFFFF',
  border:        '#E4E7EF',
  accent:        '#2563EB',
  accentHover:   '#1D4ED8',
  accentSubtle:  '#EFF4FF',
  accentBorder:  '#C7D7FD',
  textPrimary:   '#0F1523',
  textSecondary: '#5A6478',
  textMuted:     '#9BA5B7',
  bgHover:       '#F1F3F8',
  green:         '#16A34A',
  red:           '#DC2626',
} as const;

const tabLabels: Record<string, string> = {
  overview:      'Visão Geral',
  campaigns:     'Campanhas',
  'action-plan': 'CORTEX IA',
  comparison:    'Comparação',
  consolidated:  'Relatórios',
  rules:         'Regras',
  chat:          'Chat',
  report:        'Notificações',
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

  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      if (!cacheTimestamp) { setLastUpdatedText(null); return; }
      const diffMs  = Date.now() - cacheTimestamp;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1)  setLastUpdatedText('Agora');
      else if (diffMin < 60) setLastUpdatedText(`${diffMin}min atrás`);
      else setLastUpdatedText(`${Math.floor(diffMin / 60)}h atrás`);
    };
    compute();
    const interval = setInterval(compute, 30000);
    return () => clearInterval(interval);
  }, [cacheTimestamp]);

  const handleAtualizar = useCallback(async () => {
    if (activeAccountIds.length === 0) return;
    await Promise.all(activeAccountIds.map(id => analyze(id)));
  }, [activeAccountIds, analyze]);

  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between px-6"
      style={{ height: 52, background: C.bg, borderBottom: `1px solid ${C.border}` }}
    >
      {/* ── Left ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {isMobile && onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="p-1 rounded"
            style={{ color: C.textMuted }}
            onMouseEnter={e => (e.currentTarget.style.background = C.bgHover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, color: C.textPrimary, letterSpacing: '-0.3px' }}>
          {tabLabels[activeTab] || 'Dashboard'}
        </h1>

        {(selectedAccountName || activeAccountIds.length > 0) && (
          <span
            className="hidden md:inline-block"
            style={{
              fontSize: 11, fontWeight: 600, color: C.textSecondary,
              background: C.bgHover, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '3px 10px',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {activeAccountIds.length > 1
              ? `${activeAccountIds.length} contas`
              : selectedAccountName || 'Conta activa'}
          </span>
        )}
      </div>

      {/* ── Right ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">

        {/* Period Selector */}
        <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />

        <div className="w-px h-4 hidden sm:block" style={{ background: C.border }} />

        {/* Last updated */}
        {lastUpdatedText && (
          <span className="hidden sm:inline" style={{ fontSize: 11, color: C.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
            Atualizado {lastUpdatedText}
          </span>
        )}

        {/* Refresh button — PRIMARY */}
        <button
          onClick={handleAtualizar}
          disabled={loading || (activeAccountIds.length === 0 && !selectedAccountId)}
          className="flex items-center gap-1.5 rounded-md transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
          style={{
            background: loading ? '#1D4ED8' : C.accent,
            color: '#FFFFFF',
            fontSize: 13, fontWeight: 600,
            padding: '6px 12px',
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
          }}
          onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = C.accentHover)}
          onMouseLeave={e => !loading && ((e.currentTarget as HTMLElement).style.background = C.accent)}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />
          }
          {!isMobile && <span>{loading ? 'Atualizando' : 'Atualizar'}</span>}
        </button>

        <div className="w-px h-4 hidden sm:block" style={{ background: C.border }} />

        {/* Alerts */}
        <AlertsPanel />

        {/* Connection status */}
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{ background: isTokenExpired ? '#D97706' : isConnected ? C.green : C.textMuted }}
          />
          {isTokenExpired ? (
            <button
              onClick={() => connectMeta()}
              style={{ fontSize: 11, color: C.red, fontWeight: 500 }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
            >
              Reconectar
            </button>
          ) : isConnected ? (
            <span style={{ fontSize: 11, color: C.green, fontFamily: "'DM Sans', sans-serif" }}>Conectado</span>
          ) : (
            <span style={{ fontSize: 11, color: C.textMuted }}>Desconectado</span>
          )}
        </div>
      </div>
    </div>
  );
}
