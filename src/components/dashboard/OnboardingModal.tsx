import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Brain, ExternalLink, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingModalProps {
  onComplete: () => void;
  connectMeta: () => Promise<void>;
}

export default function OnboardingModal({ onComplete, connectMeta }: OnboardingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [claudeKey, setClaudeKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const totalSteps = 4;

  const goNext = () => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const goBack = () => {
    setDirection('back');
    setStep((s) => Math.max(s - 1, 0));
  };

  const saveClaudeKey = async () => {
    if (!user || !claudeKey.trim()) {
      goNext();
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ claude_api_key: claudeKey.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Claude API Key salva com sucesso!');
      goNext();
    } catch {
      toast.error('Erro ao salvar a key. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectMeta = async () => {
    try {
      await connectMeta();
    } catch {
      toast.error('Erro ao iniciar conexão com a Meta.');
    }
  };

  const finishOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      onComplete();
    } catch {
      toast.error('Erro ao finalizar onboarding.');
    } finally {
      setSaving(false);
    }
  };

  const animationClass = direction === 'forward'
    ? 'animate-fade-up'
    : 'animate-fade-up';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080B14]/95 backdrop-blur-sm">
      {/* Progress dots */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === step
                ? 'bg-[#3B82F6] scale-125'
                : i < step
                ? 'bg-[#3B82F6]/40'
                : 'border border-[#64748B]/50 bg-transparent'
            }`}
          />
        ))}
      </div>

      <div
        key={step}
        className={`bg-[#0E1420] border border-[#1E2D4A] rounded-2xl p-8 max-w-md w-full mx-4 ${animationClass}`}
      >
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-[28px] font-bold text-[#F0F4FF]" style={{ fontFamily: 'Syne, sans-serif' }}>
                Bem-vindo ao CortexAds
              </h1>
              <p className="text-[#94A3B8] mt-2 text-sm">
                Configure em 2 passos e comece a otimizar suas campanhas com IA
              </p>
            </div>
            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Começar <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Claude API Key */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <button onClick={goBack} className="self-start text-[#64748B] hover:text-[#94A3B8] text-xs flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#F0F4FF]">Conecte a IA</h2>
              <p className="text-[#94A3B8] mt-1 text-sm">
                A Claude API Key permite análises inteligentes das suas campanhas.
              </p>
            </div>
            <div>
              <label className="text-xs text-[#64748B] mb-1.5 block">Claude API Key</label>
              <input
                type="password"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-[#080B14] border border-[#1E2D4A] rounded-lg px-4 py-3 text-sm text-[#F0F4FF] placeholder:text-[#64748B]/50 focus:outline-none focus:border-[#3B82F6] transition-colors"
              />
            </div>
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 transition-colors"
            >
              Como obter minha key <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={saveClaudeKey}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Próximo <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* Step 2: Connect Meta */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <button onClick={goBack} className="self-start text-[#64748B] hover:text-[#94A3B8] text-xs flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#F0F4FF]">Conecte sua conta Meta</h2>
              <p className="text-[#94A3B8] mt-1 text-sm">
                Autorize o acesso para carregar suas campanhas automaticamente.
              </p>
            </div>
            <button
              onClick={handleConnectMeta}
              className="w-full py-3 rounded-xl bg-[#1877F2] text-white font-semibold text-sm hover:bg-[#1565C0] transition-colors flex items-center justify-center gap-2"
            >
              Conectar com Meta <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-[#64748B] text-center">
              Ou cole um token manualmente na aba Config após o onboarding
            </p>
            <button
              onClick={goNext}
              className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors mx-auto"
            >
              Pular por agora
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center gap-6">
            <button onClick={goBack} className="self-start text-[#64748B] hover:text-[#94A3B8] text-xs flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-3 h-3" /> Voltar
            </button>
            <CheckCircle2 className="w-16 h-16 text-[#10B981]" />
            <div>
              <h2 className="text-xl font-bold text-[#F0F4FF]">Tudo configurado!</h2>
              <p className="text-[#94A3B8] mt-1 text-sm">
                Selecione uma conta na sidebar e clique em Analisar ▶
              </p>
            </div>
            <button
              onClick={finishOnboarding}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Ir para o Dashboard <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
