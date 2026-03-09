import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function SettingsDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success('Verifique seu novo email para confirmar a alteração');
      setNewEmail('');
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso');
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar senha');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2.5 w-full px-5 py-3 hover:bg-bg-card-hover transition-colors">
          <Settings className="w-4 h-4 text-text-muted" />
          <span className="text-[13px] font-medium text-text-primary">⚙ Configurações</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-bg-card border-border-default sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-text-primary text-[16px]">Configurações da Conta</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="account" className="mt-2">
          <TabsList className="w-full bg-bg-base border border-border-default">
            <TabsTrigger value="account" className="flex-1 text-[12px] data-[state=active]:bg-bg-card">Conta</TabsTrigger>
            <TabsTrigger value="password" className="flex-1 text-[12px] data-[state=active]:bg-bg-card">Senha</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-[11px] text-text-muted uppercase tracking-wide">Email atual</Label>
              <Input
                value={user?.email || ''}
                readOnly
                className="h-9 text-[12px] bg-bg-base border-border-default opacity-60 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-text-muted uppercase tracking-wide">Novo email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novo@email.com"
                className="h-9 text-[12px] bg-bg-base border-border-default"
              />
            </div>
            <Button
              onClick={handleUpdateEmail}
              disabled={emailLoading || !newEmail.trim()}
              className="w-full h-9 text-[12px] gradient-blue text-white"
            >
              {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Atualizar email
            </Button>
          </TabsContent>

          <TabsContent value="password" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-[11px] text-text-muted uppercase tracking-wide">Nova senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="h-9 text-[12px] bg-bg-base border-border-default"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-text-muted uppercase tracking-wide">Confirmar senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="h-9 text-[12px] bg-bg-base border-border-default"
              />
            </div>
            {newPassword && newPassword.length < 8 && (
              <p className="text-[10px] text-destructive">Mínimo 8 caracteres</p>
            )}
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] text-destructive">As senhas não coincidem</p>
            )}
            <Button
              onClick={handleUpdatePassword}
              disabled={passwordLoading || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full h-9 text-[12px] gradient-blue text-white"
            >
              {passwordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Atualizar senha
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
