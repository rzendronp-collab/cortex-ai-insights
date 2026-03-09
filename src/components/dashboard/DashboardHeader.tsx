import { useDashboard } from '@/context/DashboardContext';
import { useMetaData } from '@/hooks/useMetaData';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { Zap, Loader2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRoasColor } from '@/lib/mockData';

const periods = ['Hoje', '3d', '7d', '14d', '30d'];

export default function DashboardHeader() {
  const { selectedPeriod, setSelectedPeriod, selectedAccountId, selectedAccountName, analysisData, isFromCache, cacheTimestamp, currencySymbol } = useDashboard();
  const { isTokenExpired, connectMeta } = useMetaConnection();
  const { analyze, loading, roasTarget } = useMetaData();

  const ad = analysisData;
  const totalSpend = ad?.campaigns.reduce((s, c) => s + c.spend, 0) || 0;
  const totalRevenue = ad?.campaigns.reduce((s, c) => s + c.revenue, 0) || 0;
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const aboveMeta = ad?.campaigns.filter(c => c.roas >= roasTarget).length || 0;
  const belowMeta = ad?.campaigns.filter(c => c.roas < roasTarget && c.spend > 0).length || 0;
  const delta: number | null = ad && ad.campaignsPrev.length > 0
    ? (() => {
        const prevSpend = ad.campaignsPrev.reduce((s, c) => s + c.spend, 0);
        const prevRevenue = ad.campaignsPrev.reduce((s, c) => s + c.revenue, 0);
        const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
        if (prevRoas === 0) return null;
        return ((avgRoas - prevRoas) / prevRoas * 100);
      })()
    : null;

  const accountTitle = selectedAccountName || (selectedAccountId ? `act_${selectedAccountId}` : 'Selecione uma conta');
  const accountSubtitle = selectedAccountId ? `act_${selectedAccountId}` : '';

  const lastTime = ad?.lastUpdated ? new Date(ad.lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
  const cacheTime = cacheTimestamp ? new Date(cacheTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
      {isTokenExpired && (
        <div className="bg-warning/10 border-b border-warning/30 px-6 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span className="text-[11px] text-warning font-medium">Sua conexão Meta expirou.</span>
          <button onClick={() => connectMeta()} className="text-[11px] text-warning underline font-semibold">Reconectar →</button>
        </div>
      )}

      <div className="h-[60px] flex items-center justify-between px-6">
        <div>
          <h1 className="text-sm font-semibold text-foreground">{accountTitle}</h1>
          <p className="text-[11px] text-muted-foreground">
            {accountSubtitle && `${accountSubtitle} • `}
            {selectedPeriod === 'Hoje' ? 'Hoje' : `Últimos ${selectedPeriod}`}
            {lastTime && <span className="ml-2"><Clock className="w-3 h-3 inline" /> {lastTime}</span>}
            {isFromCache && cacheTime && (
              <span className="ml-2 text-primary">
                <RefreshCw className="w-3 h-3 inline" /> cache {cacheTime}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
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

          <Button
            size="sm"
            className="h-9 px-5 text-[13px] font-bold gradient-primary text-primary-foreground gap-1.5 rounded-lg glow-primary-btn hover:shadow-lg transition-all"
            onClick={() => analyze()}
            disabled={loading || !selectedAccountId}
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analisando...</>
            ) : (
              <><Zap className="w-3.5 h-3.5" />Analisar</>
            )}
          </Button>
        </div>
      </div>

      <div className="h-9 flex items-center gap-4 px-6 bg-card/50 border-t border-border text-[11px]">
        {ad ? (
          <>
            <span className={`font-bold ${getRoasColor(avgRoas, roasTarget)}`}>
              ROAS {avgRoas.toFixed(1)}x
              {delta !== null && delta !== 0 && <span className="opacity-70 ml-1">{delta >= 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(0)}%</span>}
            </span>
            <span className="text-border-hover">|</span>
            <span className="text-foreground">Gasto: <span className="font-semibold">{currencySymbol} {(totalSpend / 1000).toFixed(1)}k</span></span>
            <span className="text-border-hover">|</span>
            <span className="text-foreground">Receita: <span className="font-semibold text-success">{currencySymbol} {(totalRevenue / 1000).toFixed(1)}k</span></span>
            <span className="text-border-hover">|</span>
            <span className="text-foreground">{aboveMeta} acima da meta • {belowMeta} abaixo</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            {selectedAccountId ? 'Clique em Analisar para carregar os dados desta conta' : 'Selecione uma conta na sidebar'}
          </span>
        )}
      </div>
    </div>
  );
}
