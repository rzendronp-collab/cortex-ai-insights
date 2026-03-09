import { useState } from 'react';
import { Brain, LogOut, Settings, ChevronDown, ChevronRight, Circle, Save, Loader2, CheckCircle2, Eye, EyeOff, BarChart3, Target, Calendar, Cog, Globe, MessageCircle, FileText } from 'lucide-react';
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
import { toast } from 'sonner';

export default function DashboardSidebar() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { connection, adAccounts, isConnected, isTokenExpired, connectMeta, connectionLoading } = useMetaConnection();
  const { selectedAccountId, setSelectedAccountId, setSelectedAccountName, activeTab: currentTab, setActiveTab } = useDashboard();
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

  const handleSelectAccount = (accountId: string | null, accountName: string | null) => {
    setSelectedAccountId(accountId);
    setSelectedAccountName(accountName);
  };

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // Filter and group accounts
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
  const isBmExpanded = (bizName: string) => bmExpanded[bizName] !== false; // default expanded

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
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* CANAIS Section */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Canais</h3>
          
          {/* Meta Ads - Expandable */}
          <Collapsible open={metaExpanded} onOpenChange={setMetaExpanded}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">f</span>
                </div>
                <span className="text-xs font-medium text-foreground">Meta Ads</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${metaExpanded ? 'rotate-90' : ''}`} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-1 space-y-2 ml-2">
              {/* Meta Status */}
              <div className="bg-muted/50 rounded-lg border border-border p-2.5">
                {isConnected && !isTokenExpired ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-3 h-3 text-success" />
                      <span className="text-[10px] text-foreground font-medium">Conectado</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground ml-5">
                      {connection?.meta_user_name || 'Usuário Meta'}
                    </p>
                  </>
                ) : isTokenExpired ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Circle className="w-2 h-2 fill-warning text-warning animate-pulse-dot" />
                      <span className="text-[10px] text-foreground/80">Token expirado</span>
                    </div>
                    <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-7 text-[10px] gradient-primary text-primary-foreground">
                      {connecting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Reconectar'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Circle className="w-2 h-2 fill-destructive text-destructive animate-pulse-dot" />
                      <span className="text-[10px] text-foreground/80">Desconectado</span>
                    </div>
                    <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-7 text-[10px] gradient-primary text-primary-foreground">
                      {connecting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Conectar'}
                    </Button>
                  </>
                )}
              </div>

              {/* Show/hide inactive toggle */}
              {isConnected && adAccounts.length > 0 && (
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  className="flex items-center gap-1.5 text-[9px] text-muted-foreground hover:text-foreground transition-colors w-full px-1"
                >
                  {showInactive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showInactive ? 'Ocultar inativas' : 'Mostrar inativas'}
                </button>
              )}

              {/* Real Ad Accounts */}
              {isConnected && filteredAccounts.length > 0 && (
                Object.entries(accountsByBusiness).map(([bizName, accounts]) => (
                  <div key={bizName} className="space-y-1">
                    <button
                      onClick={() => toggleBm(bizName)}
                      className="flex items-center gap-1.5 w-full text-[10px] text-muted-foreground hover:text-foreground px-1"
                    >
                      {isBmExpanded(bizName) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {bizName} ({accounts.length})
                    </button>
                    {isBmExpanded(bizName) && (
                      <div className="space-y-1 ml-2">
                        {accounts.map(account => (
                          <div
                            key={account.id}
                            onClick={() => handleSelectAccount(account.account_id, account.account_name)}
                            className={`rounded-md p-2 cursor-pointer transition-all ${
                              selectedAccountId === account.account_id
                                ? 'bg-primary/15 border border-primary/40 shadow-sm'
                                : 'bg-muted/30 border border-transparent hover:border-border'
                            }`}
                          >
                            <p className="text-[10px] font-medium text-foreground truncate">{account.account_name || `act_${account.account_id}`}</p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[9px] text-muted-foreground">{account.currency}</span>
                              <span className={`text-[9px] font-medium ${account.is_active ? 'text-success' : 'text-destructive'}`}>
                                {account.is_active ? 'Ativa' : 'Inativa'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* No accounts message */}
              {isConnected && filteredAccounts.length === 0 && adAccounts.length > 0 && (
                <p className="text-[9px] text-muted-foreground text-center py-3 px-1">
                  Todas as contas estão inativas. Clique em "Mostrar inativas" acima.
                </p>
              )}

              {/* Demo fallback when not connected */}
              {!isConnected && (
                <div className="space-y-1">
                  <button
                    onClick={() => toggleBm('demo')}
                    className="flex items-center gap-1.5 w-full text-[10px] text-muted-foreground hover:text-foreground px-1"
                  >
                    {isBmExpanded('demo') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Demo Business
                  </button>
                  {isBmExpanded('demo') && (
                    <div className="ml-2">
                      <div className="bg-primary/5 border border-primary/20 rounded-md p-2 cursor-pointer">
                        <p className="text-[10px] font-medium text-foreground">Loja Demo</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[9px] text-success font-bold">ROAS 3.5x</span>
                          <span className="text-[9px] text-muted-foreground">R$ 3.5k</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Google Ads - Disabled */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md opacity-50 cursor-not-allowed">
            <div className="w-5 h-5 rounded bg-[#4285F4] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">G</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Google Ads</span>
            <span className="ml-auto text-[9px] text-muted-foreground">Em breve</span>
          </div>

          {/* TikTok Ads - Disabled */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md opacity-50 cursor-not-allowed">
            <div className="w-5 h-5 rounded bg-black flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">TT</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">TikTok Ads</span>
            <span className="ml-auto text-[9px] text-muted-foreground">Em breve</span>
          </div>
        </div>

        {/* NAVEGAÇÃO Section */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Navegação</h3>
          <div className="space-y-0.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-all ${
                  currentTab === item.id
                    ? 'bg-primary/15 text-primary font-medium'
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

      {/* Footer */}
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
  );
}
