import { useState } from 'react';
import { LogOut, Settings, ChevronRight, ChevronDown, Circle, Save, Loader2, LayoutDashboard, BarChart2, Zap, Calendar, Globe, Shield, MessageSquare, FileText, Unplug, X, Bell, Search, CheckSquare, Square } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  const { connection, adAccounts, isConnected, isTokenExpired, connectMeta, disconnectMeta, connectionLoading } = useMetaConnection();
  const { selectedAccountId, setSelectedAccountId, setSelectedAccountName, setSelectedAccountCurrency, analysisData, activeTab: currentTab, setActiveTab, activeAccountIds, toggleActiveAccount, setActiveAccountIds, analysisCache } = useDashboard();
  const [configOpen, setConfigOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(true);
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

  const handleDisconnectMeta = async () => {
    try {
      await disconnectMeta();
      toast.success('Conta Meta desconectada');
    } catch {
      toast.error('Erro ao desconectar Meta');
    }
  };

  const handleSelectAccount = (accountId: string | null, accountName: string | null, accountCurrency?: string | null) => {
    setSelectedAccountId(accountId);
    setSelectedAccountName(accountName);
    setSelectedAccountCurrency(accountCurrency || null);
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    onCloseMobile?.();
  };

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // Navigation items — Level 1
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

  // Group accounts by BM
  const accountsByBm = adAccounts.reduce((acc, a) => {
    const bm = a.business_name || 'Contas Pessoais';
    if (!acc[bm]) acc[bm] = [];
    acc[bm].push(a);
    return acc;
  }, {} as Record<string, typeof adAccounts>);

  // Get account ROAS status badge
  const getAccountStatus = (accountId: string | null) => {
    if (!accountId) return '⚪';
    // Check all cache entries for this account
    const roasTarget = profile?.roas_target || 3.0;
    for (const key of Object.keys(analysisCache)) {
      if (key.startsWith(`${accountId}__`)) {
        const entry = analysisCache[key];
        if (entry?.data?.campaigns) {
          const totalSpend = entry.data.campaigns.reduce((s, c) => s + c.spend, 0);
          const totalRevenue = entry.data.campaigns.reduce((s, c) => s + c.revenue, 0);
          const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
          if (roas >= roasTarget) return '🟢';
          return '🔴';
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
    <div className="w-[240px] h-screen bg-bg-sidebar border-r border-border-subtle flex flex-col fixed left-0 top-0 z-40">
      {/* ─── LOGO ─── */}
      <div className="px-5 py-5 flex items-center gap-3">
        <CortexLogo />
        <div className="flex items-baseline gap-1.5 flex-1">
          <span className="font-bold text-text-primary text-[16px] tracking-tight">CortexAds</span>
          <span className="text-[10px] font-semibold text-data-blue">AI</span>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="p-1 text-text-muted hover:text-text-primary transition-colors md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">

        {/* META CONNECTION STATUS */}
        {(!isConnected || isTokenExpired) && (
          <div className="mx-1 mb-3 bg-bg-card rounded-lg border border-border-default p-3">
            {isTokenExpired ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="w-2 h-2 fill-data-yellow text-data-yellow animate-pulse" />
                  <span className="text-[11px] text-text-primary font-medium">Token expirado</span>
                </div>
                <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-8 text-[11px] gradient-blue text-white rounded-lg">
                  {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reconectar'}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="w-2 h-2 fill-data-red text-data-red" />
                  <span className="text-[11px] text-text-primary font-medium">Meta desconectado</span>
                </div>
                <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-8 text-[11px] gradient-blue text-white rounded-lg">
                  {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Conectar Meta Ads'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* ─── NAVIGATION ─── */}
        <div className="pt-2">
          <h3 className="text-[9px] font-semibold text-text-muted uppercase tracking-[1.5px] px-3 mb-2">Menu</h3>
          <div className="space-y-0.5">
            {navItems.map(item => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2.5 w-full px-3 py-[10px] rounded-lg transition-all duration-150 text-[13px] ${
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
        </div>

        {/* ─── SEPARATOR ─── */}
        <div className="mx-4 my-4">
          <Separator className="bg-border-subtle" />
        </div>

        {/* ─── LEVEL 2: BMs & ACCOUNTS SELECTOR ─── */}
        {isConnected && !isTokenExpired && adAccounts.length > 0 && (
          <Collapsible open={accountsOpen} onOpenChange={setAccountsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-bg-card-hover transition-colors rounded-lg">
              <Globe className="w-4 h-4 text-text-muted" />
              <span className="text-[11px] font-semibold text-text-primary flex-1 text-left">Contas de Anúncio</span>
              <span className="text-[9px] bg-bg-card border border-border-default text-text-muted px-1.5 py-0.5 rounded-full font-medium">{adAccounts.length}</span>
              <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${accountsOpen ? '' : '-rotate-90'}`} />
            </CollapsibleTrigger>

            <CollapsibleContent className="px-1 pb-2">
              {/* Select/Deselect all */}
              <div className="flex gap-1 px-2 py-1.5">
                <button onClick={handleSelectAll} className="text-[9px] text-data-blue hover:underline font-medium">Selecionar todas</button>
                <span className="text-[9px] text-text-muted">·</span>
                <button onClick={handleDeselectAll} className="text-[9px] text-text-muted hover:text-text-primary font-medium">Desmarcar todas</button>
              </div>

              {Object.entries(accountsByBm).map(([bmName, accounts], idx) => {
                const bmKey = bmName;
                const isOpen = openBMs[bmKey] ?? idx === 0;
                return (
                  <div key={bmName} className="mb-1">
                    <div
                      className="flex items-center justify-between cursor-pointer select-none px-2 py-1.5 hover:bg-bg-card-hover rounded-lg"
                      onClick={() => setOpenBMs(prev => ({ ...prev, [bmKey]: !isOpen }))}
                    >
                      <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        {bmName}
                      </span>
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
                              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bg-card-hover transition-colors cursor-pointer w-full"
                              onClick={() => {
                                if (account.account_id) toggleActiveAccount(account.account_id);
                              }}
                            >
                              <Switch
                                checked={isChecked}
                                onCheckedChange={() => {
                                  if (account.account_id) toggleActiveAccount(account.account_id);
                                }}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                className="h-4 w-7 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-text-primary font-medium truncate">
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
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ─── CANAIS ─── */}
        <div className="space-y-1 mt-2">
          <h3 className="text-[9px] font-semibold text-text-muted uppercase tracking-[1.5px] px-3 mb-2">Canais</h3>

          {/* Meta Ads */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div className="w-[6px] h-[6px] rounded-full bg-[#1877F2] flex-shrink-0" />
            <span className="text-[13px] font-medium text-text-primary flex-1">Meta Ads</span>
            {isConnected && !isTokenExpired && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-0.5 text-text-muted hover:text-data-red transition-colors" title="Desconectar Meta">
                      <Unplug className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-bg-card border-border-default">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-text-primary">Desconectar Meta?</AlertDialogTitle>
                      <AlertDialogDescription className="text-text-secondary">
                        Você precisará reconectar para continuar analisando campanhas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-bg-base border-border-default text-text-secondary hover:bg-bg-card-hover">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnectMeta} className="bg-data-red text-white hover:opacity-90">Desconectar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Circle className="w-[6px] h-[6px] fill-data-green text-data-green" />
              </>
            )}
          </div>

          {/* Google Ads - Coming Soon */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-40">
            <div className="w-[6px] h-[6px] rounded-full bg-[#4285F4] flex-shrink-0" />
            <span className="text-[13px] text-text-muted flex-1">Google Ads</span>
            <span className="text-[9px] bg-border-default text-text-muted px-1.5 py-0.5 rounded font-medium">Em breve</span>
          </div>

          {/* TikTok Ads - Coming Soon */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg opacity-40">
            <div className="w-[6px] h-[6px] rounded-full bg-[#FE2C55] flex-shrink-0" />
            <span className="text-[13px] text-text-muted flex-1">TikTok Ads</span>
            <span className="text-[9px] bg-border-default text-text-muted px-1.5 py-0.5 rounded font-medium">Em breve</span>
          </div>
        </div>
      </div>

      {/* ─── RODAPÉ ─── */}
      <div className="border-t border-border-subtle">
        <SettingsDialog />
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger className="flex items-center gap-2.5 w-full px-5 py-3 hover:bg-bg-card-hover transition-colors">
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
                {apiKeyError && (
                  <p className="text-[9px] text-data-red font-medium">{apiKeyError}</p>
                )}
                {apiKeyValid && (
                  <p className="text-[9px] text-data-green font-medium">✓ Chave válida</p>
                )}
                {!apiKeyError && !apiKeyValid && (
                  <p className="text-[9px] text-text-muted">Salva com segurança no servidor</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">ROAS Target</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={roasTarget}
                  onChange={(e) => setRoasTarget(e.target.value)}
                  className="h-8 text-[11px] bg-bg-base border-border-default rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-8 text-[11px] bg-bg-base border-border-default rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R$">R$ (BRL)</SelectItem>
                    <SelectItem value="$">$ (USD)</SelectItem>
                    <SelectItem value="€">€ (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-text-muted uppercase tracking-[1px]">Nicho</Label>
                <Input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Ex: E-commerce, SaaS..."
                  className="h-8 text-[11px] bg-bg-base border-border-default rounded-lg"
                />
              </div>
              <Button onClick={handleSaveConfig} disabled={saving} size="sm" className="w-full h-8 text-[11px] gradient-blue text-white rounded-lg">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Salvar</>}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* User Footer */}
        <div className="px-5 py-3 border-t border-border-subtle">
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
    </div>
  );
}
