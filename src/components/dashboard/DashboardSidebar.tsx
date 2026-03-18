import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Brain,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsDialog from './SettingsDialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  onCloseMobile?: () => void;
}

type AccountStatus = 'green' | 'red' | 'yellow' | null;

type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  special?: boolean;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campanhas', icon: TrendingUp },
  { id: 'action-plan', label: 'CORTEX', icon: Brain, special: true },
  { id: 'comparison', label: 'Comparação', icon: Calendar },
  { id: 'consolidated', label: 'Consolidado', icon: FileText },
  { id: 'chat', label: 'Chat IA', icon: MessageSquare, disabled: true },
  { id: 'report', label: 'Relatório', icon: Bell, disabled: true },
];

const statusClasses: Record<Exclude<AccountStatus, null>, string> = {
  green: 'bg-success/80',
  red: 'bg-destructive/80',
  yellow: 'bg-warning/80',
};

export default function DashboardSidebar({ onCloseMobile }: DashboardSidebarProps) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { adAccounts, isConnected, isTokenExpired, connectMeta } = useMetaConnection();
  const {
    activeTab,
    setActiveTab,
    activeAccountIds,
    toggleActiveAccount,
    setActiveAccountIds,
    analysisCache,
    analyzeRef,
    setSelectedAccountId,
    setSelectedAccountName,
    setSelectedAccountCurrency,
  } = useDashboard();

  const [openBMs, setOpenBMs] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState(false);

  const initials = useMemo(
    () =>
      profile?.name
        ?.split(' ')
        .map((name) => name[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U',
    [profile?.name, user?.email],
  );

  const accountsByBm = useMemo(() => {
    return adAccounts.reduce((acc, account) => {
      const bmName = account.business_name || 'Pessoais';
      if (!acc[bmName]) acc[bmName] = [];
      acc[bmName].push(account);
      return acc;
    }, {} as Record<string, typeof adAccounts>);
  }, [adAccounts]);

  const bmEntries = useMemo(() => Object.entries(accountsByBm), [accountsByBm]);

  useEffect(() => {
    if (!bmEntries.length) return;
    setOpenBMs((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return { [bmEntries[0][0]]: true };
    });
  }, [bmEntries]);

  const handleConnectMeta = async () => {
    setConnecting(true);
    try {
      await connectMeta();
    } catch {
      toast.error('Erro ao conectar Meta');
    } finally {
      setConnecting(false);
    }
  };

  const handleNavClick = (item: NavItem) => {
    if (item.disabled) return;
    setActiveTab(item.id);
    onCloseMobile?.();
  };

  const getAccountStatus = (accountId: string | null): AccountStatus => {
    if (!accountId) return null;
    const target = profile?.roas_target || 3;

    for (const [key, entry] of Object.entries(analysisCache)) {
      if (!key.startsWith(`${accountId}__`) || !entry?.data?.campaigns?.length) continue;

      const totals = entry.data.campaigns.reduce(
        (acc, campaign) => ({
          spend: acc.spend + (campaign?.spend || 0),
          revenue: acc.revenue + (campaign?.revenue || 0),
        }),
        { spend: 0, revenue: 0 },
      );

      if (totals.spend <= 0) return 'yellow';
      const roas = totals.revenue / totals.spend;
      return roas >= target ? 'green' : 'red';
    }

    return null;
  };

  const handleSelectAll = () => {
    const allIds = adAccounts.map((account) => account.account_id).filter(Boolean) as string[];
    setActiveAccountIds(allIds);
    localStorage.setItem('cortexads_active_accounts', JSON.stringify(allIds));

    const firstAccount = adAccounts.find((account) => account.account_id);
    if (firstAccount?.account_id) {
      setSelectedAccountId(firstAccount.account_id);
      setSelectedAccountName(firstAccount.account_name || firstAccount.account_id);
      setSelectedAccountCurrency(firstAccount.currency || null);
    }
  };

  const handleDeselectAll = () => {
    setActiveAccountIds([]);
    setSelectedAccountId(null);
    setSelectedAccountName(null);
    setSelectedAccountCurrency(null);
    localStorage.setItem('cortexads_active_accounts', JSON.stringify([]));
  };

  const hasAccounts = isConnected && !isTokenExpired && adAccounts.length > 0;

  const renderNavItem = (item: NavItem) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-150',
          item.disabled && 'cursor-not-allowed text-slate-500',
          item.special && !isActive && !item.disabled && 'border border-[hsl(var(--accent)/0.15)] bg-[hsl(var(--accent)/0.06)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.12)]',
          item.special && isActive && 'border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.15)] text-indigo-300',
          !item.special && !item.disabled && !isActive && 'text-slate-400 hover:bg-[hsl(0_0%_100%/0.04)] hover:text-white',
          !item.special && !item.disabled && isActive && 'bg-[hsl(0_0%_100%/0.08)] text-white',
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="flex min-h-screen w-[220px] min-w-[220px] flex-col border-r border-[hsl(0_0%_100%/0.05)] bg-[hsl(var(--bg-sidebar-v5))] text-white">
      <div className="flex items-center gap-2.5 border-b border-[hsl(0_0%_100%/0.05)] px-4 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent-hover))] text-primary-foreground shadow-[0_12px_28px_-18px_hsl(var(--accent)/0.9)]">
          <Zap className="size-4" />
        </div>
        <span className="truncate text-sm font-bold tracking-tight">CortexAds</span>
        <span className="ml-auto rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] text-indigo-400">v5</span>
        {onCloseMobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 size-8 rounded-lg text-slate-400 hover:bg-[hsl(0_0%_100%/0.06)] hover:text-white"
            onClick={onCloseMobile}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 pt-4 pb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">NAVEGAÇÃO</div>

        <div className="mt-2 space-y-1 px-3">
          {navItems.slice(0, 2).map(renderNavItem)}
          <div className="my-1 border-t border-[hsl(0_0%_100%/0.05)]" />
          {renderNavItem(navItems[2])}
          <div className="my-1 border-t border-[hsl(0_0%_100%/0.05)]" />
          {navItems.slice(3).map(renderNavItem)}
        </div>

        <div className="px-4 pt-4 pb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">CONTA META</div>

        <div className="mt-2 px-3">
          {!isConnected || isTokenExpired ? (
            <Button
              className="h-10 w-full rounded-xl bg-[hsl(var(--accent))] text-white shadow-[0_16px_30px_-20px_hsl(var(--accent)/0.9)] hover:bg-[hsl(var(--accent-hover))]"
              onClick={handleConnectMeta}
              disabled={connecting}
            >
              {connecting ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {connecting ? 'Conectando...' : isTokenExpired ? 'Reconectar Meta' : 'Conectar Meta'}
            </Button>
          ) : hasAccounts ? (
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-3 px-1 text-[11px]">
                <button onClick={handleSelectAll} className="font-medium text-[hsl(var(--accent))] transition-colors hover:text-indigo-300">
                  Todas
                </button>
                <button onClick={handleDeselectAll} className="font-medium text-slate-500 transition-colors hover:text-slate-300">
                  Limpar
                </button>
              </div>

              <div className="hide-scrollbar max-h-[40vh] space-y-2 overflow-y-auto">
                {bmEntries.map(([bmName, accounts]) => {
                  const isOpen = openBMs[bmName] ?? true;

                  return (
                    <section key={bmName} className="rounded-xl border border-[hsl(0_0%_100%/0.06)] bg-[hsl(var(--bg-card-v5))]">
                      <button
                        onClick={() => setOpenBMs((prev) => ({ ...prev, [bmName]: !isOpen }))}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[hsl(0_0%_100%/0.04)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">{bmName}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{accounts.length} conta{accounts.length === 1 ? '' : 's'}</p>
                        </div>
                        {isOpen ? <ChevronDown className="size-4 text-slate-500" /> : <ChevronRight className="size-4 text-slate-500" />}
                      </button>

                      {isOpen ? (
                        <div className="space-y-1 border-t border-[hsl(0_0%_100%/0.05)] px-2 py-2">
                          {accounts.map((account) => {
                            const accountId = account.account_id || '';
                            const isChecked = !!accountId && activeAccountIds.includes(accountId);
                            const status = getAccountStatus(account.account_id);

                            return (
                              <button
                                key={account.id}
                                onClick={() => {
                                  if (!account.account_id) return;

                                  const wasActive = activeAccountIds.includes(account.account_id);
                                  toggleActiveAccount(account.account_id);

                                  if (!wasActive) {
                                    setSelectedAccountId(account.account_id);
                                    setSelectedAccountName(account.account_name || account.account_id);
                                    setSelectedAccountCurrency(account.currency || null);
                                    setTimeout(() => analyzeRef.current?.(account.account_id), 300);
                                  }
                                }}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[12px] transition-all duration-150',
                                  isChecked ? 'bg-[hsl(0_0%_100%/0.08)] text-white' : 'text-slate-400 hover:bg-[hsl(0_0%_100%/0.04)] hover:text-white',
                                )}
                              >
                                <span className={cn('size-2 shrink-0 rounded-full', status ? statusClasses[status] : 'bg-success/80')} />
                                <span className="min-w-0 flex-1 truncate">{account.account_name || 'Sem nome'}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[hsl(0_0%_100%/0.06)] bg-[hsl(var(--bg-card-v5))] px-3 py-4 text-center text-xs text-slate-400">
              Nenhuma conta disponível.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[hsl(0_0%_100%/0.05)] px-4 py-3">
        <div className="px-0 pt-1 pb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">CONFIGURAÇÕES</div>
        <SettingsDialog />

        <div className="mt-3 flex items-center gap-2 border-t border-[hsl(0_0%_100%/0.05)] pt-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.14)] text-sm font-bold text-[hsl(var(--accent))]">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-slate-300">{profile?.name || user?.email || 'Utilizador'}</p>
            <p className="truncate text-[10px] text-slate-500">{adAccounts.length} contas • {activeAccountIds.length} ativa{activeAccountIds.length === 1 ? '' : 's'}</p>
          </div>

          <button onClick={signOut} className="text-slate-500 transition-colors hover:text-white">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
