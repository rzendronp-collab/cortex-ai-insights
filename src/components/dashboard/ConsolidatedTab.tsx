import { useEffect, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useProfile } from '@/hooks/useProfile';
import { getRoasColor, formatCurrency } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Inbox } from 'lucide-react';

const STORAGE_KEY = 'cortexads_all_accounts';
const MAX_ACCOUNTS = 10;

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
    // Update existing or add new
    const idx = accounts.findIndex(a => a.accountId === summary.accountId);
    if (idx >= 0) {
      accounts[idx] = summary;
    } else {
      accounts.push(summary);
    }
    // Keep max 10
    if (accounts.length > MAX_ACCOUNTS) {
      accounts = accounts.slice(-MAX_ACCOUNTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch { /* silent */ }
}

function loadAccountsFromStorage(): AccountSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ConsolidatedTab() {
  const { analysisData, currencySymbol, selectedAccountId, selectedPeriod } = useDashboard();
  const { adAccounts } = useMetaConnection();
  const { profile } = useProfile();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = currencySymbol;

  // Save current account data to localStorage when available
  useEffect(() => {
    if (!analysisData || !selectedAccountId) return;
    const campaigns = analysisData.campaigns || [];
    if (campaigns.length === 0) return;

    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
    const totalSales = campaigns.reduce((s, c) => s + c.purchases, 0);

    const account = adAccounts.find(a => a.account_id === selectedAccountId);
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

  // Build consolidated data: current memory + localStorage
  const allAccounts = useMemo(() => {
    const stored = loadAccountsFromStorage();
    // If current account has fresh data, it's already saved above
    return stored;
  }, [analysisData, selectedAccountId]);

  // Show current account data if available, otherwise show consolidated from storage
  const campaigns = analysisData?.campaigns || [];
  const hasCurrentData = campaigns.length > 0;
  const hasStoredData = allAccounts.length > 0;

  if (!hasCurrentData && !hasStoredData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Sem dados consolidados</h3>
        <p className="text-xs text-muted-foreground">Analise os dados primeiro clicando em Analisar.</p>
      </div>
    );
  }

  // If we have multiple accounts from localStorage, show consolidated view
  if (allAccounts.length >= 2) {
    const totalSpend = allAccounts.reduce((s, a) => s + a.totalSpend, 0);
    const totalRevenue = allAccounts.reduce((s, a) => s + a.totalRevenue, 0);
    const totalSales = allAccounts.reduce((s, a) => s + a.purchases, 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const chartData = allAccounts.map(a => ({
      name: a.name.length > 20 ? a.name.slice(0, 20) + '...' : a.name,
      roas: parseFloat(a.roas.toFixed(1)),
    }));

    return (
      <div className="space-y-4">
        <div className="bg-accent/30 border border-border rounded-lg px-4 py-2">
          <p className="text-[11px] text-muted-foreground">
            Consolidado de {allAccounts.length} contas • Dados salvos localmente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
            <p className="text-[10px] text-muted-foreground uppercase">ROAS Total</p>
            <p className={`text-2xl font-extrabold ${getRoasColor(avgRoas, roasTarget)}`}>{avgRoas.toFixed(1)}x</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
            <p className="text-[10px] text-muted-foreground uppercase">Vendas Total</p>
            <p className="text-2xl font-extrabold text-foreground">{totalSales}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
            <p className="text-[10px] text-muted-foreground uppercase">Gasto Total</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalSpend, currency)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
            <p className="text-[10px] text-muted-foreground uppercase">Receita Total</p>
            <p className="text-xl font-bold text-success">{formatCurrency(totalRevenue, currency)}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">ROAS por Conta</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, allAccounts.length * 40)}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2A42" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#7A8FAD' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#7A8FAD' }} width={120} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0E1420', border: '1px solid #2A3A5C', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', fontSize: 11, color: '#F0F4FF', fontFamily: "'Inter', sans-serif", padding: '10px 12px' }} />
              <ReferenceLine x={roasTarget} stroke="#4A5F7A" strokeDasharray="5 5" label={{ value: 'Meta', fontSize: 10, fill: '#7A8FAD' }} />
              <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
                {chartData.map((a, i) => {
                  const fill = a.roas >= roasTarget * 1.2 ? '#22D07A' : a.roas >= roasTarget ? '#4F8EF7' : '#F05252';
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <h3 className="text-xs font-semibold text-foreground mb-3">Detalhes por Conta</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Conta</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">ROAS</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Gasto</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Receita</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Vendas</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Período</th>
                </tr>
              </thead>
              <tbody>
                {allAccounts.map(a => (
                  <tr key={a.accountId} className="border-b border-border/50">
                    <td className="py-2 text-foreground font-medium truncate max-w-[200px]">{a.name}</td>
                    <td className={`py-2 text-right font-bold ${getRoasColor(a.roas, roasTarget)}`}>{a.roas.toFixed(1)}x</td>
                    <td className="py-2 text-right text-foreground">{formatCurrency(a.totalSpend, currency)}</td>
                    <td className="py-2 text-right text-success">{formatCurrency(a.totalRevenue, currency)}</td>
                    <td className="py-2 text-right text-foreground">{a.purchases}</td>
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

  // Single account fallback — show campaign-level detail
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSales = campaigns.reduce((s, c) => s + c.purchases, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const chartData = campaigns
    .filter(c => c.spend > 0)
    .map(c => ({
      name: c.name.length > 20 ? c.name.slice(0, 20) + '...' : c.name,
      roas: parseFloat(c.roas.toFixed(1)),
    }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <p className="text-[10px] text-muted-foreground uppercase">ROAS Total</p>
          <p className={`text-2xl font-extrabold ${getRoasColor(avgRoas, roasTarget)}`}>{avgRoas.toFixed(1)}x</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <p className="text-[10px] text-muted-foreground uppercase">Vendas Total</p>
          <p className="text-2xl font-extrabold text-foreground">{totalSales}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <p className="text-[10px] text-muted-foreground uppercase">Gasto Total</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalSpend, currency)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
          <p className="text-[10px] text-muted-foreground uppercase">Receita Total</p>
          <p className="text-xl font-bold text-success">{formatCurrency(totalRevenue, currency)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">ROAS por Campanha</h3>
        <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 30)}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,42,66,0.8)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#4A5F7A' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#4A5F7A' }} width={120} />
            <Tooltip contentStyle={{ backgroundColor: '#0E1420', border: '1px solid #2A3A5C', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', fontSize: 11, color: '#F0F4FF', fontFamily: "'Inter', sans-serif", padding: '10px 12px' }} />
            <ReferenceLine x={roasTarget} stroke="#4A5F7A" strokeDasharray="5 5" label={{ value: 'Meta', fontSize: 10, fill: '#4A5F7A' }} />
            <Bar dataKey="roas" radius={[0, 4, 4, 0]}>
              {chartData.map((a, i) => {
                const fill = a.roas >= roasTarget * 1.2 ? '#22D07A' : a.roas >= roasTarget ? '#4F8EF7' : '#F05252';
                return <Cell key={i} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 animate-fade-up">
        <h3 className="text-xs font-semibold text-foreground mb-3">Detalhes por Campanha</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Campanha</th>
                <th className="text-right py-2 text-muted-foreground font-medium">ROAS</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Gasto</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Receita</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Vendas</th>
                <th className="text-right py-2 text-muted-foreground font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.filter(c => c.spend > 0).map(c => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="py-2 text-foreground font-medium truncate max-w-[200px]">{c.name}</td>
                  <td className={`py-2 text-right font-bold ${getRoasColor(c.roas, roasTarget)}`}>{c.roas.toFixed(1)}x</td>
                  <td className="py-2 text-right text-foreground">{formatCurrency(c.spend, currency)}</td>
                  <td className="py-2 text-right text-success">{formatCurrency(c.revenue, currency)}</td>
                  <td className="py-2 text-right text-foreground">{c.purchases}</td>
                  <td className="py-2 text-right text-foreground">{c.ctr.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
