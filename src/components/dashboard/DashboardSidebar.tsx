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
  green: 'bg-success/70',
  red: 'bg-destructive/70',
  yellow: 'bg-warning/75',
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
        .toUpperCase() || 'U',
    [profile?.name],
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

  return (
    <aside className="flex h-screen w-[264px] min-w-[264px] flex-col overflow-hidden border-r border-sidebar-border bg-[image:var(--sidebar-hero)] text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.75)]">
          <span className="font-mono text-sm font-semibold tracking-tight">CX</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold tracking-[-0.03em] text-text-primary">CORTEX v5</p>
          <p className="truncate text-[11px] font-medium text-text-muted">Meta control tower</p>
        </div>

        {onCloseMobile ? (
          <Button variant="ghost" size="icon" className="size-8 rounded-xl text-text-muted hover:bg-sidebar-accent hover:text-text-primary" onClick={onCloseMobile}>
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="panel-highlight rounded-3xl border border-border-highlight/50 bg-card/80 p-4 shadow-[0_18px_40px_-30px_hsl(var(--primary)/0.35)] backdrop-blur-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">Workspace</p>
              <h2 className="mt-1 text-sm font-semibold text-text-primary">{profile?.name || 'Operação ativa'}</h2>
            </div>
            <div className={cn('mt-1 size-2 rounded-full', isTokenExpired ? 'bg-warning' : isConnected ? 'bg-success' : 'bg-muted-foreground')} />
          </div>

          <p className="mb-4 text-xs leading-5 text-text-secondary">
            {isTokenExpired
              ? 'Sua sessão da Meta expirou. Reconecte para retomar sincronização.'
              : isConnected
                ? `${activeAccountIds.length || 0} conta${activeAccountIds.length === 1 ? '' : 's'} ativa${activeAccountIds.length === 1 ? '' : 's'} para análise.`
                : 'Conecte sua conta Meta para desbloquear navegação por contas e análises.'}
          </p>

          {(!isConnected || isTokenExpired) ? (
            <Button className="h-10 w-full rounded-2xl px-4 text-xs font-semibold shadow-[0_16px_30px_-18px_hsl(var(--primary)/0.8)]" onClick={handleConnectMeta} disabled={connecting}>
              {connecting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {connecting ? 'Conectando...' : isTokenExpired ? 'Reconectar Meta' : 'Conectar Meta'}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border-subtle bg-card/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">Contas</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{adAccounts.length}</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-card/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">Ativas</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{activeAccountIds.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-3">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">Navegação</p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-[0_18px_32px_-22px_hsl(var(--primary)/0.9)]'
                    : 'text-text-secondary hover:bg-sidebar-accent hover:text-text-primary',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
                    isActive
                      ? 'border-white/10 bg-white/10 text-primary-foreground'
                      : 'border-border-subtle bg-card text-text-muted group-hover:text-text-primary',
                  )}
                >
                  <Icon className="size-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{item.label}</span>
                </span>

                {item.badge ? (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]',
                      isActive ? 'bg-white/14 text-primary-foreground' : 'bg-primary/10 text-primary',
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-h-0 flex-1 border-t border-sidebar-border px-3 pb-3 pt-3">
        {hasAccounts ? (
          <div className="flex h-full min-h-0 flex-col rounded-[1.5rem] border border-sidebar-border bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">Contas</p>
                <p className="mt-1 text-xs text-text-secondary">{activeAccountIds.length} selecionada{activeAccountIds.length === 1 ? '' : 's'}</p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-medium">
                <button onClick={handleSelectAll} className="text-primary transition-colors hover:text-primary-dark">
                  Todas
                </button>
                <button onClick={handleDeselectAll} className="text-text-muted transition-colors hover:text-text-primary">
                  Limpar
                </button>
              </div>
            </div>

            <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {bmEntries.map(([bmName, accounts]) => {
                const isOpen = openBMs[bmName] ?? true;

                return (
                  <section key={bmName} className="rounded-2xl border border-border-subtle bg-background/70">
                    <button
                      onClick={() => setOpenBMs((prev) => ({ ...prev, [bmName]: !isOpen }))}
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-sidebar-accent/70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{bmName}</p>
                        <p className="mt-1 text-[11px] text-text-muted">{accounts.length} conta{accounts.length === 1 ? '' : 's'}</p>
                      </div>

                      {isOpen ? <ChevronDown className="size-4 text-text-muted" /> : <ChevronRight className="size-4 text-text-muted" />}
                    </button>

                    {isOpen ? (
                      <div className="space-y-1 border-t border-border-subtle px-2 py-2">
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
                                'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200',
                                isChecked
                                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                                  : 'text-text-secondary hover:bg-sidebar-accent hover:text-text-primary',
                              )}
                            >
                              <span className={cn('size-2 shrink-0 rounded-full', status ? statusClasses[status] : 'bg-muted-foreground/60')} />

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-semibold">{account.account_name || 'Sem nome'}</p>
                                <p className="truncate text-[11px] text-text-muted">
                                  {account.account_id || 'Sem ID'}
                                  {account.currency ? ` • ${account.currency}` : ''}
                                </p>
                              </div>

                              <span
                                className={cn(
                                  'rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                  isChecked
                                    ? 'border-primary/20 bg-primary/10 text-primary'
                                    : 'border-border-subtle bg-card text-text-muted',
                                )}
                              >
                                {isChecked ? 'On' : 'Off'}
                              </span>
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
          <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-dashed border-sidebar-border bg-card/50 px-6 text-center">
            <div>
              <p className="text-sm font-semibold text-text-primary">Nenhuma conta disponível</p>
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                Conecte a Meta para ver Business Managers e selecionar contas para análise.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-sidebar-border bg-card/70 px-3 py-3 backdrop-blur-sm">
        <div className="mb-2 overflow-hidden rounded-2xl border border-border-subtle bg-background/70">
          <SettingsDialog />
        </div>

        <div className="flex items-center gap-3 rounded-[1.5rem] border border-border-subtle bg-background/80 px-3 py-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-accent text-sm font-bold text-text-primary">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-text-primary">{profile?.name || 'Utilizador'}</p>
            <p className="truncate text-[11px] text-text-muted">{user?.email || 'Sem email'}</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-2xl text-text-muted hover:bg-destructive/10 hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
