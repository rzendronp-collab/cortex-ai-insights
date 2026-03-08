import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

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

export default function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente CortexAds. Posso analisar suas campanhas, sugerir otimizações e gerar copies. Como posso ajudar?' }
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
      const chatMessages = [...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0), userMessage]
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: { messages: chatMessages },
      });

      if (error) throw error;

      if (data?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Erro ao conectar com a IA. Verifique se sua API Key Claude está configurada em Config na sidebar.'
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col h-[600px] animate-fade-up" style={{ backgroundColor: '#0F1117' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-lg px-4 py-3 text-[13px] leading-relaxed ${
              m.role === 'user'
                ? 'gradient-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {suggestions.map(s => (
            <button key={s} onClick={() => sendMessage(s)} className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary min-h-[40px] max-h-[100px]"
          rows={1}
          disabled={loading}
        />
        <Button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} size="icon" className="h-10 w-10 gradient-primary text-primary-foreground">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
