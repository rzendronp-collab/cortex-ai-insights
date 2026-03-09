import { useState, useEffect } from 'react';
import { LogOut, Settings, ChevronRight, ChevronDown, Circle, Save, Loader2, LayoutDashboard, BarChart2, Zap, Calendar, Globe, Shield, MessageSquare, FileText, X, Bell } from 'lucide-react';
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

function CortexLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#4F8EF7"/>
          <stop offset="100%" stopColor="#7C6EFA"/>
        </linearGradient>
      </defs>
      <path d="M16 2L28.7 9V23L16 30L3.3 23V9L16 2Z" fill="url(#logoGrad)"/>
      <text x="16" y="21" textAnchor="middle" fontFamily="Plus Jakarta Sans" fontWeight="800" fontSize="13" fill="white">C</text>
    </svg>
  );
}

interface DashboardSidebarProps {
  onCloseMobile?: () => void;
}

export default function DashboardSidebar({ onCloseMobile }: DashboardSidebarProps) {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { adAccounts, isConnected, isTokenExpired, connectMeta, disconnectMeta } = useMetaConnection();
  const { activeTab: currentTab, setActiveTab, activeAccountIds, toggleActiveAccount, setActiveAccountIds, analysisCache, analyzeRef, setSelectedAccountId, setSelectedAccountName, setSelectedAccountCurrency } = useDashboard();
  const [configOpen, setConfigOpen] = useState(false);
  const [openBMs, setOpenBMs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Config state
  const [apiKey, setApiKey] = useState('');
  const [roasTarget, setRoasTarget] = useState(profile?.roas_target?.toString() || '3.0');
  const [currency, setCurrency] = useState(profile?.currency || 'R$');
  const [niche, setNiche] = useState(profile?.niche || '');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeyValid, setApiKeyValid] = useState(false);

  // Group accounts by BM
  const accountsByBm = adAccounts.reduce((acc, a) => {
    const bm = a.business_name || 'Contas Pessoais';
    if (!acc[bm]) acc[bm] = [];
    acc[bm].push(a);
    return acc;
  }, {} as Record<string, typeof adAccounts>);

  const bmKeys = Object.keys(accountsByBm);

  // Auto-open first BM
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
          setApiKeyError('Chave inválida — deve começar com sk-ant-');
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
      await updateProfile.mutateAsync({
        roas_target: parseFloat(roasTarget),
        currency,
        niche,
      });
      toast.success('Configurações salvas!');
      setApiKey('');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  const handleConnectMeta = async () => {
    setConnecting(true);
    try {
      await connectMeta();
    } catch {
      toast.error('Erro ao iniciar conexão com Meta');
      setConnecting(false);
    }
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
    { id: 'action-plan', label: '⚡ CORTEX', icon: Zap },
    { id: 'chat', label: 'Cortex Chat', icon: MessageSquare },
  ];

  const getAccountStatus = (accountId: string | null) => {
    if (!accountId) return '⚪';
    const target = profile?.roas_target || 3.0;
    for (const key of Object.keys(analysisCache)) {
      if (key.startsWith(`${accountId}__`)) {
        const entry = analysisCache[key];
        if (entry?.data?.campaigns) {
          const totalSpend = entry.data.campaigns.reduce((s: number, c: any) => s + c.spend, 0);
          const totalRevenue = entry.data.campaigns.reduce((s: number, c: any) => s + c.revenue, 0);
          const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
          return roas >= target ? '🟢' : '🔴';
        }
      }
    }
    return '⚪';
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
    <aside className="flex flex-col h-screen w-[220px] min-w-[220px] bg-bg-sidebar border-r border-border-subtle overflow-hidden">

      {/* ─── LOGO ─── */}
      <div className="flex-shrink-0 px-4 py-4 flex items-center gap-3">
        <CortexLogo />
        <div className="flex items-baseline gap-1.5 flex-1">
          <span className="font-bold text-text-primary text-[15px] tracking-tight">CortexAds</span>
          <span className="text-[10px] font-semibold text-data-blue">AI</span>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="p-1 text-text-muted hover:text-text-primary transition-colors md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ─── NAVIGATION ─── */}
      <div className="flex-shrink-0 px-2 py-1 flex flex-col gap-0.5">
        {/* Meta connection status */}
        {(!isConnected || isTokenExpired) && (
          <div className="mx-1 mb-2 bg-bg-card rounded-lg border border-border-default p-3">
            <div className="flex items-center gap-2 mb-2">
              <Circle className={`w-2 h-2 ${isTokenExpired ? 'fill-data-yellow text-data-yellow animate-pulse' : 'fill-data-red text-data-red'}`} />
              <span className="text-[11px] text-text-primary font-medium">
                {isTokenExpired ? 'Token expirado' : 'Meta desconectado'}
              </span>
            </div>
            <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-8 text-[11px] gradient-blue text-white rounded-lg">
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : isTokenExpired ? 'Reconectar' : 'Conectar Meta Ads'}
            </Button>
          </div>
        )}

        <h3 className="text-[9px] font-semibold text-text-muted uppercase tracking-[1.5px] px-3 mb-1">Menu</h3>
        {navItems.map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-[9px] rounded-lg transition-all duration-150 text-[13px] ${
                isActive
                  ? 'bg-[hsl(217_40%_18%)] text-data-blue font-semibold border-l-2 border-l-data-blue'
                  : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary border-l-2 border-l-transparent'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── ACCOUNTS SECTION — fills remaining space, scrolls internally ─── */}
      {isConnected && !isTokenExpired && adAccounts.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1 overflow-hidden border-t border-border-subtle mt-2 pt-2">
          {/* Header */}
          <div className="flex-shrink-0 px-3 py-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Contas de Anúncio</span>
            <span className="text-[9px] text-text-muted">{activeAccountIds.length} ativas</span>
          </div>

          {/* Select/Deselect all */}
          <div className="flex-shrink-0 px-3 pb-1 flex gap-2">
            <button onClick={handleSelectAll} className="text-[10px] text-data-blue hover:underline font-medium">Selecionar todas</button>
            <span className="text-[9px] text-text-muted">·</span>
            <button onClick={handleDeselectAll} className="text-[10px] text-text-muted hover:text-text-primary font-medium">Desmarcar todas</button>
          </div>

          {/* Scrollable BM list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {Object.entries(accountsByBm).map(([bmName, accounts]) => {
              const isOpen = openBMs[bmName] ?? true;
              return (
                <div key={bmName} className="mb-1">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none px-2 py-1.5 hover:bg-bg-card-hover rounded-lg"
                    onClick={() => setOpenBMs(prev => ({ ...prev, [bmName]: !isOpen }))}
                  >
                    <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">{bmName}</span>
                    <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isOpen && (
                    <div className="pl-1 flex flex-col gap-0.5">
                      {accounts.map(account => {
                        const isChecked = activeAccountIds.includes(account.account_id || '');
                        const status = getAccountStatus(account.account_id);
                        return (
                          <div
                            key={account.id}
                            className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bg-card-hover cursor-pointer select-none"
                            onClick={() => {
                              if (account.account_id) toggleActiveAccount(account.account_id);
                            }}
                          >
                            <Switch
                              checked={isChecked}
                              className="pointer-events-none h-4 w-7 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-text-primary font-medium truncate leading-tight">
                                {account.account_name || 'Sem nome'}
                              </p>
                              <p className="text-[9px] text-text-muted truncate">
                                act_{account.account_id}
                              </p>
                            </div>
                            <span className="text-[10px]">{status}</span>
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

      {/* If no accounts section, push footer down */}
      {!(isConnected && !isTokenExpired && adAccounts.length > 0) && <div className="flex-1" />}

      {/* ─── FOOTER: Settings + User ─── */}
      <div className="flex-shrink-0 border-t border-border-subtle">
        <SettingsDialog />
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-bg-card-hover transition-colors">
            <Settings className="w-4 h-4 text-text-muted" />
            <span className="text-[13px] font-medium text-text-primary">Configurações</span>
            <ChevronRight className={`w-3.5 h-3.5 ml-auto text-text-muted transition-transform ${configOpen ? 'rotate-90' : ''}`} />
          </CollapsibleTrigger>

          <CollapsibleContent className="px-4 pb-3">
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">API Key Claude</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="h-8 text-[11px] bg-bg-base border-border-default rounded-lg"
                />
                {apiKeyError && <p className="text-[9px] text-data-red font-medium">{apiKeyError}</p>}
                {apiKeyValid && <p className="text-[9px] text-data-green font-medium">✓ Chave válida</p>}
                {!apiKeyError && !apiKeyValid && <p className="text-[9px] text-text-muted">Salva com segurança no servidor</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">ROAS Target</Label>
                <Input type="number" step="0.1" value={roasTarget} onChange={(e) => setRoasTarget(e.target.value)} className="h-8 text-[11px] bg-bg-base border-border-default rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-8 text-[11px] bg-bg-base border-border-default rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R$">R$ (BRL)</SelectItem>
                    <SelectItem value="$">$ (USD)</SelectItem>
                    <SelectItem value="€">€ (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">Nicho</Label>
                <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex: E-commerce, SaaS..." className="h-8 text-[11px] bg-bg-base border-border-default rounded-lg" />
              </div>
              <Button onClick={handleSaveConfig} disabled={saving} size="sm" className="w-full h-8 text-[11px] gradient-blue text-white rounded-lg">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Salvar</>}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* User Footer */}
        <div className="px-4 py-3 border-t border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-blue flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-text-primary truncate">{profile?.name || 'Usuário'}</p>
              <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="text-text-muted hover:text-data-red transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
