import { Bot } from 'lucide-react';

const sections = [
  {
    icon: '🎯',
    title: 'DIAGNÓSTICO EXECUTIVO',
    content: 'Suas campanhas apresentam ROAS médio de 3.5x, 17% acima da meta de 3.0x. O retargeting é o maior destaque com 6.1x de retorno. Porém, 2 campanhas operam abaixo da meta, consumindo 33% do orçamento com apenas 16% das vendas. Há oportunidade clara de redistribuição para maximizar resultados.',
  },
  {
    icon: '⚡',
    title: 'TOP 5 AÇÕES PRÓXIMAS 24H',
    content: '1. Aumentar budget do Retargeting de R$100 para R$150/dia\n2. Pausar Story Ads (ROAS 0.6x) e realocar R$80\n3. Testar 3 novos criativos no Lookalike\n4. Criar público semelhante baseado nos compradores de Retargeting\n5. Ajustar lance da campanha Broad para otimizar CTR',
  },
  {
    icon: '💰',
    title: 'REDISTRIBUIÇÃO DE BUDGET',
    content: 'Budget atual: R$650/dia → Recomendado: R$610/dia\n\n• Campanha Principal: R$200 → R$280 (+40%)\n• Retargeting: R$100 → R$150 (+50%)\n• Lookalike: R$150 → R$80 (-47%)\n• Broad: R$120 → R$100 (-17%)\n• Story Ads: R$80 → R$0 (pausar)',
  },
  {
    icon: '🎨',
    title: '3 COPIES PRONTOS',
    content: '📝 Copy 1 - Urgência:\n"⏰ ÚLTIMAS HORAS! Desconto exclusivo de 40% termina à meia-noite. Aproveite agora →"\n\n📝 Copy 2 - Social Proof:\n"⭐ +2.000 clientes satisfeitos! Descubra por que somos o #1 em satisfação. Frete grátis hoje!"\n\n📝 Copy 3 - Benefício:\n"✨ Transforme sua rotina em 7 dias. Garantia de 30 dias ou seu dinheiro de volta."',
  },
  {
    icon: '🎯',
    title: 'PÚBLICOS PARA TESTAR',
    content: '1. Lookalike 1% dos compradores últimos 30 dias\n2. Interesse em marcas concorrentes + faixa 25-34\n3. Engajaram com stories nos últimos 14 dias\n4. Visitaram checkout mas não compraram (últimos 7 dias)',
  },
  {
    icon: '⏰',
    title: 'MELHORES HORÁRIOS',
    content: 'Pico de conversão: 19h - 22h (45% das vendas)\nSegundo melhor: 12h - 14h (18% das vendas)\nEvitar: 01h - 06h (2% das vendas, CPV 3x maior)\n\nRecomendação: Concentrar 60% do budget entre 18h-23h',
  },
  {
    icon: '📊',
    title: 'PREVISÃO 7 DIAS',
    content: 'Com as otimizações sugeridas:\n\n📈 ROAS estimado: 4.0x (+14% vs atual)\n💰 Receita projetada: R$17.2k (+38%)\n🛒 Vendas estimadas: 135 (+43%)\n💵 Economia de budget: R$280/semana\n\nRisco: Médio-baixo. Principais variáveis: saturação de público e sazonalidade.',
  },
];

export default function ReportTab() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Relatório Inteligente CortexAds</h2>
          <p className="text-[11px] text-muted-foreground">Gerado por IA • Últimos 7 dias</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i}>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wide mb-2">
              {s.icon} {s.title}
            </h3>
            <div className="h-px bg-border mb-3" />
            <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
