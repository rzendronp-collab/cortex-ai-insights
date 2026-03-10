import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { ExternalLink, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingModal() {
  const { profile, saveClaudeKey, completeOnboarding } = useProfile();
  const { connectMeta } = useMetaConnection();
  const [step, setStep] = useState(0);
  const [claudeKey, setClaudeKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyError, setKeyError] = useState('');

  const totalSteps = 4;

  // Don't render if onboarding is already done
  if (!profile || profile.onboarding_completed) return null;

  const goNext = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSaveKey = async () => {
    const trimmed = claudeKey.trim();
    if (!trimmed) {
      goNext();
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setKeyError('A key deve começar com "sk-ant-"');
      return;
    }
    setKeyError('');
    setSaving(true);
    try {
      await saveClaudeKey(trimmed);
      toast.success('Claude API Key salva!');
      goNext();
    } catch {
      toast.error('Erro ao salvar a key.');
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

  const handleFinish = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
    } catch {
      toast.error('Erro ao finalizar onboarding.');
    } finally {
      setSaving(false);
    }
  };

  const HexLogo = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hex-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z" fill="url(#hex-grad)" />
      <text x="32" y="40" textAnchor="middle" fill="white" fontSize="28" fontWeight="700" fontFamily="Syne, sans-serif">C</text>
    </svg>
  );

  const BackButton = () => (
    <button onClick={goBack} className="self-start text-[#6B7280] hover:text-[#94A3B8] text-xs flex items-center gap-1 transition-colors">
      <ChevronLeft className="w-3 h-3" /> Voltar
    </button>
  );

  const PrimaryButton = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1E]/95 backdrop-blur-sm">
      {/* Progress dots */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === step
                ? 'bg-[#6366F1] scale-125'
                : i < step
                ? 'bg-[#6366F1]/40'
                : 'border border-[#1F2937] bg-transparent'
            }`}
          />
        ))}
      </div>

      <div
        key={step}
        className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 max-w-md w-full mx-4 animate-fade-up"
      >
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center gap-6">
            <HexLogo />
            <div>
              <h1 className="text-[28px] font-bold text-[#F9FAFB]" style={{ fontFamily: 'Syne, sans-serif' }}>
                Bem-vindo ao CortexAds
              </h1>
              <p className="text-[#94A3B8] mt-2 text-sm">
                Configure em 2 passos e comece a otimizar suas campanhas com IA
              </p>
            </div>
            <PrimaryButton onClick={goNext}>
              Começar <ChevronRight className="w-4 h-4" />
            </PrimaryButton>
          </div>
        )}

        {/* Step 1: Claude API Key */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <BackButton />
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#F9FAFB]">Conecte a IA</h2>
              <p className="text-[#94A3B8] mt-1 text-sm">
                A Claude API Key permite análises inteligentes das suas campanhas.
              </p>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1.5 block">Claude API Key</label>
              <input
                type="password"
                value={claudeKey}
                onChange={(e) => { setClaudeKey(e.target.value); setKeyError(''); }}
                placeholder="sk-ant-..."
                className="w-full bg-[#0A0F1E] border border-[#1F2937] rounded-lg px-4 py-3 text-sm text-[#F9FAFB] placeholder:text-[#6B7280]/50 focus:outline-none focus:border-[#6366F1] transition-colors"
              />
              {keyError && <p className="text-[#EF4444] text-xs mt-1.5">{keyError}</p>}
            </div>
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1 transition-colors"
            >
              Obter minha key <ExternalLink className="w-3 h-3" />
            </a>
            <PrimaryButton onClick={handleSaveKey} disabled={saving}>
              Próximo <ChevronRight className="w-4 h-4" />
            </PrimaryButton>
          </div>
        )}

        {/* Step 2: Connect Meta */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <BackButton />
            <div className="text-center">
              <h2 className="text-xl font-bold text-[#F9FAFB]">Conecte sua conta Meta</h2>
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
            <p className="text-[10px] text-[#6B7280] text-center">
              Ou cole um token manualmente na aba Config após o onboarding
            </p>
            <button
              onClick={goNext}
              className="text-xs text-[#6B7280] hover:text-[#94A3B8] transition-colors mx-auto"
            >
              Pular por agora
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center gap-6">
            <BackButton />
            <CheckCircle2 className="w-16 h-16 text-[#10B981] animate-bounce" />
            <div>
              <h2 className="text-xl font-bold text-[#F9FAFB]">Tudo configurado!</h2>
               <p className="text-[#94A3B8] mt-1 text-sm">
                 Ative as contas na sidebar e clique em Atualizar
               </p>
            </div>
            <PrimaryButton onClick={handleFinish} disabled={saving}>
              Ir para o Dashboard <ChevronRight className="w-4 h-4" />
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
