import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { mockCampaigns, getRoasColor, getRecommendation } from '@/lib/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const chartColors = {
  primary: 'hsl(216, 91%, 64%)',
  success: 'hsl(152, 72%, 44%)',
  warning: 'hsl(34, 87%, 53%)',
  destructive: 'hsl(349, 83%, 62%)',
};

export default function CampaignsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const totalBudget = mockCampaigns.reduce((s, c) => s + c.budgetDaily, 0);
  const totalRecommended = mockCampaigns.reduce((s, c) => s + c.budgetRecommended, 0);

  return (
    <div className="space-y-4">
      {/* Budget overview */}
      <div className="flex gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 animate-fade-up">
          <ResponsiveContainer width={48} height={48}>
            <PieChart>
              <Pie data={[{ v: totalBudget }, { v: 100 }]} innerRadius={16} outerRadius={22} dataKey="v" strokeWidth={0}>
                <Cell fill={chartColors.primary} />
                <Cell fill="hsl(224,30%,16%)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Budget Atual</p>
            <p className="text-sm font-bold text-foreground">R$ {totalBudget}/dia</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 animate-fade-up">
          <ResponsiveContainer width={48} height={48}>
            <PieChart>
              <Pie data={[{ v: totalRecommended }, { v: 100 }]} innerRadius={16} outerRadius={22} dataKey="v" strokeWidth={0}>
                <Cell fill={chartColors.success} />
                <Cell fill="hsl(224,30%,16%)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Recomendado</p>
            <p className="text-sm font-bold text-success">R$ {totalRecommended}/dia</p>
          </div>
        </div>
      </div>

      {/* Campaign cards */}
      {mockCampaigns.map(c => {
        const rec = getRecommendation(c);
        const expanded = expandedId === c.id;
        const borderColor = c.roas >= 3 * 1.2 ? 'border-l-success' : c.roas >= 3 ? 'border-l-primary' : c.roas >= 3 * 0.7 ? 'border-l-warning' : 'border-l-destructive';

        return (
          <div key={c.id} className={`bg-card border border-border rounded-lg overflow-hidden animate-fade-up border-l-[3px] ${borderColor}`}>
            <button onClick={() => setExpandedId(expanded ? null : c.id)} className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${rec.bg} ${rec.color}`}>{rec.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{c.status} • R$ {c.budgetDaily}/dia ({((c.spend / (mockCampaigns.reduce((s, x) => s + x.spend, 0))) * 100).toFixed(0)}% budget)</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-lg font-extrabold ${getRoasColor(c.roas)}`}>{c.roas}x</p>
                  <p className="text-[10px] text-muted-foreground">ROAS</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-foreground">R$ {c.spend.toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">Gasto</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-foreground">{c.sales}</p>
                  <p className="text-[10px] text-muted-foreground">Vendas</p>
                </div>
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-bold text-foreground">{c.ctr}%</p>
                  <p className="text-[10px] text-muted-foreground">CTR</p>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {expanded && (
              <div className="border-t border-border p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-card-secondary animate-fade-up">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase text-muted-foreground font-medium">Métricas Completas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Receita', value: `R$ ${c.revenue.toFixed(0)}` },
                      { label: 'Lucro', value: `R$ ${(c.revenue - c.spend).toFixed(0)}` },
                      { label: 'CPC', value: `R$ ${c.cpc.toFixed(2)}` },
                      { label: 'CPV', value: `R$ ${(c.spend / c.sales).toFixed(2)}` },
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
                  <h4 className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Orçamento</h4>
                  <p className="text-xs text-foreground">Atual: <span className="font-bold">R$ {c.budgetDaily}/dia</span></p>
                  <p className="text-xs text-success mt-1">Recomendado: <span className="font-bold">R$ {c.budgetRecommended}/dia</span></p>
                  {c.budgetRecommended > c.budgetDaily && (
                    <p className="text-[10px] text-primary mt-1">↑ Aumentar R$ {c.budgetRecommended - c.budgetDaily}/dia</p>
                  )}
                  {c.budgetRecommended < c.budgetDaily && (
                    <p className="text-[10px] text-warning mt-1">↓ Reduzir R$ {c.budgetDaily - c.budgetRecommended}/dia</p>
                  )}
                </div>
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Análise IA</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {c.roas >= 4 ? 'Campanha performando acima da meta. Considere escalar o orçamento gradualmente em 20-30%.' :
                     c.roas >= 3 ? 'Performance estável. Teste novos criativos para melhorar ainda mais.' :
                     c.roas >= 1.5 ? 'Performance abaixo da meta. Revise públicos e criativos.' :
                     'Performance crítica. Considere pausar e realocar orçamento.'}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Copies A/B</h4>
                  <div className="space-y-2">
                    <div className="bg-muted rounded-md p-2">
                      <p className="text-[10px] text-primary font-medium">Copy A</p>
                      <p className="text-[11px] text-foreground">🔥 Últimas unidades! Aproveite {(c.roas * 10).toFixed(0)}% de desconto hoje.</p>
                    </div>
                    <div className="bg-muted rounded-md p-2">
                      <p className="text-[10px] text-secondary font-medium">Copy B</p>
                      <p className="text-[11px] text-foreground">✨ Transforme seu dia com nosso produto mais vendido. Frete grátis!</p>
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
