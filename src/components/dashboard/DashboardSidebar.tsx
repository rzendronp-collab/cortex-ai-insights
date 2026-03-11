import { useState, useEffect } from 'react';
import { LogOut, ChevronRight, ChevronDown, LayoutDashboard, TrendingUp, Calendar, Shield, MessageSquare, FileText, X, Bell, Brain, Loader2 } from 'lucide-react';
import SettingsDialog from './SettingsDialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { toast } from 'sonner';

const C = {
  bg:            '#FFFFFF',
  bgHover:       '#F1F3F8',
  bgActive:      '#EFF4FF',
  border:        '#E4E7EF',
  accent:        '#2563EB',
  accentSubtle:  '#EFF4FF',
  textPrimary:   '#0F1523',
  textSecondary: '#5A6478',
  textMuted:     '#9BA5B7',
  green:         '#16A34A',
  red:           '#DC2626',
} as const;

interface DashboardSidebarProps {
  onCloseMobile?: () => void;
}

export default function DashboardSidebar({ onCloseMobile }: DashboardSidebarProps) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { adAccounts, isConnected, isTokenExpired, connectMeta } = useMetaConnection();
  const {
    activeTab: currentTab, setActiveTab,
    activeAccountIds, toggleActiveAccount, setActiveAccountIds,
    analysisCache, analyzeRef,
    setSelectedAccountId, setSelectedAccountName, setSelectedAccountCurrency,
  } = useDashboard();
  const [openBMs, setOpenBMs] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState(false);

  const accountsByBm = adAccounts.reduce((acc, a) => {
    const bm = a.business_name || 'Pessoais';
    if (!acc[bm]) acc[bm] = [];
    acc[bm].push(a);
    return acc;
  }, {} as Record<string, typeof adAccounts>);

  const bmKeys = Object.keys(accountsByBm);

  useEffect(() => {
    if (bmKeys.length > 0 && Object.keys(openBMs).length === 0) {
      setOpenBMs({ [bmKeys[0]]: true });
    }
  }, [bmKeys.length]);

  const handleConnectMeta = async () => {
    setConnecting(true);
    try { await connectMeta(); }
    catch { toast.error('Erro ao conectar Meta'); setConnecting(false); }
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    onCloseMobile?.();
  };

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const navItems = [
    { id: 'overview',     label: 'Visão Geral',  icon: LayoutDashboard },
    { id: 'campaigns',    label: 'Campanhas',     icon: TrendingUp },
    { id: 'action-plan',  label: 'CORTEX IA',     icon: Brain, isAI: true },
    { id: 'chat',         label: 'Chat',          icon: MessageSquare },
    { id: 'rules',        label: 'Regras',        icon: Shield },
    { id: 'comparison',   label: 'Comparação',    icon: Calendar },
    { id: 'consolidated', label: 'Relatórios',    icon: FileText },
    { id: 'report',       label: 'Notificações',  icon: Bell },
  ];

  const getAccountStatus = (accountId: string | null) => {
    if (!accountId) return null;
    const target = profile?.roas_target || 3.0;
    for (const key of Object.keys(analysisCache)) {
      if (key.startsWith(`${accountId}__`)) {
        const entry = analysisCache[key];
        if (entry?.data?.campaigns) {
          const totalSpend   = entry.data.campaigns.reduce((s: number, c: any) => s + c.spend, 0);
          const totalRevenue = entry.data.campaigns.reduce((s: number, c: any) => s + c.revenue, 0);
          const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
          return roas >= target ? 'green' : 'red';
        }
      }
    }
    return null;
  };

  const handleSelectAll = () => {
    const allIds = adAccounts.map(a => a.account_id).filter(Boolean) as string[];
    setActiveAccountIds(allIds);
    localStorage.setItem('cortexads_active_accounts', JSON.stringify(allIds));
  };

  const handleDeselectAll = () => {
    setActiveAccountIds([]);
    localStorage.setItem('cortexads_active_accounts', JSON.stringify([]));
  };

  return (
    <aside
      className="flex flex-col h-screen overflow-hidden"
      style={{ width: 240, minWidth: 240, background: C.bg, borderRight: `1px solid ${C.border}` }}
    >
      {/* Logo */}
      <div className="flex-shrink-0 h-[52px] px-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, background: C.accent, borderRadius: 8 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 13, color: '#FFFFFF', lineHeight: 1 }}>C</span>
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: C.textPrimary, letterSpacing: '-0.3px', lineHeight: 1 }}>CORTEX</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.textMuted, marginTop: 2, lineHeight: 1 }}>Meta Intelligence</p>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="p-1 rounded" style={{ color: C.textMuted }} onMouseEnter={e => (e.currentTarget.style.background = C.bgHover)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Meta connection banner */}
      {(!isConnected || isTokenExpired) && (
        <div className="mx-3 mt-3 rounded-lg p-3" style={{ border: `1px solid ${C.border}`, background: '#F8F9FC' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: isTokenExpired ? '#D97706' : C.red }} />
            <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{isTokenExpired ? 'Token expirado' : 'Meta desconectado'}</span>
          </div>
          <button
            onClick={handleConnectMeta} disabled={connecting}
            className="w-full flex items-center justify-center gap-1.5 rounded-md transition-all disabled:opacity-50"
            style={{ height: 28, fontSize: 11, fontWeight: 600, background: C.accent, color: '#FFFFFF' }}
            onMouseEnter={e => !connecting && ((e.currentTarget as HTMLElement).style.background = '#1D4ED8')}
            onMouseLeave={e => !connecting && ((e.currentTarget as HTMLElement).style.background = C.accent)}
          >
            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : isTokenExpired ? 'Reconectar' : 'Conectar Meta'}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 flex flex-col gap-0.5">
        {navItems.map(item => {
          const isActive = currentTab === item.id;
          const isAI = 'isAI' in item && item.isAI;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="flex items-center gap-[10px] w-full rounded-md transition-all duration-150"
              style={{ padding: '8px 12px', background: isActive ? C.bgActive : 'transparent', color: isActive ? C.accent : C.textSecondary }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = C.bgHover; (e.currentTarget as HTMLElement).style.color = C.textPrimary; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = C.textSecondary; } }}
            >
              <item.icon className="flex-shrink-0" style={{ width: 16, height: 16, color: isActive ? C.accent : C.textMuted }} />
              <span className="flex-1 text-left" style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
              {isAI && (
                <span style={{ fontSize: 10, fontWeight: 700, background: '#EDE9FE', color: '#7C3AED', borderRadius: 4, padding: '1px 5px', fontFamily: "'DM Sans', sans-serif" }}>AI</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Accounts */}
      {isConnected && !isTokenExpired && adAccounts.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex-shrink-0 px-4 pt-3 pb-1 flex items-center justify-between">
            <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contas</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>{activeAccountIds.length}/{adAccounts.length}</span>
          </div>
          <div className="flex-shrink-0 px-4 pb-2 flex gap-3">
            <button onClick={handleSelectAll} style={{ fontSize: 10, color: C.accent, fontWeight: 600 }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}>Todas</button>
            <button onClick={handleDeselectAll} style={{ fontSize: 10, color: C.textMuted }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = C.textSecondary)} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = C.textMuted)}>Limpar</button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-2">
            {Object.entries(accountsByBm).map(([bmName, accounts]) => {
              const isOpen = openBMs[bmName] ?? true;
              return (
                <div key={bmName} className="mb-1">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none px-2 py-1.5 rounded-md"
                    style={{ transition: 'background 150ms ease' }}
                    onClick={() => setOpenBMs(prev => ({ ...prev, [bmName]: !isOpen }))}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = C.bgHover)}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{bmName}</span>
                    {isOpen ? <ChevronDown className="w-3 h-3" style={{ color: C.textMuted }} /> : <ChevronRight className="w-3 h-3" style={{ color: C.textMuted }} />}
                  </div>
                  {isOpen && (
                    <div className="flex flex-col gap-px mt-px ml-3">
                      {accounts.map(account => {
                        const isChecked = activeAccountIds.includes(account.account_id || '');
                        const status = getAccountStatus(account.account_id);
                        return (
                          <div
                            key={account.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none"
                            style={{ background: isChecked ? C.accentSubtle : 'transparent', transition: 'background 150ms ease' }}
                            onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = C.bgHover; }}
                            onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            onClick={() => {
                              if (account.account_id) {
                                const wasActive = activeAccountIds.includes(account.account_id);
                                toggleActiveAccount(account.account_id);
                                if (!wasActive) {
                                  setSelectedAccountId(account.account_id);
                                  setSelectedAccountName(account.account_name || account.account_id);
                                  setSelectedAccountCurrency(account.currency || null);
                                  setTimeout(() => analyzeRef.current?.(account.account_id), 300);
                                }
                              }
                            }}
                          >
                            <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: isChecked ? C.green : status === 'green' ? `${C.green}80` : status === 'red' ? `${C.red}80` : C.textMuted }} />
                            <p className="truncate flex-1 leading-tight" style={{ fontSize: 11, fontWeight: 500, color: isChecked ? C.accent : C.textSecondary }}>
                              {account.account_name || 'Sem nome'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!(isConnected && !isTokenExpired && adAccounts.length > 0) && <div className="flex-1" />}

      {/* Footer */}
      <div className="flex-shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
        <SettingsDialog />
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center flex-shrink-0 rounded-full" style={{ width: 28, height: 28, background: '#F1F3F8' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary }}>{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: 12, fontWeight: 500, color: C.textPrimary }}>{profile?.name || 'Utilizador'}</p>
              <p className="truncate" style={{ fontSize: 11, color: C.textMuted }}>{user?.email}</p>
            </div>
            <button onClick={signOut} className="p-1 rounded" style={{ color: C.textMuted }} onMouseEnter={e => (e.currentTarget.style.color = C.red)} onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
