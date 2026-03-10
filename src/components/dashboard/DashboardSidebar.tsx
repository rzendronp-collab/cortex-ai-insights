import { useState, useEffect } from 'react';
import { LogOut, Settings, ChevronRight, ChevronDown, Circle, Save, Loader2, LayoutDashboard, BarChart2, Zap, Calendar, Shield, MessageSquare, FileText, X, Bell } from 'lucide-react';
import SettingsDialog from './SettingsDialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface DashboardSidebarProps {
  onCloseMobile?: () => void;
}

export default function DashboardSidebar({ onCloseMobile }: DashboardSidebarProps) {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { adAccounts, isConnected, isTokenExpired, connectMeta } = useMetaConnection();
  const { activeTab: currentTab, setActiveTab, activeAccountIds, toggleActiveAccount, setActiveAccountIds, analysisCache, analyzeRef, setSelectedAccountId, setSelectedAccountName, setSelectedAccountCurrency } = useDashboard();
  const [configOpen, setConfigOpen] = useState(false);
  const [openBMs, setOpenBMs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [roasTarget, setRoasTarget] = useState(profile?.roas_target?.toString() || '3.0');
  const [currency, setCurrency] = useState(profile?.currency || 'R$');
  const [niche, setNiche] = useState(profile?.niche || '');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeyValid, setApiKeyValid] = useState(false);

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

  const handleSaveConfig = async () => {
    setSaving(true);
    setApiKeyError(null);
    setApiKeyValid(false);
    try {
      if (apiKey.trim()) {
        if (!apiKey.trim().startsWith('sk-ant-')) {
          setApiKeyError('Chave invalida');
          setSaving(false);
          return;
        }
        const { error: keyError } = await supabase
          .from('profiles')
          .update({ claude_api_key: apiKey, updated_at: new Date().toISOString() })
          .eq('id', user!.id);
        if (keyError) throw keyError;
        setApiKeyValid(true);
      }
      await updateProfile.mutateAsync({ roas_target: parseFloat(roasTarget), currency, niche });
      toast.success('Salvo!');
      setApiKey('');
    } catch { toast.error('Erro ao salvar'); }
    setSaving(false);
  };

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
    { id: 'overview', label: 'Resumo', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Campanhas', icon: BarChart2 },
    { id: 'comparison', label: 'Comparação', icon: Calendar },
    { id: 'rules', label: 'Regras', icon: Shield },
    { id: 'consolidated', label: 'Relatórios', icon: FileText },
    { id: 'report', label: 'Notificações', icon: Bell },
    { id: 'action-plan', label: 'CORTEX', icon: Zap },
    { id: 'chat', label: 'Chat IA', icon: MessageSquare },
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
    <aside className="flex flex-col h-screen w-[200px] min-w-[200px] bg-[#070B16] border-r border-[#1F2937]/50 overflow-hidden">

      {/* Logo */}
      <div className="flex-shrink-0 px-4 py-3.5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center text-white text-[11px] font-bold">
          C
        </div>
        <span className="font-semibold text-[#F9FAFB] text-[14px] tracking-tight">CortexAds</span>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="ml-auto p-1 text-[#6B7280] hover:text-[#F9FAFB] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 px-2 py-1 flex flex-col gap-px">
        {(!isConnected || isTokenExpired) && (
          <div className="mx-1 mb-2 rounded-lg border border-[#1F2937] p-2.5 bg-[#111827]/50">
            <div className="flex items-center gap-2 mb-2">
              <Circle className={`w-1.5 h-1.5 ${isTokenExpired ? 'fill-[#F59E0B] text-[#F59E0B]' : 'fill-[#EF4444] text-[#EF4444]'}`} />
              <span className="text-[10px] text-[#9CA3AF] font-medium">
                {isTokenExpired ? 'Token expirado' : 'Meta desconectado'}
              </span>
            </div>
            <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-7 text-[10px] bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-md">
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : isTokenExpired ? 'Reconectar' : 'Conectar Meta'}
            </Button>
          </div>
        )}

        {navItems.map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-2 w-full px-3 py-[7px] rounded-md transition-all duration-150 text-[12px] ${
                isActive
                  ? 'bg-[#6366F1]/10 text-[#818CF8] font-medium'
                  : 'text-[#9CA3AF] hover:bg-[#111827] hover:text-[#F9FAFB]'
              }`}
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Accounts */}
      {isConnected && !isTokenExpired && adAccounts.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden mt-2 pt-2">
          <div className="flex-shrink-0 px-3 py-1 flex items-center justify-between">
            <span className="text-[9px] font-medium text-[#6B7280] uppercase tracking-[0.1em]">Contas</span>
            <span className="text-[9px] text-[#6B7280]">{activeAccountIds.length}</span>
          </div>

          <div className="flex-shrink-0 px-3 pb-1 flex gap-2">
            <button onClick={handleSelectAll} className="text-[9px] text-[#6366F1] hover:underline">Todas</button>
            <button onClick={handleDeselectAll} className="text-[9px] text-[#6B7280] hover:text-[#9CA3AF]">Limpar</button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {Object.entries(accountsByBm).map(([bmName, accounts]) => {
              const isOpen = openBMs[bmName] ?? true;
              return (
                <div key={bmName} className="mb-0.5">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none px-2 py-1 hover:bg-[#111827] rounded-md"
                    onClick={() => setOpenBMs(prev => ({ ...prev, [bmName]: !isOpen }))}
                  >
                    <span className="text-[9px] text-[#6B7280] uppercase tracking-wider font-medium">{bmName}</span>
                    <ChevronDown className={`w-2.5 h-2.5 text-[#6B7280] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isOpen && (
                    <div className="flex flex-col gap-px mt-px">
                      {accounts.map(account => {
                        const isChecked = activeAccountIds.includes(account.account_id || '');
                        const status = getAccountStatus(account.account_id);
                        return (
                          <div
                            key={account.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors duration-150 ${
                              isChecked ? 'bg-[#6366F1]/[0.06]' : 'hover:bg-[#111827]'
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
                            <Switch
                              checked={isChecked}
                              className="pointer-events-none h-3.5 w-6 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-[#E5E7EB] font-medium truncate leading-tight">
                                {account.account_name || 'Sem nome'}
                              </p>
                            </div>
                            {status && (
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                status === 'green' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                              }`} />
                            )}
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
      <div className="flex-shrink-0 border-t border-[#1F2937]/50">
        <SettingsDialog />
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#111827] transition-colors">
            <Settings className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[11px] text-[#9CA3AF]">Config</span>
            <ChevronRight className={`w-3 h-3 ml-auto text-[#6B7280] transition-transform duration-150 ${configOpen ? 'rotate-90' : ''}`} />
          </CollapsibleTrigger>

          <CollapsibleContent className="px-3 pb-2">
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <Label className="text-[9px] text-[#6B7280] uppercase tracking-[0.08em]">API Key Claude</Label>
                <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..." className="h-7 text-[10px] bg-[#0A0F1E] border-[#1F2937] rounded-md" />
                {apiKeyError && <p className="text-[9px] text-[#EF4444]">{apiKeyError}</p>}
                {apiKeyValid && <p className="text-[9px] text-[#10B981]">Valida</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-[#6B7280] uppercase tracking-[0.08em]">ROAS Target</Label>
                <Input type="number" step="0.1" value={roasTarget} onChange={(e) => setRoasTarget(e.target.value)} className="h-7 text-[10px] bg-[#0A0F1E] border-[#1F2937] rounded-md" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-[#6B7280] uppercase tracking-[0.08em]">Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-7 text-[10px] bg-[#0A0F1E] border-[#1F2937] rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R$">BRL</SelectItem>
                    <SelectItem value="$">USD</SelectItem>
                    <SelectItem value="€">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] text-[#6B7280] uppercase tracking-[0.08em]">Nicho</Label>
                <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="E-commerce, SaaS..." className="h-7 text-[10px] bg-[#0A0F1E] border-[#1F2937] rounded-md" />
              </div>
              <Button onClick={handleSaveConfig} disabled={saving} size="sm" className="w-full h-7 text-[10px] bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-md">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Salvar</>}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* User */}
        <div className="px-3 py-2.5 border-t border-[#1F2937]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#6366F1] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[#E5E7EB] truncate">{profile?.name || 'Usuario'}</p>
              <p className="text-[9px] text-[#6B7280] truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="text-[#6B7280] hover:text-[#EF4444] transition-colors p-0.5">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
