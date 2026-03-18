import { useEffect, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useProfile } from '@/hooks/useProfile';
import { getRoasColor, formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Inbox } from 'lucide-react';

const STORAGE_KEY = 'cortexads_all_accounts';
const MAX_ACCOUNTS = 10;
const CHART_GRID = 'hsl(var(--chart-grid-dark))';
const CHART_AXIS = 'hsl(var(--chart-axis-dark))';
const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--tooltip-surface))',
  border: '1px solid hsl(var(--tooltip-edge))',
  borderRadius: 8,
  fontSize: 11,
  color: '#E2E8F0',
  padding: '10px 12px',
};

interface AccountSummary {
  accountId: string;
  name: string;
  totalSpend: number;
  totalRevenue: number;
  roas: number;
  purchases: number;
  period: string;
  updatedAt: string;
}

function saveAccountToStorage(summary: AccountSummary) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let accounts: AccountSummary[] = raw ? JSON.parse(raw) : [];
    const idx = accounts.findIndex((a) => a.accountId === summary.accountId);
    if (idx >= 0) accounts[idx] = summary;
    else accounts.push(summary);
    if (accounts.length > MAX_ACCOUNTS) accounts = accounts.slice(-MAX_ACCOUNTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}

function loadAccountsFromStorage(): AccountSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const panelClass = 'rounded-lg border border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-panel))]';

