import type { Subscription, Category, AppSettings } from './types';
import { convertCurrency, getMonthlyPrice } from './utils';
import { CURRENCY_SYMBOLS } from './constants';

// ─── Environment ──────────────────────────────────────────────────────────────

function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Telegram?.WebApp?.initData;
}

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryName(sub: Subscription, categories: Category[]): string {
  return categories.find((c) => c.id === sub.category)?.name ?? sub.category;
}

function formatCycleLabel(cycle: string, isRu: boolean): string {
  const labels: Record<string, [string, string]> = {
    monthly:   ['Ежемесячно', 'Monthly'],
    yearly:    ['Ежегодно',   'Yearly'],
    weekly:    ['Еженедельно','Weekly'],
    'one-time':['Разовый',   'One-time'],
    trial:     ['Пробный',   'Trial'],
  };
  const pair = labels[cycle];
  return pair ? pair[isRu ? 0 : 1] : cycle;
}

function formatDate(iso: string, isRu: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function exportCSV(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): void {
  const isRu = lang === 'ru';
  const eurRate = settings.eurExchangeRate ?? 105;
  const sym = CURRENCY_SYMBOLS[settings.displayCurrency] ?? '';

  const headers = isRu
    ? ['Название', 'Категория', 'Сумма', 'Валюта', 'Цикл', 'Следующий платёж', 'Дата начала', 'Способ оплаты', 'Статус', 'Заметки']
    : ['Name', 'Category', 'Amount', 'Currency', 'Cycle', 'Next payment', 'Start date', 'Payment method', 'Status', 'Notes'];

  const rows = subscriptions.map((sub) => {
    const converted = convertCurrency(
      sub.price, sub.currency, settings.displayCurrency,
      settings.exchangeRate, eurRate,
    );
    return [
      sub.name,
      getCategoryName(sub, categories),
      `${converted} ${sym}`,
      settings.displayCurrency,
      formatCycleLabel(sub.cycle, isRu),
      formatDate(sub.nextPaymentDate, isRu),
      formatDate(sub.startDate, isRu),
      sub.paymentMethod || '—',
      sub.isActive ? (isRu ? 'Активна' : 'Active') : (isRu ? 'Неактивна' : 'Inactive'),
      sub.notes || '',
    ];
  });

  // Comma separator — universally compatible (Excel, Google Sheets, iOS, Numbers)
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(','))
    .join('\r\n');

  if (isTelegramWebApp()) {
    // Telegram WKWebView can't open blob: URLs — copy to clipboard instead
    navigator.clipboard.writeText('\uFEFF' + csv).then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Telegram.WebApp.showAlert(
        isRu
          ? 'CSV скопирован в буфер обмена. Вставьте в Excel или Google Sheets.'
          : 'CSV copied to clipboard. Paste into Excel or Google Sheets.',
      );
    }).catch(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Telegram.WebApp.showAlert(
        isRu ? 'Не удалось скопировать CSV.' : 'Failed to copy CSV.',
      );
    });
    return;
  }

  // UTF-8 BOM — Excel / Numbers on macOS/iOS open Cyrillic correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subeasy-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── PDF via HTML Print ───────────────────────────────────────────────────────
// Uses browser's native print/PDF — supports Cyrillic, all Unicode, system fonts.
// On iOS: share sheet → Print → Save to Files as PDF.
// On desktop: Ctrl+P → Save as PDF.

