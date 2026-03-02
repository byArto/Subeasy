/**
 * Pure server/client-compatible HTML report generator.
 * No browser globals — safe to import in Next.js API routes.
 */
import type { Subscription, Category, AppSettings } from './types';
import { convertCurrency, getMonthlyPrice } from './utils';
import { CURRENCY_SYMBOLS } from './constants';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCategoryName(sub: Subscription, categories: Category[]): string {
  return categories.find((c) => c.id === sub.category)?.name ?? sub.category;
}

function formatCycleLabel(cycle: string, isRu: boolean): string {
  const labels: Record<string, [string, string]> = {
    monthly:    ['Ежемесячно', 'Monthly'],
    yearly:     ['Ежегодно',   'Yearly'],
    weekly:     ['Еженедельно','Weekly'],
    quarterly:  ['Ежеквартально', 'Quarterly'],
    'one-time': ['Разовый',   'One-time'],
    trial:      ['Пробный',   'Trial'],
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

export function generateReportHtml(
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  lang: string,
): string {
  const isRu = lang === 'ru';
  const eurRate = settings.eurExchangeRate ?? 105;
  const sym = CURRENCY_SYMBOLS[settings.displayCurrency] ?? '';

  const active = subscriptions.filter((s) => s.isActive);
  const totalMonthly = active.reduce((sum, sub) => {
    const monthly = getMonthlyPrice(sub);
    return sum + convertCurrency(monthly, sub.currency, settings.displayCurrency, settings.exchangeRate, eurRate);
  }, 0);
  const totalMonthlyStr = totalMonthly.toLocaleString(isRu ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 });

  const tableRows = subscriptions.map((sub) => {
    const converted = convertCurrency(sub.price, sub.currency, settings.displayCurrency, settings.exchangeRate, eurRate);
    const amountStr = `${converted.toLocaleString(isRu ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 })} ${sym}`;
    const statusLabel = sub.isActive ? (isRu ? '● Активна' : '● Active') : (isRu ? '○ Неактивна' : '○ Inactive');
    const statusColor = sub.isActive ? '#00C43C' : '#888';
    return `
      <tr>
        <td>${esc(sub.icon)} ${esc(sub.name)}</td>
        <td>${esc(getCategoryName(sub, categories))}</td>
        <td class="num">${esc(amountStr)}</td>
        <td>${esc(formatCycleLabel(sub.cycle, isRu))}</td>
        <td>${esc(formatDate(sub.nextPaymentDate, isRu))}</td>
        <td style="color:${esc(statusColor)};font-weight:600">${esc(statusLabel)}</td>
      </tr>`;
  }).join('');

  const genLabel   = isRu ? 'Сформирован' : 'Generated';
  const totalLabel = isRu ? 'Итого в месяц' : 'Monthly total';
  const activeLabel = isRu
    ? `${active.length} активных · ${subscriptions.length} всего`
    : `${active.length} active · ${subscriptions.length} total`;
  const footerText = isRu
    ? 'Экспорт из SubEasy — трекер подписок'
    : 'Exported from SubEasy — subscription tracker';

  const thName   = isRu ? 'Подписка'         : 'Subscription';
  const thCat    = isRu ? 'Категория'        : 'Category';
  const thAmount = isRu ? 'Сумма'            : 'Amount';
  const thCycle  = isRu ? 'Цикл'             : 'Cycle';
  const thNext   = isRu ? 'Следующий платёж' : 'Next payment';
  const thStatus = isRu ? 'Статус'           : 'Status';

  return `<!DOCTYPE html>
<html lang="${isRu ? 'ru' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SubEasy — ${isRu ? 'Отчёт по подпискам' : 'Subscription Report'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; padding: 0; }
  .header { background: #0d0d18; color: #fff; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header .logo { font-size: 22px; font-weight: 800; color: #00e53a; letter-spacing: -0.5px; }
  .header .meta { font-size: 11px; color: #888; text-align: right; }
  .summary { background: #f5f5fa; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e0e0ec; }
  .summary .total-label { font-size: 12px; color: #666; margin-bottom: 2px; }
  .summary .total-value { font-size: 26px; font-weight: 800; color: #00b833; letter-spacing: -0.5px; }
  .summary .count { font-size: 12px; color: #888; text-align: right; }
  .table-wrap { padding: 16px 24px 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #0d0d18; }
  thead th { color: #00e53a; font-weight: 700; font-size: 11px; text-align: left; padding: 9px 10px; letter-spacing: 0.03em; text-transform: uppercase; }
  tbody tr:nth-child(even) { background: #f8f8fc; }
  tbody td { padding: 9px 10px; border-bottom: 1px solid #ebebf5; vertical-align: middle; color: #1a1a2e; }
  td.num { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .footer { text-align: center; font-size: 11px; color: #aaa; padding: 12px 24px 20px; border-top: 1px solid #ebebf5; }
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
    window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 400); });
  </script>
</body>
</html>`;
}