export default function ConsolidatedTab() {
  const { analysisData, currencySymbol, selectedAccountId, selectedPeriod } = useDashboard();
  const { adAccounts } = useMetaConnection();
  const { profile } = useProfile();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = currencySymbol;

  useEffect(() => {
    if (!analysisData || !selectedAccountId) return;
    const campaigns = analysisData.campaigns || [];
    if (campaigns.length === 0) return;

    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
    const totalSales = campaigns.reduce((s, c) => s + c.purchases, 0);
    const account = adAccounts.find((a) => a.account_id === selectedAccountId);

    saveAccountToStorage({
      accountId: selectedAccountId,
      name: account?.account_name || selectedAccountId,
      totalSpend,
      totalRevenue,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      purchases: totalSales,
      period: selectedPeriod,
      updatedAt: new Date().toISOString(),
    });
  }, [analysisData, selectedAccountId, selectedPeriod, adAccounts]);

  const allAccounts = useMemo(() => loadAccountsFromStorage(), [analysisData, selectedAccountId]);
  const campaigns = analysisData?.campaigns || [];
  const hasCurrentData = campaigns.length > 0;
  const hasStoredData = allAccounts.length > 0;

  if (!hasCurrentData && !hasStoredData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-1 text-sm font-semibold text-foreground">Sem dados consolidados</h3>
        <p className="text-xs text-muted-foreground">Analise os dados primeiro clicando em Analisar.</p>
      </div>
    );
  }

  if (allAccounts.length >= 2) {
    const totalSpend = allAccounts.reduce((s, a) => s + a.totalSpend, 0);
    const totalRevenue = allAccounts.reduce((s, a) => s + a.totalRevenue, 0);
    const totalSales = allAccounts.reduce((s, a) => s + a.purchases, 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const chartData = allAccounts.map((a) => ({
      name: a.name.length > 20 ? `${a.name.slice(0, 20)}...` : a.name,
      roas: parseFloat(a.roas.toFixed(1)),
    }));

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-panel-strong))] px-4 py-2">
          <p className="text-[11px] text-text-muted">Consolidado de {allAccounts.length} contas • Dados salvos localmente</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className={`${panelClass} p-4 animate-fade-up`}>
            <p className="text-[10px] uppercase text-muted-foreground">ROAS Total</p>
            <p className={`text-2xl font-extrabold ${getRoasColor(avgRoas, roasTarget)}`}>{avgRoas.toFixed(1)}x</p>
          </div>
          <div className={`${panelClass} p-4 animate-fade-up`}>
            <p className="text-[10px] uppercase text-muted-foreground">Vendas Total</p>
            <p className="text-2xl font-extrabold text-white">{totalSales}</p>
          </div>
          <div className={`${panelClass} p-4 animate-fade-up`}>
            <p className="text-[10px] uppercase text-muted-foreground">Gasto Total</p>
            <p className="text-xl font-bold text-white">{formatCurrency(totalSpend, currency)}</p>
          </div>
          <div className={`${panelClass} p-4 animate-fade-up`}>
            <p className="text-[10px] uppercase text-muted-foreground">Receita Total</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalRevenue, currency)}</p>
          </div>
        </div>

        <div className={`${panelClass} p-4 animate-fade-up`}>
          <h3 className="mb-3 text-xs font-semibold text-white">ROAS por Conta</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, allAccounts.length * 40)}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis type="number" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: CHART_AXIS }} width={120} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <ReferenceLine x={roasTarget} stroke={CHART_AXIS} strokeDasharray="5 5" label={{ value: 'Meta', fontSize: 10, fill: CHART_AXIS }} />
              <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
                {chartData.map((a, i) => {
                  const fill = a.roas >= roasTarget * 1.2 ? '#16A34A' : a.roas >= roasTarget ? '#2563EB' : '#DC2626';
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${panelClass} p-4 animate-fade-up`}>
          <h3 className="mb-3 text-xs font-semibold text-white">Detalhes por Conta</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-panel-strong))]">
                  <th className="py-2 text-left font-medium text-muted-foreground">Conta</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">ROAS</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Gasto</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Receita</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Vendas</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Período</th>
                </tr>
              </thead>
              <tbody>
                {allAccounts.map((a) => (
                  <tr key={a.accountId} className="border-b border-[hsl(var(--surface-edge)/0.05)] hover:bg-[hsl(var(--surface-edge)/0.03)]">
                    <td className="max-w-[200px] truncate py-2 font-medium text-white">{a.name}</td>
                    <td className={`py-2 text-right font-bold ${getRoasColor(a.roas, roasTarget)}`}>{a.roas.toFixed(1)}x</td>
                    <td className="py-2 text-right text-white">{formatCurrency(a.totalSpend, currency)}</td>
                    <td className="py-2 text-right text-emerald-400">{formatCurrency(a.totalRevenue, currency)}</td>
                    <td className="py-2 text-right text-white">{a.purchases}</td>
                    <td className="py-2 text-right text-muted-foreground">{a.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSales = campaigns.reduce((s, c) => s + c.purchases, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const chartData = campaigns
    .filter((c) => c.spend > 0)
    .map((c) => ({
      name: c.name.length > 20 ? `${c.name.slice(0, 20)}...` : c.name,
      roas: parseFloat(c.roas.toFixed(1)),
    }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className={`${panelClass} p-4 animate-fade-up`}>
          <p className="text-[10px] uppercase text-muted-foreground">ROAS Total</p>
          <p className={`text-2xl font-extrabold ${getRoasColor(avgRoas, roasTarget)}`}>{avgRoas.toFixed(1)}x</p>
        </div>
        <div className={`${panelClass} p-4 animate-fade-up`}>
          <p className="text-[10px] uppercase text-muted-foreground">Vendas Total</p>
          <p className="text-2xl font-extrabold text-white">{totalSales}</p>
        </div>
        <div className={`${panelClass} p-4 animate-fade-up`}>
          <p className="text-[10px] uppercase text-muted-foreground">Gasto Total</p>
          <p className="text-xl font-bold text-white">{formatCurrency(totalSpend, currency)}</p>
        </div>
        <div className={`${panelClass} p-4 animate-fade-up`}>
          <p className="text-[10px] uppercase text-muted-foreground">Receita Total</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalRevenue, currency)}</p>
        </div>
      </div>

      <div className={`${panelClass} p-4 animate-fade-up`}>
        <h3 className="mb-3 text-xs font-semibold text-white">ROAS por Campanha</h3>
        <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 30)}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis type="number" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: CHART_AXIS }} width={120} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <ReferenceLine x={roasTarget} stroke={CHART_AXIS} strokeDasharray="5 5" label={{ value: 'Meta', fontSize: 10, fill: CHART_AXIS }} />
            <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
              {chartData.map((a, i) => {
                const fill = a.roas >= roasTarget * 1.2 ? '#16A34A' : a.roas >= roasTarget ? '#2563EB' : '#DC2626';
                return <Cell key={i} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={`${panelClass} p-4 animate-fade-up`}>
        <h3 className="mb-3 text-xs font-semibold text-white">Detalhes por Campanha</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[hsl(var(--surface-edge)/0.06)] bg-[hsl(var(--surface-panel-strong))]">
                <th className="py-2 text-left font-medium text-muted-foreground">Campanha</th>
                <th className="py-2 text-right font-medium text-muted-foreground">ROAS</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Gasto</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Receita</th>
                <th className="py-2 text-right font-medium text-muted-foreground">Vendas</th>
                <th className="py-2 text-right font-medium text-muted-foreground">CTR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.filter((c) => c.spend > 0).map((c) => (
                <tr key={c.id} className="border-b border-[hsl(var(--surface-edge)/0.05)] hover:bg-[hsl(var(--surface-edge)/0.03)]">
                  <td className="max-w-[200px] truncate py-2 font-medium text-white">{c.name}</td>
                  <td className={`py-2 text-right font-bold ${getRoasColor(c.roas, roasTarget)}`}>{c.roas.toFixed(1)}x</td>
                  <td className="py-2 text-right text-white">{formatCurrency(c.spend, currency)}</td>
                  <td className="py-2 text-right text-emerald-400">{formatCurrency(c.revenue, currency)}</td>
                  <td className="py-2 text-right text-white">{c.purchases}</td>
                  <td className="py-2 text-right text-white">{c.ctr.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
