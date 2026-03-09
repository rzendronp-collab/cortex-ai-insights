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

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === 'accounts' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <BarChart3 className="w-3.5 h-3.5 inline mr-1" />Contas
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === 'config' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Settings className="w-3.5 h-3.5 inline mr-1" />Config
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'accounts' ? (
          <div className="space-y-3">
            {/* Meta Status */}
            <div className="bg-muted/50 rounded-lg border border-border p-3">
              {isConnected && !isTokenExpired ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs text-foreground font-medium">Meta conectado</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-5">
                    {connection?.meta_user_name || 'Usuário Meta'}
                  </p>
                </>
              ) : isTokenExpired ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Circle className="w-2.5 h-2.5 fill-warning text-warning animate-pulse-dot" />
                    <span className="text-xs text-foreground/80">Token expirado</span>
                  </div>
                  <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-8 text-xs gradient-primary text-primary-foreground">
                    {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reconectar Meta'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Circle className="w-2.5 h-2.5 fill-destructive text-destructive animate-pulse-dot" />
                    <span className="text-xs text-foreground/80">Meta desconectado</span>
                  </div>
                  <Button onClick={handleConnectMeta} disabled={connecting} size="sm" className="w-full h-8 text-xs gradient-primary text-primary-foreground">
                    {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Conectar Meta'}
                  </Button>
                </>
              )}
            </div>

            {/* Show/hide inactive toggle */}
            {isConnected && adAccounts.length > 0 && (
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showInactive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showInactive ? 'Ocultar inativas' : 'Mostrar inativas'}
              </button>
            )}

            {/* Real Ad Accounts */}
            {isConnected && filteredAccounts.length > 0 && (
              Object.entries(accountsByBusiness).map(([bizName, accounts]) => (
                <div key={bizName}>
                  <button
                    onClick={() => toggleBm(bizName)}
                    className="flex items-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isBmExpanded(bizName) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {bizName} ({accounts.length})
                  </button>
                  {isBmExpanded(bizName) && (
                    <div className="mt-2 space-y-1.5 ml-2">
                      {accounts.map(account => (
                        <div
                          key={account.id}
                          onClick={() => handleSelectAccount(account.account_id, account.account_name)}
                          className={`rounded-md p-2.5 cursor-pointer transition-all ${
                            selectedAccountId === account.account_id
                              ? 'bg-primary/15 border border-primary/40 shadow-sm'
                              : 'bg-muted/30 border border-transparent hover:border-border'
                          }`}
                        >
                          <p className="text-xs font-medium text-foreground truncate">{account.account_name || `act_${account.account_id}`}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">{account.currency}</span>
                            <span className={`text-[10px] font-medium ${account.is_active ? 'text-success' : 'text-destructive'}`}>
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
              <p className="text-[10px] text-muted-foreground text-center py-4">
                Todas as contas estão inativas. Clique em "Mostrar inativas" acima.
              </p>
            )}

            {/* Demo fallback when not connected */}
            {!isConnected && (
              <div>
                <button
                  onClick={() => toggleBm('demo')}
                  className="flex items-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  {isBmExpanded('demo') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Demo Business
                </button>
                {isBmExpanded('demo') && (
                  <div className="mt-2 space-y-1.5 ml-2">
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-2.5 cursor-pointer">
                      <p className="text-xs font-medium text-foreground">Loja Demo</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-success font-bold">ROAS 3.5x</span>
                        <span className="text-[10px] text-muted-foreground">R$ 3.5k</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">API Key Claude</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-... (salva no servidor)"
                className="h-8 text-xs bg-muted border-border"
              />
              <p className="text-[10px] text-muted-foreground">Chave salva com segurança no servidor</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">ROAS Target</Label>
              <Input
                type="number"
                step="0.1"
                value={roasTarget}
                onChange={(e) => setRoasTarget(e.target.value)}
                className="h-8 text-xs bg-muted border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-8 text-xs bg-muted border-border">
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
              <Label className="text-[11px] text-muted-foreground">Nicho</Label>
              <Input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: E-commerce, SaaS..."
                className="h-8 text-xs bg-muted border-border"
              />
            </div>
            <Button onClick={handleSaveConfig} disabled={saving} size="sm" className="w-full h-8 text-xs gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Salvar</>}
            </Button>
          </div>
        )}
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
