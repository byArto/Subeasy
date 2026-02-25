import type { Subscription, Category, AppSettings } from './types';
import { convertCurrency, getMonthlyPrice } from './utils';
import { CURRENCY_SYMBOLS } from './constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryName(sub: Subscription, categories: Category[]): string {
  return categories.find((c) => c.id === sub.category)?.name ?? sub.category;
}

function formatCycleLabel(cycle: string, lang: string): string {
  const labels: Record<string, Record<string, string>> = {
    monthly:  { ru: 'Ежемесячно', en: 'Monthly' },
    yearly:   { ru: 'Ежегодно',   en: 'Yearly' },
    weekly:   { ru: 'Еженедельно',en: 'Weekly' },
    'one-time':{ ru: 'Разовый',   en: 'One-time' },
    trial:    { ru: 'Пробный',    en: 'Trial' },
  };
  return labels[cycle]?.[lang === 'ru' ? 'ru' : 'en'] ?? cycle;
}

function formatDate(iso: string, lang: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatAmount(
  sub: Subscription,
  settings: AppSettings,
): string {
  const eurRate = settings.eurExchangeRate ?? 105;
  const converted = convertCurrency(
    sub.price, sub.currency, settings.displayCurrency,
    settings.exchangeRate, eurRate,
  );
  const sym = CURRENCY_SYMBOLS[settings.displayCurrency] ?? '';
  return `${converted.toLocaleString('ru-RU')} ${sym}`;
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportCSV(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): void {
  const isRu = lang === 'ru';

  const headers = isRu
    ? ['Название', 'Категория', 'Сумма', 'Валюта', 'Цикл', 'Следующий платёж', 'Дата начала', 'Способ оплаты', 'Статус', 'Заметки']
    : ['Name', 'Category', 'Amount', 'Currency', 'Cycle', 'Next payment', 'Start date', 'Payment method', 'Status', 'Notes'];

  const eurRate = settings.eurExchangeRate ?? 105;

  const rows = subscriptions.map((sub) => {
    const converted = convertCurrency(
      sub.price, sub.currency, settings.displayCurrency,
      settings.exchangeRate, eurRate,
    );
    return [
      sub.name,
      getCategoryName(sub, categories),
      converted.toString(),
      settings.displayCurrency,
      formatCycleLabel(sub.cycle, lang),
      formatDate(sub.nextPaymentDate, lang),
      formatDate(sub.startDate, lang),
      sub.paymentMethod || '—',
      sub.isActive ? (isRu ? 'Активна' : 'Active') : (isRu ? 'Неактивна' : 'Inactive'),
      sub.notes || '',
    ];
  });

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(';'))
    .join('\r\n');

  // UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subeasy-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

export async function exportPDF(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): Promise<void> {
  // Dynamic import — not bundled unless called
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const isRu = lang === 'ru';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const eurRate = settings.eurExchangeRate ?? 105;
  const sym = CURRENCY_SYMBOLS[settings.displayCurrency] ?? '';

  // ── Palette ──
  const GREEN: [number, number, number] = [0, 200, 60];
  const DARK: [number, number, number]  = [15, 15, 25];
  const GRAY: [number, number, number]  = [100, 100, 120];
  const LIGHT: [number, number, number] = [245, 245, 250];

  const pageW = doc.internal.pageSize.getWidth();

  // ── Header bar ──
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 24, 'F');

  doc.setTextColor(0, 220, 60);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SubEasy', 14, 15);

  doc.setTextColor(160, 160, 180);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const genLabel = isRu ? 'Сформирован' : 'Generated';
  doc.text(`${genLabel}: ${formatDate(new Date().toISOString(), lang)}`, pageW - 14, 15, { align: 'right' });

  // ── Summary block ──
  const active = subscriptions.filter((s) => s.isActive);
  const totalMonthly = active.reduce((sum, sub) => {
    const monthly = getMonthlyPrice(sub);
    const converted = convertCurrency(monthly, sub.currency, settings.displayCurrency, settings.exchangeRate, eurRate);
    return sum + converted;
  }, 0);

  doc.setFillColor(...LIGHT);
  doc.roundedRect(14, 30, pageW - 28, 22, 3, 3, 'F');

  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const totalLabel = isRu ? 'Итого в месяц:' : 'Monthly total:';
  doc.text(totalLabel, 20, 39);
  doc.setTextColor(...GREEN);
  doc.setFontSize(14);
  doc.text(`${totalMonthly.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ${sym}`, 20, 47);

  doc.setTextColor(...GRAY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const countLabel = isRu
    ? `${active.length} активных · ${subscriptions.length} всего`
    : `${active.length} active · ${subscriptions.length} total`;
  doc.text(countLabel, pageW - 20, 43, { align: 'right' });

  // ── Table ──
  const headers = isRu
    ? ['Подписка', 'Категория', 'Сумма', 'Цикл', 'Следующий платёж', 'Статус']
    : ['Subscription', 'Category', 'Amount', 'Cycle', 'Next payment', 'Status'];

  const rows = subscriptions.map((sub) => {
    const converted = convertCurrency(sub.price, sub.currency, settings.displayCurrency, settings.exchangeRate, eurRate);
    return [
      `${sub.icon} ${sub.name}`,
      getCategoryName(sub, categories),
      `${converted.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${sym}`,
      formatCycleLabel(sub.cycle, lang),
      formatDate(sub.nextPaymentDate, lang),
      sub.isActive ? (isRu ? '✓ Активна' : '✓ Active') : (isRu ? '✗ Неактивна' : '✗ Inactive'),
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [headers],
    body: rows,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: DARK,
      textColor: [0, 220, 60],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 42 },
      2: { halign: 'right', cellWidth: 28 },
      5: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [220, 220, 230],
    tableLineWidth: 0.1,
  });

  // ── Footer ──
  const finalY = (doc as InstanceType<typeof jsPDF> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? 200;
  doc.setDrawColor(...LIGHT);
  doc.line(14, finalY + 8, pageW - 14, finalY + 8);
  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  const footerText = isRu ? 'Экспорт из SubEasy — трекер подписок' : 'Exported from SubEasy — subscription tracker';
  doc.text(footerText, pageW / 2, finalY + 14, { align: 'center' });

  doc.save(`subeasy-${new Date().toISOString().split('T')[0]}.pdf`);
}
