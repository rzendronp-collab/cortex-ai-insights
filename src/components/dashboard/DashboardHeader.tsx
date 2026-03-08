import { useDashboard } from '@/context/DashboardContext';
import { BarChart3, Target, Calendar, Settings, Globe, MessageSquare, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const periods = ['Hoje', '3d', '7d', '14d', '30d'];

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
  { id: 'campaigns', label: 'Campanhas', icon: Target },
  { id: 'comparison', label: 'Comparação', icon: Calendar },
  { id: 'rules', label: 'Regras', icon: Settings },
  { id: 'consolidated', label: 'Consolidado', icon: Globe },
  { id: 'chat', label: 'Chat IA', icon: MessageSquare },
  { id: 'report', label: 'Relatório', icon: FileText },
];

export default function DashboardHeader() {
  const { selectedPeriod, setSelectedPeriod, activeTab, setActiveTab } = useDashboard();

  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
      {/* Top bar */}
      <div className="h-[54px] flex items-center justify-between px-5">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Loja Demo</h1>
          <p className="text-[11px] text-muted-foreground">act_demo_123456 • {selectedPeriod === 'Hoje' ? 'Hoje' : `Últimos ${selectedPeriod}`}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period pills */}
          <div className="flex bg-muted rounded-lg p-0.5">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                  selectedPeriod === p
                    ? 'gradient-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button size="sm" className="h-8 text-xs gradient-primary text-primary-foreground gap-1.5">
            <Zap className="w-3.5 h-3.5" />Analisar
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-9 flex items-center gap-4 px-5 bg-card/50 border-t border-border text-[11px]">
        <span className="text-success font-bold">ROAS 3.5x <span className="text-success/70">↑12%</span></span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground">Gasto: <span className="font-semibold">R$ 3.5k</span></span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground">Receita: <span className="font-semibold text-success">R$ 12.4k</span></span>
        <span className="text-muted-foreground">|</span>
        <span className="text-foreground">3 acima da meta • 2 abaixo</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 py-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
