import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Menu, RefreshCw } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useIsMobile } from '@/hooks/use-mobile';
import AlertsPanel from './AlertsPanel';
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
    cacheTimestamp,
    selectedAccountName,
    analysisData,
    isStale,
    setSelectedAccountId,
    setSelectedAccountName,
    setSelectedAccountCurrency,
  } = useDashboard();
  const { adAccounts } = useMetaConnection();
  const { analyze, loading } = useMetaData();
  const isMobile = useIsMobile();

  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const compute = () => {
      if (!cacheTimestamp) {
        setLastUpdatedText(null);
        return;
      }

      const diffMs = Date.now() - cacheTimestamp;
      const diffMin = Math.floor(diffMs / 60000);

      if (diffMin < 1) setLastUpdatedText('agora');
      else if (diffMin < 60) setLastUpdatedText(`há ${diffMin}min`);
      else setLastUpdatedText(`há ${Math.floor(diffMin / 60)}h`);
    };

    compute();
    const interval = window.setInterval(compute, 30000);
    return () => window.clearInterval(interval);
  }, [cacheTimestamp]);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setAccountsOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const availableAccounts = useMemo(() => {
    if (activeAccountIds.length === 0) return adAccounts;
    return adAccounts.filter((account) => account.account_id && activeAccountIds.includes(account.account_id));
  }, [adAccounts, activeAccountIds]);

  const handleRefresh = useCallback(async () => {
    if (activeAccountIds.length > 0) {
      await Promise.all(activeAccountIds.map((id) => analyze(id)));
      return;
    }

    if (selectedAccountId) {
      await analyze(selectedAccountId);
    }
  }, [activeAccountIds, analyze, selectedAccountId]);

  const tabLabel = tabLabels[activeTab] || 'Dashboard';
  const accountLabel =
    selectedAccountName ||
    availableAccounts.find((account) => account.account_id === selectedAccountId)?.account_name ||
    (selectedAccountId ? 'Conta ativa' : 'Sem conta');

  const totals = useMemo(() => {
    const campaigns = analysisData?.campaigns?.filter((campaign) => campaign?.spend > 0) || [];
    if (!campaigns.length) {
      return { roas: '—', spend: '—', revenue: '—' };
    }

    const spend = campaigns.reduce((sum, campaign) => sum + (campaign?.spend || 0), 0);
    const revenue = campaigns.reduce((sum, campaign) => sum + (campaign?.revenue || 0), 0);
    const roas = spend > 0 ? `${(revenue / spend).toFixed(1)}x` : '—';

    const formatMoney = (value: number) => `${value.toFixed(value >= 100 ? 0 : 2)}`;

    return {
      roas,
      spend: spend > 0 ? formatMoney(spend) : '—',
      revenue: revenue > 0 ? formatMoney(revenue) : '—',
    };
  }, [analysisData]);

  return (
    <header className="sticky top-0 z-30 overflow-visible border-b border-[hsl(0_0%_100%/0.05)] bg-[hsl(var(--bg-primary))/0.92] backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 border-b border-[hsl(0_0%_100%/0.05)] px-4">
        {isMobile && onOpenSidebar ? (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenSidebar}
            className="size-9 rounded-xl border-[hsl(0_0%_100%/0.1)] bg-[hsl(var(--bg-card))] text-slate-300 hover:bg-[hsl(var(--bg-elevated))] hover:text-white"
          >
            <Menu className="size-4" />
          </Button>
        ) : null}

        <div ref={dropdownRef} className="relative min-w-0">
          <button
            onClick={() => setAccountsOpen((prev) => !prev)}
            className="inline-flex max-w-[260px] items-center gap-2 rounded-xl border border-[hsl(0_0%_100%/0.1)] bg-[hsl(var(--bg-card))] px-3 py-2 text-sm text-slate-200"
          >
            <span className="size-2 rounded-full bg-[hsl(var(--green))]" />
            <span className="truncate">{accountLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          </button>

          {accountsOpen ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[280px] rounded-xl border border-[hsl(0_0%_100%/0.1)] bg-[hsl(var(--bg-elevated))] p-2 shadow-xl">
              {availableAccounts.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">Nenhuma conta disponível</div>
              ) : (
                availableAccounts.map((account) => {
                  const isSelected = account.account_id === selectedAccountId;
                  return (
                    <button
                      key={account.id}
                      onClick={() => {
                        if (!account.account_id) return;
                        setSelectedAccountId(account.account_id);
                        setSelectedAccountName(account.account_name || account.account_id);
                        setSelectedAccountCurrency(account.currency || null);
                        setAccountsOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        isSelected ? 'bg-[hsl(var(--accent)/0.16)] text-indigo-300' : 'text-slate-300 hover:bg-[hsl(0_0%_100%/0.06)]',
                      )}
                    >
                      <span className="size-2 rounded-full bg-[hsl(var(--green))]" />
                      <span className="truncate">{account.account_name || account.account_id}</span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        <span className="h-5 w-px bg-[hsl(0_0%_100%/0.08)]" />

        <Button
          onClick={handleRefresh}
          disabled={loading || (!selectedAccountId && activeAccountIds.length === 0)}
          className="h-9 rounded-xl border border-[hsl(0_0%_100%/0.1)] bg-[hsl(var(--bg-card))] px-3 text-xs font-semibold text-slate-200 hover:bg-[hsl(var(--bg-elevated))]"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Atualizar
          {isStale ? <span className="ml-1.5 size-2 rounded-full bg-[hsl(var(--yellow))] animate-pulse" /> : null}
        </Button>

        <span className="hidden text-xs text-slate-500 md:inline">{tabLabel}</span>

        <div className="ml-auto flex items-center">
          <AlertsPanel />
        </div>
      </div>

      <div className="flex h-8 items-center gap-3 px-4 text-[11px]">
        <span className="text-slate-500">ROAS:</span>
        <span className="font-semibold text-slate-300">{totals.roas}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">Gasto:</span>
        <span className="font-semibold text-slate-300">{totals.spend}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">Receita:</span>
        <span className="font-semibold text-slate-300">{totals.revenue}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500">Atualizado</span>
        <span className="font-semibold text-slate-300">{lastUpdatedText || '—'}</span>
      </div>
    </header>
  );
}