export function exportPDF(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): string | void {
  const isRu = lang === 'ru';
  const eurRate = settings.eurExchangeRate ?? 105;
  const sym = CURRENCY_SYMBOLS[settings.displayCurrency] ?? '';

  // ── Summary ──
  const active = subscriptions.filter((s) => s.isActive);
  const totalMonthly = active.reduce((sum, sub) => {
    const monthly = getMonthlyPrice(sub);
    return sum + convertCurrency(monthly, sub.currency, settings.displayCurrency, settings.exchangeRate, eurRate);
  }, 0);
  const totalMonthlyStr = totalMonthly.toLocaleString(isRu ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 });

  // ── Table rows ──
  const tableRows = subscriptions.map((sub) => {
    const converted = convertCurrency(sub.price, sub.currency, settings.displayCurrency, settings.exchangeRate, eurRate);
    const amountStr = `${converted.toLocaleString(isRu ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 })} ${sym}`;
    const statusLabel = sub.isActive ? (isRu ? '● Активна' : '● Active') : (isRu ? '○ Неактивна' : '○ Inactive');
    const statusColor = sub.isActive ? '#00C43C' : '#888';
    return `
      <tr>
        <td>${sub.icon} ${esc(sub.name)}</td>
        <td>${esc(getCategoryName(sub, categories))}</td>
        <td class="num">${amountStr}</td>
        <td>${formatCycleLabel(sub.cycle, isRu)}</td>
        <td>${formatDate(sub.nextPaymentDate, isRu)}</td>
        <td style="color:${statusColor};font-weight:600">${statusLabel}</td>
      </tr>`;
  }).join('');

  const genLabel  = isRu ? 'Сформирован' : 'Generated';
  const totalLabel = isRu ? 'Итого в месяц' : 'Monthly total';
  const activeLabel = isRu
    ? `${active.length} активных · ${subscriptions.length} всего`
    : `${active.length} active · ${subscriptions.length} total`;
  const footerText = isRu
    ? 'Экспорт из SubEasy — трекер подписок'
    : 'Exported from SubEasy — subscription tracker';

  const thName    = isRu ? 'Подписка'         : 'Subscription';
  const thCat     = isRu ? 'Категория'        : 'Category';
  const thAmount  = isRu ? 'Сумма'            : 'Amount';
  const thCycle   = isRu ? 'Цикл'             : 'Cycle';
  const thNext    = isRu ? 'Следующий платёж' : 'Next payment';
  const thStatus  = isRu ? 'Статус'           : 'Status';

  const html = `<!DOCTYPE html>
<html lang="${isRu ? 'ru' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SubEasy — ${isRu ? 'Отчёт по подпискам' : 'Subscription Report'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #fff;
    padding: 0;
  }
  .header {
    background: #0d0d18;
    color: #fff;
    padding: 18px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header .logo {
    font-size: 22px;
    font-weight: 800;
    color: #00e53a;
    letter-spacing: -0.5px;
  }
  .header .meta {
    font-size: 11px;
    color: #888;
    text-align: right;
  }
  .summary {
    background: #f5f5fa;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e0e0ec;
  }
  .summary .total-label { font-size: 12px; color: #666; margin-bottom: 2px; }
  .summary .total-value { font-size: 26px; font-weight: 800; color: #00b833; letter-spacing: -0.5px; }
  .summary .count { font-size: 12px; color: #888; text-align: right; }
  .table-wrap { padding: 16px 24px 24px; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead tr { background: #0d0d18; }
  thead th {
    color: #00e53a;
    font-weight: 700;
    font-size: 11px;
    text-align: left;
    padding: 9px 10px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  tbody tr:nth-child(even) { background: #f8f8fc; }
  tbody td {
    padding: 9px 10px;
    border-bottom: 1px solid #ebebf5;
    vertical-align: middle;
    color: #1a1a2e;
  }
  td.num { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .footer {
    text-align: center;
    font-size: 11px;
    color: #aaa;
    padding: 12px 24px 20px;
    border-top: 1px solid #ebebf5;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { background: #0d0d18 !important; }
    thead tr { background: #0d0d18 !important; }
    thead th { color: #00e53a !important; }
    @page { margin: 10mm; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">SubEasy</div>
    <div class="meta">${genLabel}: ${formatDate(new Date().toISOString(), isRu)}</div>
  </div>
  <div class="summary">
    <div>
      <div class="total-label">${totalLabel}:</div>
      <div class="total-value">${totalMonthlyStr} ${sym}</div>
    </div>
    <div class="count">${activeLabel}</div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>${thName}</th>
          <th>${thCat}</th>
          <th style="text-align:right">${thAmount}</th>
          <th>${thCycle}</th>
          <th>${thNext}</th>
          <th>${thStatus}</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>
  <div class="footer">${footerText}</div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  if (isTelegramWebApp() || isMobileBrowser()) {
    // Telegram WKWebView can't open blob: URLs; mobile browsers can't save blob: tabs —
    // return HTML string so the caller shows the in-app overlay with a Share button
    return html;
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ─── HTML escape ─────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
