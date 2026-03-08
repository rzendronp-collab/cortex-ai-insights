export const mockCampaigns = [
  {
    id: '1', name: 'Campanha Principal - Vendas', status: 'ACTIVE',
    roas: 4.2, spend: 1250.00, revenue: 5250.00, sales: 42,
    ctr: 2.8, cpm: 18.50, cpc: 1.20, impressions: 67567, clicks: 1891,
    budgetDaily: 200, budgetRecommended: 280,
  },
  {
    id: '2', name: 'Retargeting - Carrinho Abandonado', status: 'ACTIVE',
    roas: 6.1, spend: 450.00, revenue: 2745.00, sales: 22,
    ctr: 4.5, cpm: 22.10, cpc: 0.85, impressions: 20361, clicks: 916,
    budgetDaily: 100, budgetRecommended: 150,
  },
  {
    id: '3', name: 'Lookalike - Compradores', status: 'ACTIVE',
    roas: 1.8, spend: 890.00, revenue: 1602.00, sales: 13,
    ctr: 1.2, cpm: 32.00, cpc: 2.10, impressions: 27812, clicks: 333,
    budgetDaily: 150, budgetRecommended: 80,
  },
  {
    id: '4', name: 'Interesse - Broad', status: 'ACTIVE',
    roas: 2.5, spend: 670.00, revenue: 1675.00, sales: 15,
    ctr: 1.9, cpm: 25.00, cpc: 1.55, impressions: 26800, clicks: 509,
    budgetDaily: 120, budgetRecommended: 100,
  },
  {
    id: '5', name: 'Story Ads - Novos Públicos', status: 'PAUSED',
    roas: 0.6, spend: 320.00, revenue: 192.00, sales: 2,
    ctr: 0.5, cpm: 40.00, cpc: 3.80, impressions: 8000, clicks: 40,
    budgetDaily: 80, budgetRecommended: 0,
  },
];

export const mockDailyData = [
  { date: 'Seg', roas: 3.2, spend: 480, revenue: 1536, sales: 12, ctr: 2.1 },
  { date: 'Ter', roas: 3.8, spend: 510, revenue: 1938, sales: 15, ctr: 2.4 },
  { date: 'Qua', roas: 2.9, spend: 530, revenue: 1537, sales: 11, ctr: 1.8 },
  { date: 'Qui', roas: 4.1, spend: 490, revenue: 2009, sales: 18, ctr: 2.9 },
  { date: 'Sex', roas: 3.5, spend: 560, revenue: 1960, sales: 14, ctr: 2.3 },
  { date: 'Sáb', roas: 4.5, spend: 420, revenue: 1890, sales: 16, ctr: 3.1 },
  { date: 'Dom', roas: 3.0, spend: 390, revenue: 1170, sales: 8, ctr: 1.9 },
];

export const mockHourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}h`,
  spend: Math.round(20 + Math.random() * 60),
  sales: Math.round(Math.random() * 5),
  isPeak: i >= 19 && i <= 22,
}));

export const mockGenderData = [
  { name: 'Feminino', value: 62, fill: 'hsl(216, 91%, 64%)' },
  { name: 'Masculino', value: 35, fill: 'hsl(250, 90%, 71%)' },
  { name: 'Outro', value: 3, fill: 'hsl(218, 25%, 38%)' },
];

export const mockAgeData = [
  { age: '18-24', percentage: 15 },
  { age: '25-34', percentage: 38 },
  { age: '35-44', percentage: 28 },
  { age: '45-54', percentage: 12 },
  { age: '55+', percentage: 7 },
];

export const mockPlatformData = [
  { name: 'Facebook', value: 45 },
  { name: 'Instagram', value: 38 },
  { name: 'Audience Network', value: 12 },
  { name: 'Messenger', value: 5 },
];

export function formatCurrency(value: number, currency = 'R$') {
  if (value >= 1000) return `${currency} ${(value / 1000).toFixed(1)}k`;
  return `${currency} ${value.toFixed(2)}`;
}

export function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

export function getRoasColor(roas: number, target = 3.0) {
  if (roas >= target * 1.2) return 'text-success';
  if (roas >= target) return 'text-primary';
  if (roas >= target * 0.7) return 'text-warning';
  return 'text-destructive';
}

export function getRecommendation(campaign: typeof mockCampaigns[0], target = 3.0) {
  if (campaign.roas >= target * 1.5) return { label: '🚀 Escalar', color: 'text-success', bg: 'bg-success/10 border-success/20' };
  if (campaign.roas >= target) return { label: '🔧 Otimizar', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' };
  if (campaign.roas >= target * 0.5) return { label: '⚠ Zero Vendas', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' };
  return { label: '⏸ Pausar', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
}
