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
  Shield,
  Sparkles,
  TrendingUp,
  X,
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
  badge?: string;
};

const navItems: NavItem[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campanhas', icon: TrendingUp },
  { id: 'action-plan', label: 'CORTEX IA', icon: Brain, badge: 'AI' },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'rules', label: 'Regras', icon: Shield },
  { id: 'comparison', label: 'Comparação', icon: Calendar },
  { id: 'consolidated', label: 'Relatórios', icon: FileText },
  { id: 'report', label: 'Notificações', icon: Bell },
];

const statusClasses: Record<Exclude<AccountStatus, null>, string> = {
  green: 'bg-success/80',
  red: 'bg-destructive/80',
  yellow: 'bg-warning/80',
};

const primaryNavIds = ['overview', 'campaigns'];
const cortexNavIds = ['action-plan'];
const utilityNavIds = ['report'];

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

  const primaryNavItems = useMemo(() => navItems.filter((item) => primaryNavIds.includes(item.id)), []);
  const cortexNavItems = useMemo(() => navItems.filter((item) => cortexNavIds.includes(item.id)), []);
  const utilityNavItems = useMemo(() => navItems.filter((item) => utilityNavIds.includes(item.id)), []);
  const secondaryNavItems = useMemo(
    () => navItems.filter((item) => !primaryNavIds.includes(item.id) && !cortexNavIds.includes(item.id) && !utilityNavIds.includes(item.id)),
    [],
  );

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

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
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
    const isCortex = item.id === 'action-plan';
    const isMuted = item.id === 'report' && !isActive;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150',
          isActive && isCortex && 'border border-[hsl(var(--sidebar-cortex)/0.3)] bg-[hsl(var(--sidebar-cortex)/0.16)] text-[hsl(var(--primary))]',
          isActive && !isCortex && 'bg-[hsl(var(--sidebar-edge)/0.08)] text-sidebar-foreground',
          !isActive && isCortex &&
            'border border-[hsl(var(--sidebar-cortex)/0.16)] bg-[hsl(var(--sidebar-cortex)/0.06)] text-[hsl(var(--primary))] hover:border-[hsl(var(--sidebar-cortex)/0.28)] hover:bg-[hsl(var(--sidebar-cortex)/0.12)]',
          !isActive && !isCortex && !isMuted &&
            'text-text-secondary hover:bg-[hsl(var(--sidebar-edge)/0.04)] hover:text-sidebar-foreground',
          isMuted && 'text-[hsl(var(--sidebar-quiet))]',
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-semibold">{isCortex ? 'CORTEX' : item.label}</span>
        {item.badge ? (
          <span className={cn('rounded-md px-1.5 py-0.5 text-[9px] font-semibold', isCortex ? 'bg-[hsl(var(--sidebar-cortex)/0.14)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--sidebar-edge)/0.08)] text-text-muted')}>
            {item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <aside className="flex min-h-screen w-[220px] min-w-[220px] flex-col border-r border-[hsl(var(--sidebar-edge)/0.05)] bg-[hsl(var(--sidebar-shell))] text-sidebar-foreground">
      <div className="flex items-center gap-2.5 border-b border-[hsl(var(--sidebar-edge)/0.05)] px-4 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--primary-dark))] text-primary-foreground shadow-[0_12px_28px_-18px_hsl(var(--primary)/0.9)]">
          <Brain className="size-4" />
        </div>
        <span className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">CortexAds</span>
        <span className="ml-auto rounded-md bg-[hsl(var(--sidebar-cortex)/0.1)] px-1.5 py-0.5 text-[9px] font-semibold text-primary">v5</span>
        {onCloseMobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 size-8 rounded-lg text-text-muted hover:bg-[hsl(var(--sidebar-edge)/0.06)] hover:text-sidebar-foreground"
            onClick={onCloseMobile}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 text-[9px] font-semibold uppercase tracking-[0.28em] text-[hsl(var(--sidebar-quiet))]">Navegação</div>

        <div className="mt-3 space-y-1 px-3">
          {primaryNavItems.map(renderNavItem)}
          <div className="mx-3 my-1 border-t border-[hsl(var(--sidebar-edge)/0.05)]" />
          {cortexNavItems.map(renderNavItem)}
          <div className="mx-3 my-1 border-t border-[hsl(var(--sidebar-edge)/0.05)]" />
          {secondaryNavItems.map(renderNavItem)}
          {utilityNavItems.length ? (
            <>
              <div className="mx-3 my-1 border-t border-[hsl(var(--sidebar-edge)/0.05)]" />
              {utilityNavItems.map(renderNavItem)}
            </>
          ) : null}
        </div>

        <div className="mt-6 px-4 text-[9px] font-semibold uppercase tracking-[0.28em] text-[hsl(var(--sidebar-quiet))]">Conta Meta</div>

        <div className="mt-3 px-3">
          {(!isConnected || isTokenExpired) ? (
            <Button
              className="h-10 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_16px_30px_-20px_hsl(var(--primary)/0.9)] hover:bg-[hsl(var(--primary-dark))]"
              onClick={handleConnectMeta}
              disabled={connecting}
            >
              {connecting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {connecting ? 'Conectando...' : isTokenExpired ? 'Reconectar Meta' : 'Conectar Meta'}
            </Button>
          ) : hasAccounts ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="text-text-secondary">{activeAccountIds.length} ativa{activeAccountIds.length === 1 ? '' : 's'}</span>
                <div className="flex items-center gap-3">
                  <button onClick={handleSelectAll} className="font-medium text-primary transition-colors hover:text-[hsl(var(--primary-glow))]">
                    Todas
                  </button>
                  <button onClick={handleDeselectAll} className="font-medium text-text-muted transition-colors hover:text-sidebar-foreground">
                    Limpar
                  </button>
                </div>
              </div>

              <div className="hide-scrollbar max-h-[40vh] space-y-2 overflow-y-auto">
                {bmEntries.map(([bmName, accounts]) => {
                  const isOpen = openBMs[bmName] ?? true;

                  return (
                    <section key={bmName} className="rounded-xl border border-[hsl(var(--sidebar-edge)/0.05)] bg-[hsl(var(--sidebar-surface)/0.46)] backdrop-blur-sm">
                      <button
                        onClick={() => setOpenBMs((prev) => ({ ...prev, [bmName]: !isOpen }))}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--sidebar-edge)/0.04)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">{bmName}</p>
                          <p className="mt-0.5 text-[10px] text-text-muted">{accounts.length} conta{accounts.length === 1 ? '' : 's'}</p>
                        </div>
                        {isOpen ? <ChevronDown className="size-4 text-text-muted" /> : <ChevronRight className="size-4 text-text-muted" />}
                      </button>

                      {isOpen ? (
                        <div className="space-y-1 border-t border-[hsl(var(--sidebar-edge)/0.05)] px-2 py-2">
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
                                  isChecked
                                    ? 'bg-[hsl(var(--sidebar-edge)/0.08)] text-sidebar-foreground'
                                    : 'text-text-secondary hover:bg-[hsl(var(--sidebar-edge)/0.04)] hover:text-sidebar-foreground',
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
            <div className="rounded-xl border border-[hsl(var(--sidebar-edge)/0.05)] bg-[hsl(var(--sidebar-surface)/0.4)] px-3 py-4 text-center text-xs text-text-secondary">
              Nenhuma conta disponível.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[hsl(var(--sidebar-edge)/0.05)] px-4 py-3">
        <div>
          <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-[hsl(var(--sidebar-quiet))]">Configurações</div>
          <SettingsDialog />
        </div>

        <div className="flex items-center gap-2 border-t border-[hsl(var(--sidebar-edge)/0.05)] pt-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-[hsl(var(--sidebar-cortex)/0.14)] text-sm font-bold text-primary">
            {initials}
          </div>

          <p className="min-w-0 flex-1 truncate text-[13px] text-text-secondary">{profile?.name || user?.email || 'Utilizador'}</p>

          <button onClick={signOut} className="text-text-muted transition-colors hover:text-sidebar-foreground">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
