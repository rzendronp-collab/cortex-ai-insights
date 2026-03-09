import { useState } from 'react';
import { LogOut, Settings, ChevronDown, ChevronRight, Circle, Save, Loader2, Eye, EyeOff, BarChart3, Target, Calendar, Cog, Globe, MessageCircle, FileText, Unplug, Zap } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

function CortexLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#3B82F6"/>
          <stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
      </defs>
      <path d="M16 2L28.7 9V23L16 30L3.3 23V9L16 2Z" fill="url(#logoGrad)"/>
      <text x="16" y="21" textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="13" fill="white">C</text>
    </svg>
  );
}

export default function DashboardSidebar() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { connection, adAccounts, isConnected, isTokenExpired, connectMeta, disconnectMeta, connectionLoading } = useMetaConnection();
  const { selectedAccountId, setSelectedAccountId, setSelectedAccountName, setSelectedAccountCurrency, analysisData, activeTab: currentTab, setActiveTab } = useDashboard();
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
    <div className="w-[260px] h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="h-[60px] px-5 flex items-center gap-3 border-b border-border">
        <CortexLogo />
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground text-[15px] tracking-tight">CortexAds</span>
          <span className="text-[10px] text-muted-foreground bg-border/60 px-1.5 py-0.5 rounded">v1.0</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* META CONNECTION STATUS */}
        {(!isConnected || isTokenExpired) && (
          <div className="bg-muted/50 rounded-lg border border-border p-3">
            {isTokenExpired ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="w-2 h-2 fill-warning text-warning animate-pulse" />
                  <span className="text-[11px] text-foreground/80 font-medium">Token expirado</span>
                </div>
                <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-8 text-[11px] gradient-primary text-primary-foreground rounded-lg">
                  {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reconectar'}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Circle className="w-2 h-2 fill-destructive text-destructive" />
                  <span className="text-[11px] text-foreground/80 font-medium">Meta desconectado</span>
                </div>
                <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-8 text-[11px] gradient-primary text-primary-foreground rounded-lg">
                  {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Conectar Meta Ads'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* CANAIS */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px] px-2">Canais</h3>
          
          <Collapsible open={metaExpanded} onOpenChange={setMetaExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-card transition-colors">
              <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">f</span>
              </div>
              <span className="text-[13px] font-medium text-foreground flex-1 text-left">Meta Ads</span>
              {isConnected && !isTokenExpired && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-0.5 text-muted-foreground hover:text-destructive transition-colors" title="Desconectar Meta">
                        <Unplug className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#0E1420] border-[#1E2D4A]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#F0F4FF]">Desconectar Meta?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#94A3B8]">
                          Você precisará reconectar para continuar analisando campanhas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#080B14] border-[#1E2D4A] text-[#94A3B8] hover:bg-[#1E2D4A]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnectMeta} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desconectar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Circle className="w-2 h-2 fill-success text-success" />
                </>
              )}
              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${metaExpanded ? 'rotate-90' : ''}`} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-1">
              {isConnected && !isTokenExpired && (
                <>
                  {adAccounts.length > 0 && (
                    <button
                      onClick={() => setShowInactive(!showInactive)}
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full px-3 mb-2"
                    >
                      {showInactive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showInactive ? 'Ocultar inativas' : `Mostrar inativas (${adAccounts.filter(a => !a.is_active).length})`}
                    </button>
                  )}

                  <ScrollArea className="max-h-[calc(100vh-480px)]">
                    <div className="space-y-1.5 px-1">
                      {Object.entries(accountsByBusiness).map(([bizName, accounts]) => (
                        <div key={bizName} className="space-y-0.5">
                          <button
                            onClick={() => toggleBm(bizName)}
                            className="flex items-center gap-1.5 w-full text-[10px] text-muted-foreground hover:text-foreground px-2 py-1"
                          >
                            {isBmExpanded(bizName) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span className="font-medium">{bizName}</span>
                            <span className="text-muted-foreground/60">({accounts.length})</span>
                          </button>
                          {isBmExpanded(bizName) && (
                            <div className="space-y-0.5 ml-2">
                              {accounts.map(account => {
                                const isSelected = selectedAccountId === account.account_id;
                                return (
                                  <div
                                    key={account.id}
                                    onClick={() => handleSelectAccount(account.account_id, account.account_name, account.currency)}
                                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-primary/10 border-l-2 border-l-primary'
                                        : 'hover:bg-card border-l-2 border-l-transparent'
                                    }`}
                                    title={account.account_name || `act_${account.account_id}`}
                                  >
                                    <Circle className={`w-1.5 h-1.5 flex-shrink-0 ${account.is_active ? 'fill-success text-success' : 'fill-muted-foreground text-muted-foreground'}`} />
                                    <span className={`text-[11px] truncate flex-1 ${isSelected ? 'text-primary font-medium' : 'text-foreground/80'}`}>
                                      {account.account_name || `act_${account.account_id}`}
                                    </span>
                                    {isSelected && currentRoas > 0 && (
                                      <span className={`text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded ${
                                        currentRoas >= 3 ? 'text-success bg-success/10' : currentRoas >= 2 ? 'text-warning bg-warning/10' : 'text-destructive bg-destructive/10'
                                      }`}>
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
                        <p className="text-[10px] text-muted-foreground text-center py-3">
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
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg opacity-40">
            <div className="w-5 h-5 rounded bg-[#4285F4] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">G</span>
            </div>
            <span className="text-[13px] text-muted-foreground flex-1">Google Ads</span>
            <span className="text-[9px] bg-border text-muted-foreground px-1.5 py-0.5 rounded font-medium">Em breve</span>
          </div>

          {/* TikTok Ads - Coming Soon */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg opacity-40">
            <div className="w-5 h-5 rounded bg-foreground flex items-center justify-center flex-shrink-0">
              <span className="text-background text-[10px] font-bold">T</span>
            </div>
            <span className="text-[13px] text-muted-foreground flex-1">TikTok Ads</span>
            <span className="text-[9px] bg-border text-muted-foreground px-1.5 py-0.5 rounded font-medium">Em breve</span>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <Separator className="bg-border" />
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[1px] px-2">Navegação</h3>
          <div className="space-y-0.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-none transition-all text-[13px] ${
                  currentTab === item.id
                    ? 'text-[#F0F4FF] font-semibold border-b-2 border-b-[#3B82F6] bg-transparent'
                    : 'text-[#64748B] font-medium hover:text-[#94A3B8] bg-transparent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RODAPÉ: CONFIGURAÇÕES + USUÁRIO */}
      <div className="border-t border-border">
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger className="flex items-center gap-2.5 w-full px-5 py-3 hover:bg-card transition-colors">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-[13px] font-medium text-foreground">Config</span>
            <ChevronRight className={`w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform ${configOpen ? 'rotate-90' : ''}`} />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="px-4 pb-3">
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-[1px]">API Key Claude</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="h-8 text-[11px] bg-muted border-border rounded-lg"
                />
                <p className="text-[9px] text-muted-foreground">Salva com segurança no servidor</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-[1px]">ROAS Target</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={roasTarget}
                  onChange={(e) => setRoasTarget(e.target.value)}
                  className="h-8 text-[11px] bg-muted border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-[1px]">Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-8 text-[11px] bg-muted border-border rounded-lg">
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
                <Label className="text-[10px] text-muted-foreground uppercase tracking-[1px]">Nicho</Label>
                <Input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Ex: E-commerce, SaaS..."
                  className="h-8 text-[11px] bg-muted border-border rounded-lg"
                />
              </div>
              <Button onClick={handleSaveConfig} disabled={saving} size="sm" className="w-full h-8 text-[11px] gradient-primary text-primary-foreground rounded-lg glow-primary-btn">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Salvar</>}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* User Footer */}
        <div className="px-5 py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{profile?.name || 'Usuário'}</p>
            </div>
            <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
