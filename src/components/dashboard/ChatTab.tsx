import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  'O que faço hoje?',
  'Qual campanha pausar?',
  'Onde está desperdiçando?',
  'Qual campanha escalar?',
  'Gere 3 copies prontos',
];

function buildSystemPrompt(ctx: {
  campaigns: any[];
  campaignsPrev: any[];
  dailyData: any[];
  hourlyData: any[];
  roasTarget: number;
  currency: string;
  accountName: string | null;
}) {
  const { campaigns, campaignsPrev, dailyData, hourlyData, roasTarget, currency, accountName } = ctx;
  const activeCamps = campaigns.filter((c: any) => c.spend > 0);
  const totalSpend = activeCamps.reduce((s: number, c: any) => s + c.spend, 0);
  const totalRevenue = activeCamps.reduce((s: number, c: any) => s + c.revenue, 0);
  const totalSales = activeCamps.reduce((s: number, c: any) => s + c.purchases, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const prevActive = campaignsPrev.filter((c: any) => c.spend > 0);
  const prevSpend = prevActive.reduce((s: number, c: any) => s + c.spend, 0);
  const prevRevenue = prevActive.reduce((s: number, c: any) => s + c.revenue, 0);
  const prevSales = prevActive.reduce((s: number, c: any) => s + c.purchases, 0);
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;

  const peakHours = [...hourlyData].sort((a: any, b: any) => b.spend - a.spend).filter((h: any) => h.spend > 0).slice(0, 3).map((h: any) => h.hour);

  const campLines = activeCamps
    .sort((a: any, b: any) => b.roas - a.roas)
    .map((c: any, i: number) => {
      const prev = campaignsPrev.find((p: any) => p.id === c.id);
      const delta = prev && prev.spend > 0 ? ` (antes: ROAS ${prev.roas.toFixed(1)}x, ${currency}${prev.spend.toFixed(0)})` : '';
      return `#${i + 1} "${c.name}" | Status: ${c.status} | ROAS: ${c.roas.toFixed(2)}x | Gasto: ${currency}${c.spend.toFixed(2)} | Receita: ${currency}${c.revenue.toFixed(2)} | Vendas: ${c.purchases} | CTR: ${c.ctr.toFixed(2)}% | CPC: ${currency}${c.cpc.toFixed(2)} | CPM: ${currency}${c.cpm.toFixed(2)}${delta}`;
    }).join('\n');

  const dailyLines = dailyData.slice(-7).map((d: any) =>
    `${d.date}: ROAS ${d.roas.toFixed(1)}x | ${currency}${d.spend.toFixed(0)} gasto | ${currency}${d.revenue.toFixed(0)} receita | ${d.sales} vendas`
  ).join('\n');

  return `Você é o CortexAds, assistente de mídia paga sênior. Fale como um gestor de tráfego experiente — direto, com números, sem enrolação. Use markdown para formatar respostas (negrito, listas, headers). Responda em português do Brasil.

CONTA: ${accountName || 'Sem nome'}
META ROAS: ${roasTarget}x | MOEDA: ${currency}

RESUMO ATUAL:
- Gasto total: ${currency}${totalSpend.toFixed(2)} | Receita: ${currency}${totalRevenue.toFixed(2)} | ROAS: ${avgRoas.toFixed(2)}x | Vendas: ${totalSales}
${prevSpend > 0 ? `- Período anterior: Gasto ${currency}${prevSpend.toFixed(2)} | Receita ${currency}${prevRevenue.toFixed(2)} | ROAS ${prevRoas.toFixed(2)}x | Vendas ${prevSales}` : ''}
${peakHours.length > 0 ? `- Horários pico: ${peakHours.join(', ')}` : ''}

CAMPANHAS (${activeCamps.length} com gasto):
${campLines || 'Nenhuma campanha com gasto.'}

EVOLUÇÃO DIÁRIA (últimos 7 dias):
${dailyLines || 'Sem dados diários.'}

REGRAS:
- Sempre cite números reais das campanhas acima
- Sugira ações com valores exatos (ex: "aumentar budget de ${currency}X para ${currency}Y (+Z%)")
- Priorize campanhas por impacto no resultado total
- Se perguntarem sobre escalar, considere ROAS vs meta e volume de gasto
- Se perguntarem sobre pausar, olhe campanhas com ROAS abaixo de ${(roasTarget * 0.5).toFixed(1)}x`;
}


export default function ChatTab() {
  const { analysisData, selectedAccountName, currencySymbol } = useDashboard();
  const { profile } = useProfile();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = currencySymbol;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou o **CortexAds**. Tenho acesso completo aos dados da sua conta. Pergunte qualquer coisa — qual campanha escalar, onde cortar, copies, budget ideal. 🚀' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatMessages = [...messages.filter((_, i) => i > 0), userMessage]
        .map(m => ({ role: m.role, content: m.content }));

      const system = analysisData
        ? buildSystemPrompt({
            campaigns: analysisData.campaigns,
            campaignsPrev: analysisData.campaignsPrev,
            dailyData: analysisData.dailyData,
            hourlyData: analysisData.hourlyData,
            roasTarget,
            currency,
            accountName: selectedAccountName,
          })
        : 'Você é o assistente CortexAds, especialista em Meta Ads. O usuário ainda não analisou nenhuma conta. Sugira que ele conecte a conta Meta e clique em Analisar. Responda em português do Brasil.';

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: { messages: chatMessages, system },
      });

      if (error) throw error;

      if (data?.error) {
        const errorMsg = String(data.error);
        if (errorMsg.includes('401') || errorMsg.includes('inválida') || errorMsg.includes('invalid')) {
          toast.error('Claude API Key inválida — verifique em ⚙ Config');
        } else if (errorMsg.includes('429') || errorMsg.includes('rate') || errorMsg.includes('limite')) {
          toast.warning('Limite de uso Claude atingido — aguarde alguns minutos');
        }
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg = String(err?.message || '');
      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('network')) {
        toast.error('Erro de conexão — verifique sua internet');
      } else {
        toast.error('Claude API Key inválida — verifique em ⚙ Config');
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Erro ao conectar com a IA. Verifique se sua API Key Claude está configurada em ⚙ Config na sidebar.'
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl flex flex-col h-[600px] animate-fade-up">
      {/* Context banner */}
      {analysisData && (
        <div className="px-4 py-2 border-b border-[#2A3850] bg-[#60A5FA]/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
          <span className="text-[10px] text-text-muted">
            IA com contexto de <strong className="text-text-primary">{selectedAccountName || 'conta selecionada'}</strong> — {analysisData.campaigns.filter(c => c.spend > 0).length} campanhas ativas
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white'
                  : 'bg-[#161D2E] border border-[#2A3850] text-text-primary'
              }`}
              style={{
                borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              }}
            >
              {m.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_li]:text-[13px] [&_strong]:text-text-primary [&_p]:text-[13px]">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-[#2A3850] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-text-muted" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[#161D2E] border border-[#2A3850] rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-[11px] px-3 py-1.5 rounded-full border border-[#2A3850] text-text-muted hover:text-[#60A5FA] hover:border-[#60A5FA] transition-all duration-200"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#2A3850] p-3 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Pergunte sobre suas campanhas..."
          className="flex-1 bg-[#161D2E] border border-[#2A3850] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-[#60A5FA] min-h-[40px] max-h-[100px] transition-colors duration-200"
          rows={1}
          disabled={loading}
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          size="icon"
          className="h-10 w-10 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white hover:opacity-90 rounded-lg"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
