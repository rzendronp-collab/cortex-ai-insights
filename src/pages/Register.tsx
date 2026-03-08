import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(email, password, name);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess('Conta criada! Verifique seu email para confirmar ou faça login.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full gradient-primary opacity-[0.06] blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-secondary opacity-[0.05] blur-[100px]" />

      <div className="w-full max-w-md mx-4 animate-fade-up">
        <div className="bg-card border border-border rounded-lg p-8 glow-blue">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">CortexAds</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-text-secondary text-sm">Nome completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required className="bg-muted border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-text-secondary text-sm">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="bg-muted border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-text-secondary text-sm">Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-muted border-border h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-text-secondary text-sm">Confirmar senha</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required className="bg-muted border-border h-11" />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-success text-sm">{success}</p>}

            <Button type="submit" disabled={loading || !!success} className="w-full h-11 gradient-primary text-primary-foreground font-semibold hover:opacity-90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center mt-6 text-muted-foreground text-sm">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
