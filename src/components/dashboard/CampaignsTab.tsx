import { useState } from 'react';
import { ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import { mockCampaigns, getRoasColor, formatCurrency } from '@/lib/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const chartColors = {
  primary: 'hsl(216, 91%, 64%)',
  success: 'hsl(152, 72%, 44%)',
  warning: 'hsl(34, 87%, 53%)',
  destructive: 'hsl(349, 83%, 62%)',
};

export default function CampaignsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { analysisData } = useDashboard();
  const { profile } = useProfile();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = profile?.currency || 'R$';

  const campaigns = analysisData?.campaigns || mockCampaigns.map(c => ({
    ...c, purchases: c.sales, cpv: c.spend / c.sales, budgetDaily: c.budgetDaily, budgetRecommended: c.budgetRecommended,
  }));

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);

  if (analysisData && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Sem campanhas para este período</h3>
        <p className="text-xs text-muted-foreground">Selecione um período maior ou verifique a conta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Campaign cards */}
      {campaigns.map(c => {
        const expanded = expandedId === c.id;
        const roas = c.roas;
        const rec = roas >= roasTarget * 1.5
          ? { label: '🚀 Escalar', color: 'text-success', bg: 'bg-success/10 border-success/20' }
          : roas >= roasTarget
            ? { label: '🔧 Otimizar', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' }
            : roas > 0
              ? { label: '⚠ Atenção', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' }
              : { label: '⏸ Pausar', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
        const borderColor = roas >= roasTarget * 1.2 ? 'border-l-success' : roas >= roasTarget ? 'border-l-primary' : roas >= roasTarget * 0.7 ? 'border-l-warning' : 'border-l-destructive';
        const purchases = 'purchases' in c ? c.purchases : (c as any).sales || 0;
        const revenue = c.revenue;
        const budgetPct = totalSpend > 0 ? ((c.spend / totalSpend) * 100).toFixed(0) : '0';

        return (
          <div key={c.id} className={`bg-card border border-border rounded-lg overflow-hidden animate-fade-up border-l-[3px] ${borderColor}`}>
            <button onClick={() => setExpandedId(expanded ? null : c.id)} className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${rec.bg} ${rec.color}`}>{rec.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{c.status} • {budgetPct}% do budget</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-lg font-extrabold ${getRoasColor(roas, roasTarget)}`}>{roas.toFixed(1)}x</p>
                  <p className="text-[10px] text-muted-foreground">ROAS</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(c.spend, currency)}</p>
                  <p className="text-[10px] text-muted-foreground">Gasto</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-foreground">{purchases}</p>
                  <p className="text-[10px] text-muted-foreground">Vendas</p>
                </div>
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-bold text-foreground">{c.ctr.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">CTR</p>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {expanded && (
              <div className="border-t border-border p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/20 animate-fade-up">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase text-muted-foreground font-medium">Métricas Completas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Receita', value: formatCurrency(revenue, currency) },
                      { label: 'Lucro', value: formatCurrency(revenue - c.spend, currency) },
                      { label: 'CPC', value: `${currency} ${c.cpc.toFixed(2)}` },
                      { label: 'CPV', value: `${currency} ${(c.cpv || 0).toFixed(2)}` },
                      { label: 'Impressões', value: c.impressions.toLocaleString() },
                      { label: 'Cliques', value: c.clicks.toLocaleString() },
                    ].map(m => (
                      <div key={m.label}>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        <p className="text-xs font-bold text-foreground">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Análise IA</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {roas >= roasTarget * 1.5 ? 'Campanha performando muito acima da meta. Considere escalar o orçamento gradualmente em 20-30%.' :
                     roas >= roasTarget ? 'Performance estável acima da meta. Teste novos criativos para melhorar ainda mais.' :
                     roas > 0 ? 'Performance abaixo da meta. Revise públicos e criativos ou considere pausar.' :
                     'Sem retorno. Considere pausar imediatamente e realocar orçamento.'}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Sugestões</h4>
                  <div className="space-y-2">
                    <div className="bg-muted rounded-md p-2">
                      <p className="text-[10px] text-primary font-medium">Copy Sugestão</p>
                      <p className="text-[11px] text-foreground">🔥 Últimas unidades! Aproveite desconto exclusivo hoje.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
