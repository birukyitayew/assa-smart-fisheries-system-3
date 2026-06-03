import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  navy: [13, 33, 62],
  blue: [37, 99, 235],
  cyan: [14, 165, 233],
  green: [16, 185, 129],
  amber: [245, 158, 11],
  red: [239, 68, 68],
  slate: [71, 85, 105],
  light: [248, 250, 252],
  border: [226, 232, 240],
};

const numberFormatter = new Intl.NumberFormat('en-ET');
const currencyFormatter = new Intl.NumberFormat('en-ET', {
  style: 'currency',
  currency: 'ETB',
  maximumFractionDigits: 0,
});

function formatNumber(value) {
  return numberFormatter.format(Math.round(Number(value || 0)));
}

function formatKg(value) {
  return `${formatNumber(value)} kg`;
}

function formatCurrency(value) {
  return currencyFormatter.format(Math.round(Number(value || 0)));
}

function formatPct(value) {
  const numeric = Number(value || 0);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)} pct`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-ET', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function addHeader(doc, report) {
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, 210, 42, 'F');
  doc.setFillColor(...COLORS.blue);
  doc.rect(0, 38, 210, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('ASSA Smart Fisheries System', 14, 17);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(report.title, 14, 26);
  doc.text(
    `${formatDate(report.window.start)} - ${formatDate(report.window.end)}${
      report.region ? `  |  ${report.region.name}` : ''
    }`,
    14,
    34,
  );
  doc.setFontSize(9);
  doc.text(`Generated ${formatDate(report.generatedAt)}`, 160, 17);
}

function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.line(14, 285, 196, 285);
    doc.setTextColor(...COLORS.slate);
    doc.setFontSize(8);
    doc.text('ASSA Fisheries Command Center - Confidential government operations report', 14, 291);
    doc.text(`Page ${page} of ${pageCount}`, 181, 291);
  }
}

function card(doc, x, y, width, height, label, value, accent = COLORS.blue, sublabel = '') {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(x, y, width, height, 3, 3, 'FD');
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 3, height, 2, 2, 'F');
  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), x + 7, y + 9);
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(15);
  doc.text(value, x + 7, y + 20);
  if (sublabel) {
    doc.setTextColor(...COLORS.slate);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(sublabel, x + 7, y + 29);
  }
}

function sectionTitle(doc, title, y) {
  doc.setTextColor(...COLORS.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, y);
  doc.setDrawColor(...COLORS.blue);
  doc.setLineWidth(0.8);
  doc.line(14, y + 3, 48, y + 3);
}

function drawInsights(doc, report, y) {
  sectionTitle(doc, 'Executive Summary', y);
  const summary = report.executiveSummary;
  const insights = [
    `Verified catch changed ${formatPct(summary.catchTrendPct)} versus the previous ${report.period}.`,
    `Market revenue changed ${formatPct(summary.revenueTrendPct)} with ${formatNumber(
      report.kpis.orders,
    )} confirmed orders.`,
    `Verification rate is ${summary.verificationRatePct}% across ${formatNumber(
      report.kpis.submissions,
    )} catch submissions.`,
    `Operational risk level is ${summary.riskLevel}; open violations: ${formatNumber(
      report.kpis.openViolations,
    )}.`,
  ];

  doc.setFillColor(...COLORS.light);
  doc.roundedRect(14, y + 8, 182, 31, 3, 3, 'F');
  doc.setTextColor(...COLORS.slate);
  doc.setFontSize(9);
  insights.forEach((insight, index) => {
    doc.text(`• ${insight}`, 19, y + 17 + index * 6);
  });
}

function addTable(doc, title, y, head, body) {
  sectionTitle(doc, title, y);
  autoTable(doc, {
    startY: y + 7,
    head: [head],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.4,
      lineColor: COLORS.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: COLORS.light,
    },
    margin: { left: 14, right: 14 },
  });
}

export function generateProfessionalReportPdf(report) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addHeader(doc, report);

  card(
    doc,
    14,
    52,
    42,
    32,
    'Verified Catch',
    formatKg(report.kpis.verifiedCatchKg),
    COLORS.green,
    `${formatPct(report.executiveSummary.catchTrendPct)} vs prior period`,
  );
  card(
    doc,
    61,
    52,
    42,
    32,
    'Revenue',
    formatCurrency(report.kpis.revenue),
    COLORS.blue,
    `${formatPct(report.executiveSummary.revenueTrendPct)} vs prior period`,
  );
  card(
    doc,
    108,
    52,
    42,
    32,
    'Fleet Active',
    `${formatNumber(report.kpis.activeBoats)}/${formatNumber(report.kpis.totalBoats)}`,
    COLORS.cyan,
    'boats reporting',
  );
  card(
    doc,
    155,
    52,
    42,
    32,
    'Risk Level',
    report.executiveSummary.riskLevel,
    report.executiveSummary.riskLevel === 'High' ? COLORS.red : COLORS.amber,
    `${formatNumber(report.kpis.openViolations)} open violations`,
  );

  drawInsights(doc, report, 98);

  addTable(
    doc,
    'Catch Mix by Species',
    148,
    ['Species', 'Total catch', 'Submissions', 'Verified'],
    report.speciesMix.map((row) => [
      row.species,
      formatKg(row.total_kg),
      formatNumber(row.submissions),
      formatNumber(row.verified_count),
    ]),
  );

  addTable(
    doc,
    'Zone Performance',
    doc.lastAutoTable.finalY + 14,
    ['Zone', 'Total catch', 'Submissions', 'Verified', 'Rejected'],
    report.zonePerformance.map((row) => [
      row.zone_name,
      formatKg(row.total_kg),
      formatNumber(row.submissions),
      formatNumber(row.verified_count),
      formatNumber(row.rejected_count),
    ]),
  );

  doc.addPage();
  addHeader(doc, report);

  addTable(
    doc,
    'Quota Utilization',
    56,
    ['Species', 'Used', 'Limit', 'Usage'],
    report.quotaStatus.map((row) => [
      row.species,
      formatKg(row.current_month_kg),
      formatKg(row.monthly_limit_kg),
      `${row.usage_pct.toFixed(1)}%`,
    ]),
  );

  addTable(
    doc,
    'Market Performance',
    doc.lastAutoTable.finalY + 14,
    ['Species', 'Sold', 'Revenue', 'Avg price'],
    report.marketPrices.map((row) => [
      row.species,
      formatKg(row.kg_sold),
      formatCurrency(row.revenue),
      `${formatCurrency(row.avg_price)} / kg`,
    ]),
  );

  addTable(
    doc,
    'Latest Catch Submissions',
    doc.lastAutoTable.finalY + 14,
    ['Reference', 'Fisher', 'Species', 'Quantity', 'Status', 'Zone'],
    report.recentCatches.map((row) => [
      row.reference_id,
      row.fisher_name,
      row.species,
      formatKg(row.quantity_kg),
      row.status,
      row.zone_name,
    ]),
  );

  addFooter(doc);

  const fileName = `ASSA-${report.period}-professional-report-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  doc.save(fileName);
}
