import { useState, useEffect } from 'react';
import { LogOut, ChevronRight, ChevronDown, Circle, LayoutDashboard, TrendingUp, Zap, Calendar, Shield, MessageSquare, FileText, X, Bell, Brain } from 'lucide-react';
import SettingsDialog from './SettingsDialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { toast } from 'sonner';

interface DashboardSidebarProps {
  onCloseMobile?: () => void;
}

export default function DashboardSidebar({ onCloseMobile }: DashboardSidebarProps) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { adAccounts, isConnected, isTokenExpired, connectMeta } = useMetaConnection();
  const { activeTab: currentTab, setActiveTab, activeAccountIds, toggleActiveAccount, setActiveAccountIds, analysisCache, analyzeRef, setSelectedAccountId, setSelectedAccountName, setSelectedAccountCurrency } = useDashboard();
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
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Campanhas', icon: TrendingUp },
    { id: 'action-plan', label: 'CORTEX IA', icon: Brain, isAI: true },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'rules', label: 'Regras', icon: Shield },
    { id: 'comparison', label: 'Comparação', icon: Calendar },
    { id: 'consolidated', label: 'Relatórios', icon: FileText },
    { id: 'report', label: 'Notificações', icon: Bell },
  ];

  const getAccountStatus = (accountId: string | null) => {
    if (!accountId) return null;
    const target = profile?.roas_target || 3.0;
    for (const key of Object.keys(analysisCache)) {
      if (key.startsWith(`${accountId}__`)) {
        const entry = analysisCache[key];
        if (entry?.data?.campaigns) {
          const totalSpend = entry.data.campaigns.reduce((s: number, c: any) => s + c.spend, 0);
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
    <aside className="flex flex-col h-screen w-[240px] min-w-[240px] bg-[#080B14] border-r border-[#1E2A42] overflow-hidden">

      {/* Logo — Zone 1 */}
      <div className="flex-shrink-0 h-14 px-4 flex items-center gap-3 border-b border-[#1E2A42]">
        <svg width="30" height="30" viewBox="0 0 28 28" fill="none" className="flex-shrink-0">
          <path d="M14 2L25.5 8.5V19.5L14 26L2.5 19.5V8.5L14 2Z" fill="url(#hex-gradient)" fillOpacity="0.15" stroke="url(#hex-gradient)" strokeWidth="1.5"/>
          <text x="14" y="17" textAnchor="middle" fill="#4F8EF7" fontSize="11" fontWeight="700" fontFamily="Space Grotesk, sans-serif">C</text>
          <defs><linearGradient id="hex-gradient" x1="2.5" y1="2" x2="25.5" y2="26"><stop stopColor="#4F8EF7"/><stop offset="1" stopColor="#6C63FF"/></linearGradient></defs>
        </svg>
        <div className="flex-1 min-w-0">
          <span className="font-display font-bold text-[#F0F4FF] text-[17px] tracking-[-0.5px] leading-none">CORTEX</span>
          <p className="text-[11px] text-[#4A5F7A] font-medium mt-0.5">Meta Intelligence</p>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="p-1 text-[#4A5F7A] hover:text-[#F0F4FF] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Meta connection banner */}
      {(!isConnected || isTokenExpired) && (
        <div className="mx-3 mt-3 rounded-lg border border-[#1E2A42] p-3 bg-[#141B2D]">
          <div className="flex items-center gap-2 mb-2">
            <Circle className={`w-1.5 h-1.5 ${isTokenExpired ? 'fill-[#F5A623] text-[#F5A623]' : 'fill-[#F05252] text-[#F05252]'}`} />
            <span className="text-[10px] text-[#7A8FAD] font-medium">
              {isTokenExpired ? 'Token expirado' : 'Meta desconectado'}
            </span>
          </div>
          <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-7 text-[10px] bg-[#4F8EF7] hover:bg-[#4080E0] text-white rounded-md">
            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : isTokenExpired ? 'Reconectar' : 'Conectar Meta'}
          </Button>
        </div>
      )}

      {/* Navigation — Zone 2 */}
      <div className="flex-shrink-0 px-3 py-3 flex flex-col gap-0.5">
        {navItems.map(item => {
          const isActive = currentTab === item.id;
          const isAI = 'isAI' in item && item.isAI;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-colors duration-150 text-[13px] ${
                isActive
                  ? 'text-[#F0F4FF] font-medium'
                  : 'text-[#7A8FAD] hover:text-[#F0F4FF]'
              }`}
              style={{
                borderLeft: isActive ? '2px solid #4F8EF7' : '2px solid transparent',
                backgroundColor: isActive ? 'rgba(79,142,247,0.08)' : undefined,
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(79,142,247,0.05)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '';
              }}
            >
              <item.icon className={`w-[17px] h-[17px] flex-shrink-0 ${isActive ? 'text-[#4F8EF7]' : 'text-[#4A5F7A]'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {isAI && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#6C63FF]/15 text-[#6C63FF]">AI</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Accounts — Zone 3 */}
      {isConnected && !isTokenExpired && adAccounts.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden border-t border-[#1E2A42]">
          <div className="flex-shrink-0 px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#4A5F7A] uppercase tracking-[0.1em]">Contas</span>
            <span className="text-[10px] text-[#4A5F7A]">{activeAccountIds.length}/{adAccounts.length}</span>
          </div>

          <div className="flex-shrink-0 px-4 pb-2 flex gap-3">
            <button onClick={handleSelectAll} className="text-[10px] text-[#4F8EF7] hover:underline font-medium">Todas</button>
            <button onClick={handleDeselectAll} className="text-[10px] text-[#4A5F7A] hover:text-[#7A8FAD]">Limpar</button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-2">
            {Object.entries(accountsByBm).map(([bmName, accounts]) => {
              const isOpen = openBMs[bmName] ?? true;
              return (
                <div key={bmName} className="mb-1">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none px-2 py-1.5 hover:bg-white/[0.03] rounded-md"
                    onClick={() => setOpenBMs(prev => ({ ...prev, [bmName]: !isOpen }))}
                  >
                    <span className="text-[10px] text-[#4A5F7A] uppercase tracking-wider font-semibold">{bmName}</span>
                    {isOpen
                      ? <ChevronDown className="w-3 h-3 text-[#4A5F7A]" />
                      : <ChevronRight className="w-3 h-3 text-[#4A5F7A]" />
                    }
                  </div>
                  {isOpen && (
                    <div className="flex flex-col gap-px mt-px ml-3">
                      {accounts.map(account => {
                        const isChecked = activeAccountIds.includes(account.account_id || '');
                        const status = getAccountStatus(account.account_id);
                        return (
                          <div
                            key={account.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors duration-150 ${
                              isChecked ? 'bg-[#4F8EF7]/[0.08]' : 'hover:bg-white/[0.03]'
                            }`}
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
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isChecked ? 'bg-[#22D07A]' : status === 'green' ? 'bg-[#22D07A]/50' : status === 'red' ? 'bg-[#F05252]/50' : 'bg-[#4A5F7A]/40'
                            }`} />
                            <p className={`text-[11px] font-medium truncate leading-tight flex-1 ${
                              isChecked ? 'text-[#4F8EF7]' : 'text-[#7A8FAD]'
                            }`}>
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

      {/* Footer — Zone 4 */}
      <div className="flex-shrink-0 border-t border-[#1E2A42]">
        <SettingsDialog />

        {/* User */}
        <div className="px-4 py-3 border-t border-[#1E2A42]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F8EF7] to-[#6C63FF] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#F0F4FF] truncate">{profile?.name || 'Usuario'}</p>
              <p className="text-[10px] text-[#4A5F7A] truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="text-[#4A5F7A] hover:text-[#F05252] transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
