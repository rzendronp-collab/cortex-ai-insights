import jsPDF from 'jspdf';

interface PDFData {
  accountName: string;
  period: string;
  analysisData: {
    campaigns: any[];
    campaignsPrev: any[];
    dailyData: any[];
    hourlyData: any[];
  };
  aiReport: string;
  currency: string;
  roasTarget: number;
}

const PRIMARY: [number, number, number] = [79, 142, 247];
const DARK: [number, number, number] = [30, 30, 40];
const MUTED: [number, number, number] = [120, 120, 140];
const LIGHT_BG: [number, number, number] = [245, 247, 252];

function addFooter(doc: jsPDF, dateStr: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`CortexAds AI — gerado em ${dateStr}`, 20, 285);
    doc.text(`${i} / ${pageCount}`, 190, 285, { align: 'right' });
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text(title, 20, y);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(20, y + 2, 190, y + 2);
  return y + 10;
}

function addTableRow(
  doc: jsPDF, cols: string[], y: number, widths: number[],
  isHeader = false
): number {
  const x0 = 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
  doc.setTextColor(isHeader ? 255 : 40, isHeader ? 255 : 40, isHeader ? 255 : 50);

  if (isHeader) {
    doc.setFillColor(...PRIMARY);
    doc.rect(x0, y - 4, widths.reduce((a, b) => a + b, 0), 7, 'F');
  } else {
    doc.setFillColor(...LIGHT_BG);
    doc.rect(x0, y - 4, widths.reduce((a, b) => a + b, 0), 7, 'F');
  }

  let cx = x0 + 2;
  cols.forEach((col, i) => {
    doc.text(String(col).substring(0, Math.floor(widths[i] / 2.2)), cx, y);
    cx += widths[i];
  });
  return y + 7;
}

export function generatePDF(data: PDFData) {
  const { accountName, period, analysisData, aiReport, currency } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);

  // ═══ PAGE 1 — Cover ═══
  doc.setFillColor(15, 20, 35);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('CortexAds AI', 105, 100, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(200, 200, 210);
  doc.text('Relatório de Performance', 105, 115, { align: 'center' });

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(60, 125, 150, 125);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(accountName || 'Conta', 105, 145, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(180, 180, 190);
  doc.text(`Período: ${period}`, 105, 158, { align: 'center' });
  doc.text(`Gerado em: ${dateStr}`, 105, 168, { align: 'center' });

  // ═══ PAGE 2 — KPIs ═══
  doc.addPage();
  let y = 25;
  y = addSectionTitle(doc, '📊 KPIs — Visão Geral', y);

  const camps = analysisData.campaigns.filter((c: any) => c.spend > 0);
  const prev = analysisData.campaignsPrev.filter((c: any) => c.spend > 0);
  const totalSpend = camps.reduce((s: number, c: any) => s + c.spend, 0);
  const totalRevenue = camps.reduce((s: number, c: any) => s + c.revenue, 0);
  const totalSales = camps.reduce((s: number, c: any) => s + c.purchases, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr = camps.length > 0 ? camps.reduce((s: number, c: any) => s + (c.ctr || 0), 0) / camps.length : 0;
  const costPerSale = totalSales > 0 ? totalSpend / totalSales : 0;

  const prevSpend = prev.reduce((s: number, c: any) => s + c.spend, 0);
  const prevRevenue = prev.reduce((s: number, c: any) => s + c.revenue, 0);
  const prevSales = prev.reduce((s: number, c: any) => s + c.purchases, 0);
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
  const prevCtr = prev.length > 0 ? prev.reduce((s: number, c: any) => s + (c.ctr || 0), 0) / prev.length : 0;
  const prevCPS = prevSales > 0 ? prevSpend / prevSales : 0;

  const delta = (curr: number, prev: number) => {
    if (!prev) return '—';
    const pct = ((curr - prev) / prev) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const kpiWidths = [50, 45, 45, 30];
  y = addTableRow(doc, ['Métrica', 'Atual', 'Anterior', 'Delta'], y, kpiWidths, true);
  const kpis = [
    ['ROAS', `${avgRoas.toFixed(2)}x`, `${prevRoas.toFixed(2)}x`, delta(avgRoas, prevRoas)],
    ['Investido', `${currency}${totalSpend.toFixed(2)}`, `${currency}${prevSpend.toFixed(2)}`, delta(totalSpend, prevSpend)],
    ['Receita', `${currency}${totalRevenue.toFixed(2)}`, `${currency}${prevRevenue.toFixed(2)}`, delta(totalRevenue, prevRevenue)],
    ['Vendas', `${totalSales}`, `${prevSales}`, delta(totalSales, prevSales)],
    ['CTR', `${avgCtr.toFixed(2)}%`, `${prevCtr.toFixed(2)}%`, delta(avgCtr, prevCtr)],
    ['Custo/Venda', `${currency}${costPerSale.toFixed(2)}`, `${currency}${prevCPS.toFixed(2)}`, delta(prevCPS, costPerSale)],
  ];
  kpis.forEach(row => { y = addTableRow(doc, row, y, kpiWidths); });

  // ═══ PAGE 3 — Campaigns ═══
  doc.addPage();
  y = 25;
  y = addSectionTitle(doc, '🏆 Top Campanhas', y);

  const colWidths = [55, 20, 30, 20, 45];
  y = addTableRow(doc, ['Campanha', 'ROAS', 'Gasto', 'Vendas', 'Status'], y, colWidths, true);

  const top10 = [...camps].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10);
  top10.forEach((c: any) => {
    const name = (c.name || '').substring(0, 28);
    y = addTableRow(doc, [
      name,
      `${c.roas.toFixed(2)}x`,
      `${currency}${c.spend.toFixed(0)}`,
      `${c.purchases}`,
      c.status || 'ACTIVE',
    ], y, colWidths);
    if (y > 270) { doc.addPage(); y = 25; }
  });

  // ═══ PAGE 4+ — AI Report ═══
  if (aiReport) {
    doc.addPage();
    y = 25;
    y = addSectionTitle(doc, '🤖 Relatório IA', y);

    const cleanText = aiReport
      .replace(/\*\*/g, '')
      .replace(/#{1,3}\s*/g, '')
      .replace(/\|/g, ' ')
      .replace(/---+/g, '');

    const lines = cleanText.split('\n');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) { y += 3; return; }

      const isTitle = /^[🎯⚡💰🎨📊⏰\d]/.test(trimmed) || trimmed.length < 60 && trimmed === trimmed.toUpperCase();
      if (isTitle) {
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
      }

      const wrapped = doc.splitTextToSize(trimmed, 170);
      if (y + wrapped.length * 4.5 > 275) {
        doc.addPage();
        y = 25;
      }
      doc.text(wrapped, 20, y);
      y += wrapped.length * 4.5;
    });
  }

  addFooter(doc, dateStr);

  const safeName = (accountName || 'conta').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const periodClean = period.replace(/\s/g, '_');
  doc.save(`cortexads_${safeName}_${periodClean}_${dateFile}.pdf`);
}
