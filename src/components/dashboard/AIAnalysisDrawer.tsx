import { useState, useCallback } from 'react';
import { X, Brain, Copy, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Level = 'campaign' | 'adset' | 'ad';

interface Props {
  open: boolean;
  onClose: () => void;
  level: Level;
  name: string;
  metrics: Record<string, number | string>;
  roasTarget: number;
}

function buildPrompt(level: Level, name: string, metrics: Record<string, number | string>, roasTarget: number): string {
  const metricStr = Object.entries(metrics).map(([k, v]) => `${k}: ${v}`).join(', ');

  switch (level) {
    case 'campaign':
      return `Analisa esta campanha CBO de Meta Ads: "${name}". Métricas: ${metricStr}. Meta ROAS: ${roasTarget}x. Dá um diagnóstico direto e 3 ações concretas. Responde em português.`;
    case 'adset':
      return `Analisa este conjunto de anúncios: "${name}". Métricas: ${metricStr}. Identifica saturação ou oportunidade. Responde em português com recomendações práticas.`;
    case 'ad':
      return `Analisa este criativo de Meta Ads: "${name}". Métricas: ${metricStr}. Diz se deve pausar, escalar ou refrescar o criativo. Responde em português.`;
  }
}

export default function AIAnalysisDrawer({ open, onClose, level, name, metrics, roasTarget }: Props) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const analyze = useCallback(async () => {
    setLoading(true);
    setResponse('');
    try {
      const prompt = buildPrompt(level, name, metrics, roasTarget);
      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          system: 'Você é um especialista em Meta Ads. Dê análises diretas e acionáveis. Sem rodeios.',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
        },
      });
      if (error) throw error;
      setResponse(data?.content || 'Sem resposta da IA.');
    } catch (err: any) {
      setResponse(`Erro: ${err?.message || 'Falha na análise'}`);
    } finally {
      setLoading(false);
    }
  }, [level, name, metrics, roasTarget]);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) return null;

  const levelLabel = level === 'campaign' ? 'Campanha' : level === 'adset' ? 'Conjunto' : 'Anúncio';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[420px] max-w-full h-full bg-[#FFFFFF] border-l border-[#E4E7EF] flex flex-col animate-slide-in-left">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EF]">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-[14px] font-semibold text-[#0F1523]">Análise IA — {levelLabel}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#5A6478] hover:text-[#0F1523] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entity info */}
        <div className="px-5 py-3 bg-[#F1F3F8] border-b border-[#E4E7EF]">
          <p className="text-[12px] font-medium text-[#0F1523] truncate">{name}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(metrics).map(([k, v]) => (
              <span key={k} className="text-[10px] text-[#5A6478]">
                {k}: <b className="text-[#9BA5B7]">{typeof v === 'number' ? (v as number).toFixed(2) : v}</b>
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!response && !loading && (
            <div className="text-center py-8">
              <Brain className="w-8 h-8 text-[#7C3AED]/30 mx-auto mb-3" />
              <p className="text-[12px] text-[#5A6478] mb-4">Clique para iniciar a análise com IA</p>
              <button
                onClick={analyze}
                className="px-5 py-2 text-[12px] font-semibold bg-[#7C3AED] text-white rounded-lg hover:bg-[#5B53E6] transition-colors"
              >
                Analisar com IA
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
              <span className="text-[12px] text-[#9BA5B7]">Analisando...</span>
            </div>
          )}

          {response && !loading && (
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute top-0 right-0 p-1.5 text-[#5A6478] hover:text-[#0F1523] transition-colors"
                title="Copiar"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <div className="text-[12px] text-[#9BA5B7] leading-relaxed whitespace-pre-wrap pr-8">
                {response}
              </div>
              <button
                onClick={analyze}
                className="mt-4 text-[11px] text-[#7C3AED] hover:underline font-medium"
              >
                Analisar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
