import { useState } from 'react';
import { Brain, LogOut, Settings, BarChart3, ChevronDown, ChevronRight, Circle, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function DashboardSidebar() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<'accounts' | 'config'>('accounts');
  const [bmExpanded, setBmExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  // Config state
  const [apiKey, setApiKey] = useState('');
  const [roasTarget, setRoasTarget] = useState(profile?.roas_target?.toString() || '3.0');
  const [currency, setCurrency] = useState(profile?.currency || 'R$');
  const [niche, setNiche] = useState(profile?.niche || '');

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // Save API key directly to DB (not fetched client-side for security)
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

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

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
            <div className="bg-muted/50 rounded-lg border border-border-hover p-3">
              <div className="flex items-center gap-2 mb-2">
                <Circle className="w-2.5 h-2.5 fill-destructive text-destructive animate-pulse-dot" />
                <span className="text-xs text-foreground/80">Meta desconectado</span>
              </div>
              <Button size="sm" className="w-full h-8 text-xs gradient-primary text-primary-foreground">
                Conectar Meta
              </Button>
            </div>

            {/* Demo BM */}
            <div>
              <button
                onClick={() => setBmExpanded(!bmExpanded)}
                className="flex items-center gap-1.5 w-full text-xs text-text-secondary hover:text-foreground"
              >
                {bmExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Demo Business
              </button>
              {bmExpanded && (
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-text-secondary">API Key Claude</Label>
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
              <Label className="text-[11px] text-text-secondary">ROAS Target</Label>
              <Input
                type="number"
                step="0.1"
                value={roasTarget}
                onChange={(e) => setRoasTarget(e.target.value)}
                className="h-8 text-xs bg-muted border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-text-secondary">Moeda</Label>
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
              <Label className="text-[11px] text-text-secondary">Nicho</Label>
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
