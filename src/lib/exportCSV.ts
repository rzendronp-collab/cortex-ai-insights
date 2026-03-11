interface CampaignRow {
  name: string;
  status: string;
  roas: number;
  spend: number;
  revenue: number;
  purchases: number;
  ctr: number;
  cpm: number;
  cpv: number;
}

export function exportCampaignsCSV(
  campaigns: CampaignRow[],
  accountName: string,
  period: string,
  currencySymbol: string,
) {
  const BOM = '\uFEFF';
  const headers = ['Nome', 'Status', 'ROAS', `Gasto (${currencySymbol})`, `Receita (${currencySymbol})`, 'Compras', 'CTR (%)', `CPM (${currencySymbol})`, `CPV (${currencySymbol})`];

  const rows = campaigns.map(c => [
    `"${c.name.replace(/"/g, '""')}"`,
    c.status,
    c.roas.toFixed(2),
    c.spend.toFixed(2),
    c.revenue.toFixed(2),
    c.purchases.toString(),
    c.ctr.toFixed(2),
    c.cpm.toFixed(2),
    c.cpv.toFixed(2),
  ]);

  const csv = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const safeName = accountName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `cortex_meta_${safeName}_${period}_${date}.csv`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
