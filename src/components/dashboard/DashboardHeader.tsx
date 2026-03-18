import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, Menu, RefreshCw, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useIsMobile } from '@/hooks/use-mobile';
import AlertsPanel from './AlertsPanel';
import PeriodSelector from '@/components/ui/PeriodSelector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    activeTab,
    activeAccountIds,
    selectedAccountId,
    selectedPeriod,
    setSelectedPeriod,
    cacheTimestamp,
    selectedAccountName,
  } = useDashboard();
  const { isConnected, isTokenExpired, connectMeta } = useMetaConnection();
  const { analyze, loading } = useMetaData();
  const isMobile = useIsMobile();

  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      if (!cacheTimestamp) {
        setLastUpdatedText(null);
        return;
      }

      const diffMs = Date.now() - cacheTimestamp;
      const diffMin = Math.floor(diffMs / 60000);

      if (diffMin < 1) setLastUpdatedText('Agora');
      else if (diffMin < 60) setLastUpdatedText(`${diffMin}min atrás`);
      else setLastUpdatedText(`${Math.floor(diffMin / 60)}h atrás`);
    };

    compute();
    const interval = window.setInterval(compute, 30000);
    return () => window.clearInterval(interval);
  }, [cacheTimestamp]);

  const handleRefresh = useCallback(async () => {
    if (activeAccountIds.length === 0) return;
    await Promise.all(activeAccountIds.map((id) => analyze(id)));
  }, [activeAccountIds, analyze]);

  const statusLabel = useMemo(() => {
    if (isTokenExpired) return 'Token expirado';
    if (isConnected) return 'Meta conectada';
    return 'Meta desconectada';
  }, [isConnected, isTokenExpired]);

  const tabLabel = tabLabels[activeTab] || 'Dashboard';
  const accountLabel =
    activeAccountIds.length > 1
      ? `${activeAccountIds.length} contas ativas`
      : selectedAccountName || (selectedAccountId ? 'Conta ativa' : 'Nenhuma conta');

  return (
    <header className="sticky top-0 z-30 border-b border-border-default bg-background/88 backdrop-blur-xl">
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          {isMobile && onOpenSidebar ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenSidebar}
              className="size-10 rounded-2xl border-border-default bg-card/80 text-text-secondary hover:bg-accent hover:text-text-primary"
            >
              <Menu className="size-5" />
            </Button>
          ) : null}

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-display text-lg font-bold tracking-[-0.04em] text-text-primary md:text-[1.35rem]">
                {tabLabel}
              </h1>
              {activeTab === 'action-plan' ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  AI
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-text-secondary">
              <span className="truncate">{accountLabel}</span>
              <span className="hidden h-1 w-1 rounded-full bg-border-default sm:block" />
              <span className="hidden sm:inline">Período {selectedPeriod}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden lg:flex items-center rounded-[1.25rem] border border-border-default bg-card/80 px-3 py-2 shadow-sm">
            <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
          </div>

          <div className="hidden xl:flex items-center gap-2 rounded-[1.25rem] border border-border-default bg-card/80 px-3 py-2 text-xs text-text-secondary shadow-sm">
            <span
              className={cn(
                'size-2 rounded-full',
                isTokenExpired ? 'bg-warning' : isConnected ? 'bg-success' : 'bg-muted-foreground',
              )}
            />
            <span>{statusLabel}</span>
            {isTokenExpired ? (
              <button className="font-semibold text-primary transition-colors hover:text-primary-dark" onClick={() => connectMeta()}>
                Reconectar
              </button>
            ) : isConnected ? (
              <Wifi className="size-3.5 text-success" />
            ) : (
              <WifiOff className="size-3.5 text-text-muted" />
            )}
          </div>

          {lastUpdatedText ? (
            <div className="hidden md:flex items-center gap-2 rounded-[1.25rem] border border-border-default bg-card/80 px-3 py-2 text-xs text-text-secondary shadow-sm">
              <Sparkles className="size-3.5 text-primary" />
              <span>Atualizado {lastUpdatedText}</span>
            </div>
          ) : null}

          <div className="hidden md:block">
            <AlertsPanel />
          </div>

          <Button
            onClick={handleRefresh}
            disabled={loading || (activeAccountIds.length === 0 && !selectedAccountId)}
            className="h-10 rounded-2xl px-4 text-sm font-semibold shadow-[0_18px_36px_-22px_hsl(var(--primary)/0.9)]"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span className="hidden sm:inline">{loading ? 'Atualizando' : 'Atualizar'}</span>
          </Button>

          <div className="md:hidden">
            <AlertsPanel />
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle px-4 py-2 lg:hidden md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 overflow-hidden rounded-[1.1rem] border border-border-default bg-card/80 px-3 py-2 shadow-sm">
            <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
          </div>

          <div className="flex items-center gap-2 rounded-[1.1rem] border border-border-default bg-card/80 px-3 py-2 text-xs text-text-secondary shadow-sm">
            <span
              className={cn(
                'size-2 rounded-full',
                isTokenExpired ? 'bg-warning' : isConnected ? 'bg-success' : 'bg-muted-foreground',
              )}
            />
            <span className="hidden sm:inline">{statusLabel}</span>
            {isTokenExpired ? (
              <button className="font-semibold text-primary transition-colors hover:text-primary-dark" onClick={() => connectMeta()}>
                Reconectar
              </button>
            ) : null}
            {!isTokenExpired && isConnected ? <Bell className="size-3.5 text-primary/80 sm:hidden" /> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
