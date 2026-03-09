import { useState } from 'react';
import { Brain, LogOut, Settings, ChevronDown, ChevronRight, Circle, Save, Loader2, CheckCircle2, Eye, EyeOff, BarChart3, Target, Calendar, Cog, Globe, MessageCircle, FileText, RefreshCw } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export default function DashboardSidebar() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { connection, adAccounts, isConnected, isTokenExpired, connectMeta, connectionLoading } = useMetaConnection();
  const { selectedAccountId, setSelectedAccountId, setSelectedAccountName, analysisData, activeTab: currentTab, setActiveTab } = useDashboard();
  const [metaExpanded, setMetaExpanded] = useState(true);
  const [bmExpanded, setBmExpanded] = useState<Record<string, boolean>>({});
  const [configOpen, setConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Config state
  const [apiKey, setApiKey] = useState('');
  const [roasTarget, setRoasTarget] = useState(profile?.roas_target?.toString() || '3.0');
  const [currency, setCurrency] = useState(profile?.currency || 'R$');
  const [niche, setNiche] = useState(profile?.niche || '');

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      if (apiKey.trim()) {
        const { error: keyError } = await supabase
          .from('profiles')
          .update({ claude_api_key: apiKey, updated_at: new Date().toISOString() })
          .eq('id', user!.id);
        if (keyError) throw keyError;
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

  const handleSelectAccount = (accountId: string | null, accountName: string | null, accountCurrency?: string | null) => {
    setSelectedAccountId(accountId);
    setSelectedAccountName(accountName);
    setSelectedAccountCurrency(accountCurrency || null);
  };

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // Filter and group accounts by Business Manager
  const filteredAccounts = showInactive ? adAccounts : adAccounts.filter(a => a.is_active !== false);
  const accountsByBusiness = filteredAccounts.reduce((acc, account) => {
    const bizName = account.business_name || 'Sem Business Manager';
    if (!acc[bizName]) acc[bizName] = [];
    acc[bizName].push(account);
    return acc;
  }, {} as Record<string, typeof adAccounts>);

  const toggleBm = (bizName: string) => {
    setBmExpanded(prev => ({ ...prev, [bizName]: !prev[bizName] }));
  };
  const isBmExpanded = (bizName: string) => bmExpanded[bizName] !== false;

  // Calculate current ROAS for selected account
  const ad = analysisData;
  const totalSpend = ad?.campaigns.reduce((s, c) => s + c.spend, 0) || 0;
  const totalRevenue = ad?.campaigns.reduce((s, c) => s + c.revenue, 0) || 0;
  const currentRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // Navigation items
  const navItems = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'campaigns', label: 'Campanhas', icon: Target },
    { id: 'comparison', label: 'Comparação', icon: Calendar },
    { id: 'rules', label: 'Regras', icon: Cog },
    { id: 'consolidated', label: 'Consolidado', icon: Globe },
    { id: 'chat', label: 'Chat IA', icon: MessageCircle },
    { id: 'report', label: 'Relatório', icon: FileText },
  ];

  return (
    <div className="w-56 h-screen bg-sidebar border-r border-border flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-foreground text-sm">CortexAds</span>
            <span className="text-muted-foreground text-[10px] ml-1.5">v1.0</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ZONA 1: CANAIS */}
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Canais</h3>
          
          {/* Meta Ads - Expandable */}
          <Collapsible open={metaExpanded} onOpenChange={setMetaExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
              <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">f</span>
              </div>
              <span className="text-xs font-medium text-foreground flex-1 text-left">Meta Ads</span>
              {isConnected && !isTokenExpired && (
                <Circle className="w-2 h-2 fill-success text-success" />
              )}
              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${metaExpanded ? 'rotate-90' : ''}`} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-1 ml-2">
              {/* Connection status when not connected */}
              {(!isConnected || isTokenExpired) && (
                <div className="bg-muted/50 rounded-lg border border-border p-2.5 mb-2">
                  {isTokenExpired ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Circle className="w-2 h-2 fill-warning text-warning animate-pulse" />
                        <span className="text-[10px] text-foreground/80">Token expirado</span>
                      </div>
                      <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-7 text-[10px] gradient-primary text-primary-foreground">
                        {connecting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Reconectar'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Circle className="w-2 h-2 fill-destructive text-destructive" />
                        <span className="text-[10px] text-foreground/80">Desconectado</span>
                      </div>
                      <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-7 text-[10px] gradient-primary text-primary-foreground">
                        {connecting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Conectar'}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Account list with scroll */}
              {isConnected && !isTokenExpired && (
                <>
                  {/* Show/hide inactive toggle */}
                  {adAccounts.length > 0 && (
                    <button
                      onClick={() => setShowInactive(!showInactive)}
                      className="flex items-center gap-1.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors w-full px-1 mb-1.5"
                    >
                      {showInactive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showInactive ? 'Ocultar inativas' : `Mostrar inativas (${adAccounts.filter(a => !a.is_active).length})`}
                    </button>
                  )}

                  <ScrollArea className="max-h-[180px]">
                    <div className="space-y-2 pr-2">
                      {Object.entries(accountsByBusiness).map(([bizName, accounts]) => (
                        <div key={bizName} className="space-y-0.5">
                          <button
                            onClick={() => toggleBm(bizName)}
                            className="flex items-center gap-1.5 w-full text-[10px] text-muted-foreground hover:text-foreground px-1"
                          >
                            {isBmExpanded(bizName) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            {bizName} ({accounts.length})
                          </button>
                          {isBmExpanded(bizName) && (
                            <div className="space-y-0.5 ml-2">
                              {accounts.map(account => {
                                const isSelected = selectedAccountId === account.account_id;
                                return (
                                  <div
                                    key={account.id}
                                    onClick={() => handleSelectAccount(account.account_id, account.account_name)}
                                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-accent/60 border-l-2 border-l-accent-foreground'
                                        : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                                    }`}
                                  >
                                    <Circle className={`w-1.5 h-1.5 flex-shrink-0 ${account.is_active ? 'fill-success text-success' : 'fill-muted-foreground text-muted-foreground'}`} />
                                    <span className="text-[10px] truncate flex-1">{account.account_name || `act_${account.account_id}`}</span>
                                    {isSelected && currentRoas > 0 && (
                                      <span className={`text-[9px] font-bold flex-shrink-0 ${currentRoas >= 3 ? 'text-success' : currentRoas >= 2 ? 'text-warning' : 'text-destructive'}`}>
                                        {currentRoas.toFixed(1)}x
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {filteredAccounts.length === 0 && adAccounts.length > 0 && (
                        <p className="text-[9px] text-muted-foreground text-center py-2">
                          Nenhuma conta ativa
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Google Ads - Coming Soon */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md opacity-50">
            <div className="w-5 h-5 rounded bg-[#4285F4] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">G</span>
            </div>
            <span className="text-xs text-muted-foreground flex-1">Google Ads</span>
            <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Em breve</span>
          </div>

          {/* TikTok Ads - Coming Soon */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md opacity-50">
            <div className="w-5 h-5 rounded bg-foreground flex items-center justify-center">
              <span className="text-background text-[10px] font-bold">T</span>
            </div>
            <span className="text-xs text-muted-foreground flex-1">TikTok Ads</span>
            <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Em breve</span>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <Separator />
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Navegação</h3>
          <div className="space-y-0.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-all ${
                  currentTab === item.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* RODAPÉ: CONFIGURAÇÕES + USUÁRIO */}
      <div className="border-t border-border">
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-3 hover:bg-muted/50 transition-colors">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Config</span>
            <ChevronRight className={`w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform ${configOpen ? 'rotate-90' : ''}`} />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="px-3 pb-3">
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">API Key Claude</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="h-7 text-[10px] bg-muted border-border"
                />
                <p className="text-[9px] text-muted-foreground">Salva com segurança no servidor</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">ROAS Target</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={roasTarget}
                  onChange={(e) => setRoasTarget(e.target.value)}
                  className="h-7 text-[10px] bg-muted border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-7 text-[10px] bg-muted border-border">
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
                <Label className="text-[10px] text-muted-foreground">Nicho</Label>
                <Input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Ex: E-commerce, SaaS..."
                  className="h-7 text-[10px] bg-muted border-border"
                />
              </div>
              <Button onClick={handleSaveConfig} disabled={saving} size="sm" className="w-full h-7 text-[10px] gradient-primary text-primary-foreground">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Salvar</>}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* User Footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{profile?.name || 'Usuário'}</p>
            </div>
            <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
